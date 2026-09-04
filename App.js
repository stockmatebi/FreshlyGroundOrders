import React, { useEffect, useMemo, useState } from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { defaultMenu, normalizeMenu } from './src/data/menu';
import { defaultSettings, mergeSettings } from './src/data/settings';
import { NewOrderScreen } from './src/screens/NewOrderScreen';
import { OrdersScreen } from './src/screens/OrdersScreen';
import { SettingsScreen } from './src/screens/SettingsScreen';
import { AppErrorBoundary } from './src/components/AppErrorBoundary';
import { STORAGE_KEYS, loadJson, saveJson } from './src/utils/storage';
import { localDateKey } from './src/utils/reports';
import { theme } from './src/theme';

const LEGACY_KEYS = { menu: 'FGE_MENU_V1', orders: 'FGE_ORDERS_V1', printer: 'FGE_PRINTER_V1' };

export default function App() {
  return (
    <AppErrorBoundary>
      <SafeAreaProvider>
        <AppShell />
      </SafeAreaProvider>
    </AppErrorBoundary>
  );
}

function AppShell() {
  const [activeTab, setActiveTab] = useState('new');
  const [menu, setMenu] = useState(defaultMenu);
  const [orders, setOrders] = useState([]);
  const [settings, setSettings] = useState(defaultSettings);
  const [ready, setReady] = useState(false);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    try {
      let savedMenu = await loadJson(STORAGE_KEYS.menu, null);
      let savedOrders = await loadJson(STORAGE_KEYS.orders, null);
      let savedSettings = await loadJson(STORAGE_KEYS.settings, null);
      if (!savedMenu) savedMenu = await loadJson(LEGACY_KEYS.menu, null);
      if (!savedOrders) savedOrders = await loadJson(LEGACY_KEYS.orders, null);
      if (!savedSettings) savedSettings = defaultSettings;

      const normalizedMenu = normalizeMenu(savedMenu || defaultMenu);
      const normalizedOrders = (Array.isArray(savedOrders) ? savedOrders : []).map((order) => ({
        ...order,
        dayKey: order.dayKey || localDateKey(order.createdAt || Date.now()),
        items: (order.items || []).map((item) => ({
          ...item,
          unitPrice: Number(item.unitPrice ?? item.price ?? 0),
          selectedModifiers: item.selectedModifiers || [],
        })),
      }));
      const mergedSettings = mergeSettings(savedSettings || defaultSettings);
      setMenu(normalizedMenu);
      setOrders(normalizedOrders);
      setSettings(mergedSettings);
      await Promise.all([
        saveJson(STORAGE_KEYS.menu, normalizedMenu),
        saveJson(STORAGE_KEYS.orders, normalizedOrders),
        saveJson(STORAGE_KEYS.settings, mergedSettings),
      ]);
    } catch (error) {
      console.error('Startup load error', error);
      Alert.alert('Load error', 'Saved data could not be loaded. The app will continue with default settings.');
      setMenu(defaultMenu);
      setOrders([]);
      setSettings(defaultSettings);
    } finally {
      setReady(true);
    }
  }

  async function saveMenu(nextMenu) {
    const normalized = normalizeMenu(nextMenu);
    setMenu(normalized);
    await saveJson(STORAGE_KEYS.menu, normalized);
  }

  async function saveSettings(next) {
    const merged = mergeSettings(next);
    setSettings(merged);
    await saveJson(STORAGE_KEYS.settings, merged);
  }

  async function addOrder(order) {
    const next = [order, ...orders];
    setOrders(next);
    await saveJson(STORAGE_KEYS.orders, next);
  }

  function getNextOrderNumber(now = new Date()) {
    const key = localDateKey(now);
    const todayCount = orders.filter((o) => (o.dayKey || localDateKey(o.createdAt || now)) === key).length;
    return String(todayCount + 1).padStart(3, '0');
  }

  async function restoreBackup(payload) {
    const nextMenu = normalizeMenu(payload.menu || defaultMenu);
    const nextOrders = Array.isArray(payload.orders) ? payload.orders : [];
    const nextSettings = mergeSettings(payload.settings || defaultSettings);
    setMenu(nextMenu);
    setOrders(nextOrders);
    setSettings(nextSettings);
    await Promise.all([
      saveJson(STORAGE_KEYS.menu, nextMenu),
      saveJson(STORAGE_KEYS.orders, nextOrders),
      saveJson(STORAGE_KEYS.settings, nextSettings),
    ]);
    Alert.alert('Backup restored', 'Menu, settings and sales history have been restored.');
  }

  const content = useMemo(() => {
    if (!ready) return <View style={styles.loadingWrap}><Text style={styles.loading}>Loading Freshly Ground…</Text></View>;
    if (activeTab === 'sales') return <OrdersScreen orders={orders} settings={settings} />;
    if (activeTab === 'settings') return <SettingsScreen menu={menu} onSaveMenu={saveMenu} settings={settings} onSaveSettings={saveSettings} orders={orders} onRestoreBackup={restoreBackup} />;
    return <NewOrderScreen menu={menu} settings={settings} onOrderSaved={addOrder} getNextOrderNumber={getNextOrderNumber} />;
  }, [activeTab, menu, orders, settings, ready]);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <StatusBar style="light" backgroundColor={theme.colors.espresso} />
      <View style={styles.header}>
        <View style={styles.logoMark}>
          <View style={styles.cupTop} />
          <View style={styles.cupBody} />
          <View style={styles.cupHandle} />
        </View>
        <View style={styles.brandWrap}>
          <Text style={styles.brandTop}>FRESHLY GROUND</Text>
          <Text style={styles.brandBottom}>EXPRESS</Text>
        </View>
        <View style={styles.usbBadge}><Text style={styles.usbBadgeText}>{settings.printer ? 'USB READY' : 'USB SETUP'}</Text></View>
      </View>
      <View style={styles.body}>{content}</View>
      <View style={styles.tabs}>
        <TabButton icon="＋" active={activeTab === 'new'} label="New Order" onPress={() => setActiveTab('new')} />
        <TabButton icon="▤" active={activeTab === 'sales'} label="Sales" onPress={() => setActiveTab('sales')} />
        <TabButton icon="⚙" active={activeTab === 'settings'} label="Settings" onPress={() => setActiveTab('settings')} />
      </View>
    </SafeAreaView>
  );
}

