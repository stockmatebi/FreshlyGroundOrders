import AsyncStorage from '@react-native-async-storage/async-storage';

export const STORAGE_KEYS = {
  menu: 'FGE_MENU_V5',
  orders: 'FGE_ORDERS_V2',
  settings: 'FGE_SETTINGS_V2',
  loyalty: 'FGE_LOYALTY_V1',
  customers: 'FGE_CUSTOMERS_V1',
  backup: 'FGE_AUTO_BACKUP_V2',
};

export async function loadJson(key, fallback) {
  const raw = await AsyncStorage.getItem(key);
  if (!raw) return fallback;
  try { return JSON.parse(raw); } catch { return fallback; }
}

export async function saveJson(key, value) {
  const serialized = JSON.stringify(value);
  try {
    await AsyncStorage.setItem(key, serialized);
  } catch (error) {
    const message = String(error?.message || error || '');
    const isFull = /SQLITE_FULL|database or disk is full|code 13/i.test(message);
    if (!isFull || key === STORAGE_KEYS.backup) throw error;

    // Backups are disposable copies; preserve the live order/customer data.
    // Remove only the backup snapshots, then retry the original write once.
    try {
      await AsyncStorage.removeItem(STORAGE_KEYS.backup);
    } catch {
      // If cleanup fails, report the original write error below.
    }
    try {
      await AsyncStorage.setItem(key, serialized);
    } catch (retryError) {
      const retryMessage = String(retryError?.message || retryError || '');
      throw new Error(
        /SQLITE_FULL|database or disk is full|code 13/i.test(retryMessage)
          ? 'The app database is full. Automatic backup copies were cleared, but the data write still failed. Export a backup and contact support before clearing app data.'
          : retryMessage
      );
    }
  }
}

export function normalizePhone(value = '') { return String(value).replace(/[^0-9+]/g, '').trim(); }

export function migrateLoyaltyToCustomers(loyalty = {}) {
  const now = new Date().toISOString();
  return Object.entries(loyalty || {}).map(([phone, record], index) => ({
    id: `customer-migrated-${index}-${String(phone).replace(/\D/g, '')}`,
    firstName: String(record?.name || '').trim(), surname: '', name: String(record?.name || '').trim(),
    phone: normalizePhone(phone), coffee: Number(record?.coffee || 0), meal: Number(record?.meal || 0),
    totalVisits: 0, lastVisitAt: null, notes: '', active: true, createdAt: now, updatedAt: now,
  }));
}

export async function exportBackupPayload(menu, orders, settings, customersArg) {
  const customers = Array.isArray(customersArg) ? customersArg : await loadJson(STORAGE_KEYS.customers, []);
  return JSON.stringify({ version: 5, exportedAt: new Date().toISOString(), menu, orders, settings, customers }, null, 2);
}

export async function saveAutomaticBackup(menu, orders, settings, customers = []) {
  const today = new Date().toISOString().slice(0, 10);
  const current = await loadJson(STORAGE_KEYS.backup, []);
  const snapshot = { date: today, createdAt: new Date().toISOString(), menu, orders, settings, customers };
  // If an earlier app version made a daytime snapshot today, replace it with
  // the evening snapshot rather than skipping the scheduled backup.
  const remaining = current[0]?.date === today ? current.slice(1) : current;
  const next = [snapshot, ...remaining].slice(0, 3);
  await saveJson(STORAGE_KEYS.backup, next);
}
