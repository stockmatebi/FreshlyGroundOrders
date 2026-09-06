import AsyncStorage from '@react-native-async-storage/async-storage';

export const STORAGE_KEYS = {
  menu: 'FGE_MENU_V3',
  orders: 'FGE_ORDERS_V2',
  settings: 'FGE_SETTINGS_V2',
  loyalty: 'FGE_LOYALTY_V1',
  customers: 'FGE_CUSTOMERS_V1',
  backup: 'FGE_AUTO_BACKUP_V2',
};

export async function loadJson(key, fallback) {
  const raw = await AsyncStorage.getItem(key);
  if (!raw) return fallback;
  try {
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

export async function saveJson(key, value) {
  await AsyncStorage.setItem(key, JSON.stringify(value));
}

export function normalizePhone(value = '') {
  return String(value).replace(/[^0-9+]/g, '').trim();
}

export function migrateLoyaltyToCustomers(loyalty = {}) {
  const now = new Date().toISOString();
  return Object.entries(loyalty || {}).map(([phone, record], index) => ({
    id: `customer-migrated-${index}-${String(phone).replace(/\D/g, '')}`,
    firstName: String(record?.name || '').trim(),
    surname: '',
    name: String(record?.name || '').trim(),
    phone: normalizePhone(phone),
    coffee: Number(record?.coffee || 0),
    meal: Number(record?.meal || 0),
    totalVisits: 0,
    lastVisitAt: null,
    notes: '',
    active: true,
    createdAt: now,
    updatedAt: now,
  }));
}

export async function exportBackupPayload(menu, orders, settings, customersArg) {
  const customers = Array.isArray(customersArg)
    ? customersArg
    : await loadJson(STORAGE_KEYS.customers, []);
  return JSON.stringify({
    version: 5,
    exportedAt: new Date().toISOString(),
    menu,
    orders,
    settings,
    customers,
  }, null, 2);
}

export async function saveAutomaticBackup(menu, orders, settings, customers = []) {
  const today = new Date().toISOString().slice(0, 10);
  const current = await loadJson(STORAGE_KEYS.backup, []);
  if (current[0]?.date === today) return;
  const next = [{
    date: today,
    createdAt: new Date().toISOString(),
    menu,
    orders,
    settings,
    customers,
  }, ...current].slice(0, 14);
  await saveJson(STORAGE_KEYS.backup, next);
}
