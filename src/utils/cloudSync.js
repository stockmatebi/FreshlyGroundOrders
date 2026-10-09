import AsyncStorage from '@react-native-async-storage/async-storage';

const SYNC_URL = 'https://iymwzyxlvtyidebxdzyw.supabase.co/functions/v1/sync-sale';
const POS_SYNC_KEY = process.env.EXPO_PUBLIC_POS_SYNC_KEY || '';
const SYNCED_ORDERS_KEY = 'FGE_CLOUD_SYNCED_ORDER_IDS_V1';
const BASELINE_KEY = 'FGE_CLOUD_SYNC_BASELINE_V1';
const SYNC_PAUSE_KEY = 'FGE_CLOUD_SYNC_PAUSE_UNTIL_V1';

// A failed cloud request must not cause every unsynced sale to be resent every
// minute. In particular, Supabase may return HTTP 402 when the project quota
// is exhausted. Keep orders locally and retry only after a persisted cooldown.
const MAX_ORDERS_PER_BATCH = 10;
const PAUSE_402_MS = 60 * 60 * 1000; // Retry quota errors no more than hourly.
const PAUSE_429_MS = 30 * 60 * 1000;
const PAUSE_AUTH_MS = 6 * 60 * 60 * 1000;
const PAUSE_CLIENT_ERROR_MS = 30 * 60 * 1000;
const PAUSE_SERVER_ERROR_MS = 5 * 60 * 1000;
const PAUSE_NETWORK_ERROR_MS = 2 * 60 * 1000;

const inFlight = new Set();
let syncedIdsCache = null;
let syncedIdsLoadPromise = null;
let persistQueue = Promise.resolve();
let batchSyncPromise = null;
let syncPausedUntil = 0;
let syncPauseReason = '';
let pauseLoadPromise = null;

async function loadSyncedIds() {
  if (syncedIdsCache) return syncedIdsCache;
  if (syncedIdsLoadPromise) return syncedIdsLoadPromise;

  syncedIdsLoadPromise = (async () => {
    try {
      const raw = await AsyncStorage.getItem(SYNCED_ORDERS_KEY);
      const ids = raw ? JSON.parse(raw) : [];
      syncedIdsCache = new Set(Array.isArray(ids) ? ids.map(String) : []);
    } catch {
      syncedIdsCache = new Set();
    } finally {
      syncedIdsLoadPromise = null;
    }
    return syncedIdsCache;
  })();

  return syncedIdsLoadPromise;
}

async function getSyncPauseState() {
  if (syncPausedUntil > Date.now()) {
    return { paused: true, until: syncPausedUntil, reason: syncPauseReason };
  }

  if (pauseLoadPromise) return pauseLoadPromise;

  pauseLoadPromise = (async () => {
    try {
      const raw = await AsyncStorage.getItem(SYNC_PAUSE_KEY);
      if (raw) {
        const saved = JSON.parse(raw);
        const until = Number(saved?.until || 0);
        if (until > Date.now()) {
          syncPausedUntil = until;
          syncPauseReason = String(saved?.reason || 'temporary_failure');
          return { paused: true, until, reason: syncPauseReason };
        }
        await AsyncStorage.removeItem(SYNC_PAUSE_KEY);
      }
    } catch {
      // A storage read error should not permanently block local order creation.
    } finally {
      pauseLoadPromise = null;
    }

    syncPausedUntil = 0;
    syncPauseReason = '';
    return { paused: false, until: 0, reason: '' };
  })();

  return pauseLoadPromise;
}

async function pauseCloudSync(durationMs, reason) {
  // Set in-memory state before awaiting storage so the current batch stops too.
  syncPausedUntil = Date.now() + durationMs;
  syncPauseReason = reason;
  try {
    await AsyncStorage.setItem(
      SYNC_PAUSE_KEY,
      JSON.stringify({ until: syncPausedUntil, reason })
    );
  } catch {
    // The in-memory pause still prevents a retry storm during this app session.
  }
}

async function markSynced(orderId) {
  const synced = await loadSyncedIds();
  synced.add(String(orderId));

  persistQueue = persistQueue
    .catch(() => {})
    .then(() => AsyncStorage.setItem(SYNCED_ORDERS_KEY, JSON.stringify([...synced])));

  await persistQueue;
}

