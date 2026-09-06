import React, { useEffect, useMemo, useState } from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { defaultMenu, normalizeMenu } from './src/data/menu';
import { defaultSettings, mergeSettings } from './src/data/settings';
import { NewOrderScreen } from './src/screens/NewOrderScreen';
import { OrdersScreen } from './src/screens/OrdersScreen';
import { SettingsScreen } from './src/screens/SettingsScreen';
import { DashboardScreen } from './src/screens/DashboardScreen';
import { CustomersScreen } from './src/screens/CustomersScreen';
import { AppErrorBoundary } from './src/components/AppErrorBoundary';
import { STORAGE_KEYS, loadJson, saveJson, saveAutomaticBackup, migrateLoyaltyToCustomers } from './src/utils/storage';
import { localDateKey } from './src/utils/reports';
import { theme } from './src/theme';

export default function App() {
  return <AppErrorBoundary><SafeAreaProvider><AppShell /></SafeAreaProvider></AppErrorBoundary>;
}

function AppShell() {
  const [tab, setTab] = useState('new');
  const [menu, setMenu] = useState(defaultMenu);
  const [orders, setOrders] = useState([]);
  const [settings, setSettings] = useState(defaultSettings);
  const [customers, setCustomers] = useState([]);
  const [ready, setReady] = useState(false);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    try {
      const nextMenu = normalizeMenu(await loadJson(STORAGE_KEYS.menu, defaultMenu));
      const nextOrders = await loadJson(STORAGE_KEYS.orders, []);
      const nextSettings = mergeSettings(await loadJson(STORAGE_KEYS.settings, defaultSettings));
      let nextCustomers = await loadJson(STORAGE_KEYS.customers, null);

      if (!Array.isArray(nextCustomers)) {
        const oldLoyalty = await loadJson(STORAGE_KEYS.loyalty, {});
        nextCustomers = migrateLoyaltyToCustomers(oldLoyalty);
        await saveJson(STORAGE_KEYS.customers, nextCustomers);
      }

      setMenu(nextMenu);
      setOrders(Array.isArray(nextOrders) ? nextOrders : []);
      setSettings(nextSettings);
      setCustomers(nextCustomers);
      await saveAutomaticBackup(nextMenu, Array.isArray(nextOrders) ? nextOrders : [], nextSettings, nextCustomers);
    } catch (error) {
      console.error('Startup load error', error);
      Alert.alert('Load error', 'Saved data could not be loaded.');
    } finally {
      setReady(true);
    }
  }

  async function saveMenu(value) {
    const next = normalizeMenu(value);
    setMenu(next);
    await saveJson(STORAGE_KEYS.menu, next);
  }

  async function saveSettings(value) {
    const next = mergeSettings(value);
    setSettings(next);
    await saveJson(STORAGE_KEYS.settings, next);
  }

  async function saveCustomers(value) {
    const next = Array.isArray(value) ? value : [];
    setCustomers(next);
    await saveJson(STORAGE_KEYS.customers, next);
  }

  async function addOrder(order) {
    const nextOrders = [order, ...orders];
    setOrders(nextOrders);
    await saveJson(STORAGE_KEYS.orders, nextOrders);

    if (order.customerId) {
      const now = new Date().toISOString();
      const nextCustomers = customers.map((customer) => {
        if (customer.id !== order.customerId) return customer;
        const programKey = order.loyaltyProgram === 'Coffee' ? 'coffee' : order.loyaltyProgram === 'Meal' ? 'meal' : null;
        return {
          ...customer,
          ...(programKey ? { [programKey]: Number(customer[programKey] || 0) + 1 } : {}),
          totalVisits: Number(customer.totalVisits || 0) + 1,
          lastVisitAt: now,
          updatedAt: now,
        };
      });
      setCustomers(nextCustomers);
      await saveJson(STORAGE_KEYS.customers, nextCustomers);
    }
  }

  function getNextOrderNumber(now = new Date()) {
    const key = localDateKey(now);
    const count = orders.filter((order) => (order.dayKey || localDateKey(order.createdAt || now)) === key).length;
    return String(count + 1).padStart(3, '0');
  }

  async function restoreBackup(payload) {
    const nextMenu = normalizeMenu(payload.menu || defaultMenu);
    const nextOrders = Array.isArray(payload.orders) ? payload.orders : [];
    const nextSettings = mergeSettings(payload.settings || defaultSettings);
    const nextCustomers = Array.isArray(payload.customers)
      ? payload.customers
      : migrateLoyaltyToCustomers(payload.loyalty || {});

    setMenu(nextMenu);
    setOrders(nextOrders);
    setSettings(nextSettings);
    setCustomers(nextCustomers);
    await Promise.all([
      saveJson(STORAGE_KEYS.menu, nextMenu),
      saveJson(STORAGE_KEYS.orders, nextOrders),
      saveJson(STORAGE_KEYS.settings, nextSettings),
      saveJson(STORAGE_KEYS.customers, nextCustomers),
    ]);
    Alert.alert('Backup restored', 'Menu, settings, sales history and customer loyalty data have been restored.');
  }

  const content = useMemo(() => {
    if (!ready) return <View style={styles.loading}><Text>Loading...</Text></View>;
    if (tab === 'dashboard') return <DashboardScreen orders={orders} />;
    if (tab === 'customers') return <CustomersScreen customers={customers} onSaveCustomers={saveCustomers} />;
    if (tab === 'sales') return <OrdersScreen orders={orders} settings={settings} />;
    if (tab === 'settings') return <SettingsScreen menu={menu} onSaveMenu={saveMenu} settings={settings} onSaveSettings={saveSettings} orders={orders} customers={customers} onRestoreBackup={restoreBackup} />;
    return <NewOrderScreen menu={menu} onSaveMenu={saveMenu} settings={settings} onSaveSettings={saveSettings} customers={customers} onOrderSaved={addOrder} getNextOrderNumber={getNextOrderNumber} />;
  }, [tab, menu, orders, settings, customers, ready]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="light" backgroundColor={theme.colors.espresso} />
      <View style={styles.header}>
        <View style={styles.logo}><Text style={styles.logoText}>FG</Text></View>
        <View style={{ flex: 1 }}><Text style={styles.brand}>FRESHLY GROUND</Text><Text style={styles.express}>EXPRESS</Text></View>
        <Text style={styles.usb}>{settings.printer ? 'USB READY' : 'USB SETUP'}</Text>
      </View>
      <View style={styles.body}>{content}</View>
      <View style={styles.tabs}>
        <Tab active={tab === 'new'} label="New Order" onPress={() => setTab('new')} />
        <Tab active={tab === 'dashboard'} label="Dashboard" onPress={() => setTab('dashboard')} />
        <Tab active={tab === 'customers'} label="Customers" onPress={() => setTab('customers')} />
        <Tab active={tab === 'sales'} label="Sales" onPress={() => setTab('sales')} />
        <Tab active={tab === 'settings'} label="Settings" onPress={() => setTab('settings')} />
      </View>
    </SafeAreaView>
  );
}

