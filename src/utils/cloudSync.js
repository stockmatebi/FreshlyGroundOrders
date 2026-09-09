const SYNC_URL = 'https://iymwzyxlvtyidebxdzyw.supabase.co/functions/v1/sync-sale';
const POS_SYNC_KEY = process.env.EXPO_PUBLIC_POS_SYNC_KEY || '';

export async function syncOrderToCloud(order) {
  if (!order?.id || !POS_SYNC_KEY) return false;
  try {
    const response = await fetch(SYNC_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-pos-key': POS_SYNC_KEY },
      body: JSON.stringify(order),
    });
    return response.ok;
  } catch {
    return false;
  }
}

export async function syncOrdersToCloud(orders = []) {
  let synced = 0;
  for (const order of Array.isArray(orders) ? orders : []) {
    if (await syncOrderToCloud(order)) synced += 1;
  }
  return { synced, total: Array.isArray(orders) ? orders.length : 0 };
}
