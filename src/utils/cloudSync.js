import AsyncStorage from '@react-native-async-storage/async-storage';

const SYNC_URL = 'https://iymwzyxlvtyidebxdzyw.supabase.co/functions/v1/sync-sale';
const POS_SYNC_KEY = process.env.EXPO_PUBLIC_POS_SYNC_KEY || '';
const SYNCED_ORDERS_KEY = 'FGE_CLOUD_SYNCED_ORDER_IDS_V1';

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

  // Serialize writes so concurrent successful requests cannot overwrite
  // each other's synced IDs with stale AsyncStorage snapshots.
  persistQueue = persistQueue
    .catch(() => {})
    .then(() => AsyncStorage.setItem(SYNCED_ORDERS_KEY, JSON.stringify([...synced])));

  await persistQueue;
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
  const syncedIds = await loadSyncedIds();
  const pending = list.filter(
    (order) => order?.id && !syncedIds.has(String(order.id))
  );

  let synced = 0;
  for (const order of pending) {
    if (await syncOrderToCloud(order)) synced += 1;
  }

  return { synced, pending: pending.length, total: list.length };
}

export async function syncOrdersToCloud(orders = []) {
  // Only one complete backlog sync may run at a time. The previous code
  // started another full pass every 60 seconds even if the prior pass
  // was still running, which caused duplicate Edge Function invocations.
  if (batchSyncPromise) return batchSyncPromise;

  batchSyncPromise = runBatchSync(orders);
  try {
    return await batchSyncPromise;
  } finally {
    batchSyncPromise = null;
  }
}
