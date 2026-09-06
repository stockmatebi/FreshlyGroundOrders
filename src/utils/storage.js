import AsyncStorage from '@react-native-async-storage/async-storage';
export const STORAGE_KEYS={menu:'FGE_MENU_V3',orders:'FGE_ORDERS_V2',settings:'FGE_SETTINGS_V2',loyalty:'FGE_LOYALTY_V1',backup:'FGE_AUTO_BACKUP_V1'};
export async function loadJson(key,fallback){const raw=await AsyncStorage.getItem(key);if(!raw)return fallback;try{return JSON.parse(raw)}catch{return fallback}}
export async function saveJson(key,value){await AsyncStorage.setItem(key,JSON.stringify(value));}
export async function exportBackupPayload(menu,orders,settings,loyalty={}){return JSON.stringify({version:4,exportedAt:new Date().toISOString(),menu,orders,settings,loyalty},null,2)}
export async function saveAutomaticBackup(menu,orders,settings,loyalty={}){const today=new Date().toISOString().slice(0,10);const current=await loadJson(STORAGE_KEYS.backup,[]);if(current[0]?.date===today)return;const next=[{date:today,createdAt:new Date().toISOString(),menu,orders,settings,loyalty},...current].slice(0,14);await saveJson(STORAGE_KEYS.backup,next);}
