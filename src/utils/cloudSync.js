import AsyncStorage from '@react-native-async-storage/async-storage';

const SYNC_URL = 'https://iymwzyxlvtyidebxdzyw.supabase.co/functions/v1/sync-sale';
const POS_SYNC_KEY = process.env.EXPO_PUBLIC_POS_SYNC_KEY || '';
const SYNCED_ORDERS_KEY = 'FGE_CLOUD_SYNCED_ORDER_IDS_V1';
const BASELINE_KEY = 'FGE_CLOUD_SYNC_BASELINE_V1';

const inFlight = new Set();
let syncedIdsCache = null;
let syncedIdsLoadPromise = null;
let persistQueue = Promise.resolve();
let batchSyncPromise = null;

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
  // not re-upload the entire historical backlog and recreate the quota spike.
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

    if (!response.ok) return false;

    await markSynced(orderId);
    return true;
  } catch {
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
    return { synced: 0, pending: 0, total: list.length, baseline: true };
  }

  const syncedIds = await loadSyncedIds();
  const pending = list.filter(
    (order) => order?.id && !syncedIds.has(String(order.id))
  );

  let synced = 0;
  for (const order of pending) {
    if (await syncOrderToCloud(order)) synced += 1;
  }

  return { synced, pending: pending.length, total: list.length, baseline: false };
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