function Tab({ active, label, onPress }) {
  return <TouchableOpacity onPress={onPress} style={[styles.tab, active && styles.tabActive]}><Text style={styles.tabText}>{label}</Text></TouchableOpacity>;
}

const c = theme.colors;
const styles = StyleSheet.create({
  safeArea:{flex:1,backgroundColor:c.espresso},header:{minHeight:72,padding:12,flexDirection:'row',alignItems:'center',gap:10,backgroundColor:c.espresso},logo:{width:44,height:44,borderRadius:22,backgroundColor:c.green,alignItems:'center',justifyContent:'center'},logoText:{color:'#fff',fontWeight:'900'},brand:{color:'#fff',fontWeight:'900',fontSize:17},express:{color:'#D75A50',fontWeight:'900',letterSpacing:3},usb:{color:'#fff',backgroundColor:c.green,padding:7,borderRadius:20,fontSize:9,fontWeight:'900'},body:{flex:1,backgroundColor:c.bg},tabs:{flexDirection:'row',gap:5,padding:7,backgroundColor:c.espresso},tab:{flex:1,paddingVertical:9,paddingHorizontal:4,borderRadius:10,alignItems:'center'},tabActive:{backgroundColor:c.green},tabText:{color:'#fff',fontWeight:'900',fontSize:11},loading:{flex:1,alignItems:'center',justifyContent:'center'},
});