function TabButton({ active, icon, label, onPress }) {
  return (
    <TouchableOpacity onPress={onPress} style={[styles.tabButton, active && styles.tabButtonActive]}>
      <Text style={[styles.tabIcon, active && styles.tabTextActive]}>{icon}</Text>
      <Text style={[styles.tabLabel, active && styles.tabTextActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

const c = theme.colors;
const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: c.espresso },
  header: { backgroundColor: c.espresso, paddingHorizontal: 14, paddingTop: 12, paddingBottom: 18, flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 82 },
  logoMark: { width: 46, height: 46, borderRadius: 23, backgroundColor: c.green, alignItems: 'center', justifyContent: 'center', position: 'relative' },
  cupTop: { width: 22, height: 3, borderRadius: 2, backgroundColor: '#fff', position: 'absolute', top: 15, left: 10 },
  cupBody: { width: 22, height: 14, borderBottomLeftRadius: 7, borderBottomRightRadius: 7, backgroundColor: '#fff', position: 'absolute', top: 18, left: 10 },
  cupHandle: { width: 8, height: 9, borderWidth: 3, borderColor: '#fff', borderLeftWidth: 0, borderRadius: 5, position: 'absolute', top: 20, right: 5 },
  brandWrap: { flex: 1, minHeight: 48, justifyContent: 'center' },
  brandTop: { color: '#fff', fontSize: 17, fontWeight: '900', letterSpacing: 0.5, lineHeight: 22 },
  brandBottom: { color: '#D75A50', fontSize: 12, fontWeight: '900', letterSpacing: 3, lineHeight: 18 },
  usbBadge: { backgroundColor: c.green, paddingHorizontal: 8, paddingVertical: 5, borderRadius: 999, flexShrink: 0 },
  usbBadgeText: { color: '#fff', fontSize: 9, fontWeight: '900' },
  body: { flex: 1, backgroundColor: c.bg },
  loadingWrap: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loading: { color: c.ink, fontWeight: '800' },
  tabs: { flexDirection: 'row', backgroundColor: c.espresso, paddingHorizontal: 8, paddingTop: 7, paddingBottom: 5, gap: 7 },
  tabButton: { flex: 1, alignItems: 'center', paddingVertical: 6, borderRadius: 11 },
  tabButtonActive: { backgroundColor: c.green },
  tabIcon: { color: '#CFC4B9', fontSize: 19, fontWeight: '900' },
  tabLabel: { color: '#CFC4B9', fontSize: 11, fontWeight: '800', marginTop: 1 },
  tabTextActive: { color: '#fff' },
});
