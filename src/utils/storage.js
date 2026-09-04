import AsyncStorage from '@react-native-async-storage/async-storage';

export const STORAGE_KEYS = {
  menu: 'FGE_MENU_V2',
  orders: 'FGE_ORDERS_V2',
  settings: 'FGE_SETTINGS_V2',
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

export async function exportBackupPayload(menu, orders, settings) {
  return JSON.stringify({
    version: 2,
    exportedAt: new Date().toISOString(),
    menu,
    orders,
    settings,
  }, null, 2);
}