async function initializeExistingOrdersAsSynced(orders) {
  const baseline = await AsyncStorage.getItem(BASELINE_KEY);
  if (baseline === 'done') return false;

  const synced = await loadSyncedIds();
  const list = Array.isArray(orders) ? orders : [];

  // Existing sales are already present in the Supabase reporting database.
  // Mark the history already on the tablet as synced so an app upgrade does
  // not re-upload the entire historical backlog and recreate a quota spike.
  for (const order of list) {
    if (order?.id) synced.add(String(order.id));
  }

  persistQueue = persistQueue
    .catch(() => {})
    .then(async () => {
      await AsyncStorage.setItem(SYNCED_ORDERS_KEY, JSON.stringify([...synced]));
      await AsyncStorage.setItem(BASELINE_KEY, 'done');
    });

  await persistQueue;
  return true;
}

export async function syncOrderToCloud(order) {
  if (!order?.id || !POS_SYNC_KEY) return false;

  const pause = await getSyncPauseState();
  if (pause.paused) return false;

  const orderId = String(order.id);
  const synced = await loadSyncedIds();

  if (synced.has(orderId)) return true;
  if (inFlight.has(orderId)) return false;

  inFlight.add(orderId);
  try {
    const response = await fetch(SYNC_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-pos-key': POS_SYNC_KEY,
      },
      body: JSON.stringify(order),
    });

    if (!response.ok) {
      // Pause all order sync after the first failed request instead of retrying
      // every pending order on every 60-second interval.
      if (response.status === 402) {
        await pauseCloudSync(PAUSE_402_MS, 'supabase_quota_exceeded');
      } else if (response.status === 429) {
        await pauseCloudSync(PAUSE_429_MS, 'rate_limited');
      } else if (response.status === 401 || response.status === 403) {
        await pauseCloudSync(PAUSE_AUTH_MS, 'authentication_failed');
      } else if (response.status >= 500) {
        await pauseCloudSync(PAUSE_SERVER_ERROR_MS, 'server_error');
      } else {
        await pauseCloudSync(PAUSE_CLIENT_ERROR_MS, 'request_rejected');
      }
      return false;
    }

    await markSynced(orderId);
    return true;
  } catch {
    await pauseCloudSync(PAUSE_NETWORK_ERROR_MS, 'network_error');
    return false;
  } finally {
    inFlight.delete(orderId);
  }
}

async function runBatchSync(orders = []) {
  const list = Array.isArray(orders) ? orders : [];

  // First launch after this sync change: establish a baseline instead of
  // sending the entire historical sales archive again.
  const didBaseline = await initializeExistingOrdersAsSynced(list);
  if (didBaseline) {
    return { synced: 0, pending: 0, total: list.length, baseline: true, paused: false };
  }

  const syncedIds = await loadSyncedIds();
  const pending = list.filter(
    (order) => order?.id && !syncedIds.has(String(order.id))
  );

  const pause = await getSyncPauseState();
  if (pause.paused) {
    return {
      synced: 0,
      pending: pending.length,
      total: list.length,
      baseline: false,
      paused: true,
      retryAfter: new Date(pause.until).toISOString(),
      reason: pause.reason,
    };
  }

  let synced = 0;
  const batch = pending.slice(0, MAX_ORDERS_PER_BATCH);
  for (const order of batch) {
    if (await syncOrderToCloud(order)) {
      synced += 1;
    } else {
      // If a request opened the circuit breaker, do not send more orders.
      const currentPause = await getSyncPauseState();
      if (currentPause.paused) break;
    }
  }

  const currentPause = await getSyncPauseState();
  return {
    synced,
    pending: pending.length,
    total: list.length,
    baseline: false,
    paused: currentPause.paused,
    deferred: Math.max(0, pending.length - batch.length),
    retryAfter: currentPause.paused ? new Date(currentPause.until).toISOString() : null,
    reason: currentPause.paused ? currentPause.reason : null,
  };
}

export async function syncOrdersToCloud(orders = []) {
  if (batchSyncPromise) return batchSyncPromise;

  batchSyncPromise = runBatchSync(orders);
  try {
    return await batchSyncPromise;
  } finally {
    batchSyncPromise = null;
  }
}
