import React from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { formatMoney, printOrderSlip } from '../utils/receiptPrinter';

export function OrdersScreen({ orders, printer, onStatusChange }) {
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Order History</Text>
      {orders.length === 0 ? <Text style={styles.empty}>No orders saved yet.</Text> : null}
      {orders.map((order) => (
        <View key={order.id} style={styles.card}>
          <View style={styles.row}>
            <Text style={styles.orderNo}>Order #{order.number}</Text>
            <Text style={styles.status}>{order.status}</Text>
          </View>
          <Text style={styles.meta}>{order.createdAtText} • {order.orderType}</Text>
          {order.customerName ? <Text style={styles.meta}>Customer: {order.customerName}</Text> : null}
          {order.tableNumber ? <Text style={styles.meta}>Table: {order.tableNumber}</Text> : null}
          <View style={styles.itemsBox}>
            {order.items.map((item, index) => (
              <Text key={`${item.id}-${index}`} style={styles.itemText}>{item.qty} x {item.name}{item.note ? ` — ${item.note}` : ''}</Text>
            ))}
          </View>
          <Text style={styles.total}>{formatMoney(order.total)}</Text>
          <View style={styles.actions}>
            <TouchableOpacity style={styles.actionButton} onPress={() => printOrderSlip(order, printer)}>
              <Text style={styles.actionText}>Reprint</Text>
            </TouchableOpacity>
            {['New', 'Preparing', 'Done'].map((status) => (
              <TouchableOpacity key={status} style={styles.actionButtonLight} onPress={() => onStatusChange(order.id, status)}>
                <Text style={styles.actionTextDark}>{status}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 14, paddingBottom: 28 },
  title: { fontSize: 22, fontWeight: '900', marginBottom: 12, color: '#111' },
  empty: { color: '#555' },
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: '#ded8c9' },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  orderNo: { fontSize: 18, fontWeight: '900' },
  status: { backgroundColor: '#173d2f', color: '#fff', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999, overflow: 'hidden', fontWeight: '800' },
  meta: { color: '#555', marginTop: 4 },
  itemsBox: { marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#eee' },
  itemText: { fontWeight: '700', marginBottom: 4 },
  total: { textAlign: 'right', fontSize: 18, fontWeight: '900', color: '#e53b32', marginTop: 6 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  actionButton: { backgroundColor: '#e53b32', borderRadius: 10, paddingVertical: 9, paddingHorizontal: 12 },
  actionText: { color: '#fff', fontWeight: '900' },
  actionButtonLight: { backgroundColor: '#f1eee6', borderRadius: 10, paddingVertical: 9, paddingHorizontal: 12 },
  actionTextDark: { color: '#111', fontWeight: '900' },
});
