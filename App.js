import React, { useEffect, useMemo, useState } from 'react';
import { Alert, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { StatusBar } from 'expo-status-bar';
import { defaultMenu } from './src/data/menu';
import { NewOrderScreen } from './src/screens/NewOrderScreen';
import { OrdersScreen } from './src/screens/OrdersScreen';
import { SettingsScreen } from './src/screens/SettingsScreen';

const STORAGE_KEYS = {
  menu: 'FGE_MENU_V1',
  orders: 'FGE_ORDERS_V1',
  printer: 'FGE_PRINTER_V1',
};

export default function App() {
  const [activeTab, setActiveTab] = useState('new');
  const [menu, setMenu] = useState(defaultMenu);
  const [orders, setOrders] = useState([]);
  const [printer, setPrinter] = useState(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const [savedMenu, savedOrders, savedPrinter] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEYS.menu),
        AsyncStorage.getItem(STORAGE_KEYS.orders),
        AsyncStorage.getItem(STORAGE_KEYS.printer),
      ]);
      if (savedMenu) setMenu(JSON.parse(savedMenu));
      if (savedOrders) setOrders(JSON.parse(savedOrders));
      if (savedPrinter) setPrinter(JSON.parse(savedPrinter));
    } catch (error) {
      Alert.alert('Load error', 'The app could not load saved data.');
    } finally {
      setReady(true);
    }
  }

  async function saveMenu(nextMenu) {
    setMenu(nextMenu);
    await AsyncStorage.setItem(STORAGE_KEYS.menu, JSON.stringify(nextMenu));
  }

  async function savePrinter(nextPrinter) {
    setPrinter(nextPrinter);
    await AsyncStorage.setItem(STORAGE_KEYS.printer, JSON.stringify(nextPrinter));
  }

  async function addOrder(order) {
    const nextOrders = [order, ...orders].slice(0, 500);
    setOrders(nextOrders);
    await AsyncStorage.setItem(STORAGE_KEYS.orders, JSON.stringify(nextOrders));
  }

  async function updateOrderStatus(orderId, status) {
    const nextOrders = orders.map((order) =>
      order.id === orderId ? { ...order, status } : order
    );
    setOrders(nextOrders);
    await AsyncStorage.setItem(STORAGE_KEYS.orders, JSON.stringify(nextOrders));
  }

  const content = useMemo(() => {
    if (!ready) {
      return <Text style={styles.loading}>Loading Freshly Ground Orders...</Text>;
    }
    if (activeTab === 'orders') {
      return <OrdersScreen orders={orders} printer={printer} onStatusChange={updateOrderStatus} />;
    }
    if (activeTab === 'settings') {
      return <SettingsScreen menu={menu} onSaveMenu={saveMenu} printer={printer} onSavePrinter={savePrinter} />;
    }
    return <NewOrderScreen menu={menu} printer={printer} onOrderSaved={addOrder} />;
  }, [activeTab, menu, orders, printer, ready]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="light" />
      <View style={styles.header}>
        <Text style={styles.brand}>Freshly Ground Express</Text>
        <Text style={styles.subtitle}>Order Taking & Thermal Slips</Text>
      </View>
      <View style={styles.body}>{content}</View>
      <View style={styles.tabs}>
        <TabButton active={activeTab === 'new'} label="New Order" onPress={() => setActiveTab('new')} />
        <TabButton active={activeTab === 'orders'} label="Orders" onPress={() => setActiveTab('orders')} />
        <TabButton active={activeTab === 'settings'} label="Settings" onPress={() => setActiveTab('settings')} />
      </View>
    </SafeAreaView>
  );
}

function TabButton({ active, label, onPress }) {
  return (
    <Text onPress={onPress} style={[styles.tabButton, active && styles.tabButtonActive]}>
      {label}
    </Text>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#111' },
  header: { backgroundColor: '#111', paddingHorizontal: 16, paddingTop: 14, paddingBottom: 12 },
  brand: { color: '#fff', fontSize: 22, fontWeight: '800' },
  subtitle: { color: '#e53b32', fontSize: 12, marginTop: 2, fontWeight: '700' },
  body: { flex: 1, backgroundColor: '#f5f2ea' },
  loading: { padding: 20, fontSize: 16 },
  tabs: { flexDirection: 'row', backgroundColor: '#111', padding: 10, gap: 8 },
  tabButton: { flex: 1, color: '#fff', textAlign: 'center', paddingVertical: 10, borderRadius: 10, backgroundColor: '#333', fontWeight: '700' },
  tabButtonActive: { backgroundColor: '#e53b32' },
});
