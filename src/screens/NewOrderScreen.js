import React, { useMemo, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { formatMoney, printOrderSlip } from '../utils/receiptPrinter';

export function NewOrderScreen({ menu, printer, onOrderSaved }) {
  const [cart, setCart] = useState([]);
  const [orderType, setOrderType] = useState('Takeaway');
  const [customerName, setCustomerName] = useState('');
  const [tableNumber, setTableNumber] = useState('');
  const [orderNote, setOrderNote] = useState('');

  const total = useMemo(() => cart.reduce((sum, item) => sum + item.qty * item.price, 0), [cart]);

  function addItem(item) {
    setCart((current) => {
      const existing = current.find((cartItem) => cartItem.id === item.id && !cartItem.note);
      if (existing) {
        return current.map((cartItem) => cartItem === existing ? { ...cartItem, qty: cartItem.qty + 1 } : cartItem);
      }
      return [...current, { ...item, qty: 1, note: '' }];
    });
  }

  function changeQty(index, delta) {
    setCart((current) => current
      .map((item, itemIndex) => itemIndex === index ? { ...item, qty: Math.max(0, item.qty + delta) } : item)
      .filter((item) => item.qty > 0));
  }

  function updateNote(index, note) {
    setCart((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, note } : item));
  }

  async function saveAndPrint() {
    if (cart.length === 0) {
      Alert.alert('Empty order', 'Add at least one item before printing.');
      return;
    }
    const now = new Date();
    const number = String(Date.now()).slice(-5);
    const order = {
      id: `${Date.now()}`,
      number,
      createdAt: now.toISOString(),
      createdAtText: now.toLocaleString('en-ZA'),
      orderType,
      customerName: customerName.trim(),
      tableNumber: tableNumber.trim(),
      orderNote: orderNote.trim(),
      items: cart,
      total,
      status: 'New',
    };
    await onOrderSaved(order);
    await printOrderSlip(order, printer);
    setCart([]);
    setCustomerName('');
    setTableNumber('');
    setOrderNote('');
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.typeRow}>
        {['Takeaway', 'Sit-down'].map((type) => (
          <TouchableOpacity key={type} onPress={() => setOrderType(type)} style={[styles.typeButton, orderType === type && styles.typeButtonActive]}>
            <Text style={[styles.typeText, orderType === type && styles.typeTextActive]}>{type}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.fieldsRow}>
        <TextInput style={styles.input} placeholder="Customer name" value={customerName} onChangeText={setCustomerName} />
        <TextInput style={styles.input} placeholder="Table no." value={tableNumber} onChangeText={setTableNumber} />
      </View>

      {menu.map((section) => (
        <View key={section.id} style={styles.section}>
          <Text style={styles.sectionTitle}>{section.name}</Text>
          <View style={styles.menuGrid}>
            {section.items.filter((item) => item.active).map((item) => (
              <TouchableOpacity key={item.id} style={styles.menuItem} onPress={() => addItem(item)}>
                <Text style={styles.itemName}>{item.name}</Text>
                <Text style={styles.itemPrice}>{formatMoney(item.price)}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      ))}

      <View style={styles.cart}>
        <Text style={styles.cartTitle}>Current Order</Text>
        {cart.length === 0 ? <Text style={styles.empty}>No items yet.</Text> : null}
        {cart.map((item, index) => (
          <View key={`${item.id}-${index}`} style={styles.cartLine}>
            <View style={styles.cartHeader}>
              <Text style={styles.cartItemName}>{item.qty} x {item.name}</Text>
              <Text style={styles.cartItemPrice}>{formatMoney(item.qty * item.price)}</Text>
            </View>
            <View style={styles.qtyRow}>
              <TouchableOpacity onPress={() => changeQty(index, -1)} style={styles.qtyButton}><Text style={styles.qtyText}>-</Text></TouchableOpacity>
              <TouchableOpacity onPress={() => changeQty(index, 1)} style={styles.qtyButton}><Text style={styles.qtyText}>+</Text></TouchableOpacity>
            </View>
            <TextInput style={styles.noteInput} placeholder="Item note: extra hot, no tomato, etc." value={item.note} onChangeText={(note) => updateNote(index, note)} />
          </View>
        ))}
        <TextInput style={styles.orderNote} placeholder="General order note" value={orderNote} onChangeText={setOrderNote} multiline />
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Total</Text>
          <Text style={styles.totalValue}>{formatMoney(total)}</Text>
        </View>
        <TouchableOpacity style={styles.printButton} onPress={saveAndPrint}>
          <Text style={styles.printText}>Save & Print Slip</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 14, paddingBottom: 28 },
  typeRow: { flexDirection: 'row', gap: 10, marginBottom: 10 },
  typeButton: { flex: 1, padding: 12, backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#ddd' },
  typeButtonActive: { backgroundColor: '#111', borderColor: '#111' },
  typeText: { textAlign: 'center', fontWeight: '800', color: '#111' },
  typeTextActive: { color: '#fff' },
  fieldsRow: { flexDirection: 'row', gap: 10 },
  input: { flex: 1, backgroundColor: '#fff', padding: 12, borderRadius: 12, marginBottom: 12, borderWidth: 1, borderColor: '#ddd' },
  section: { marginBottom: 12 },
  sectionTitle: { fontSize: 18, fontWeight: '900', marginBottom: 8, color: '#173d2f' },
  menuGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  menuItem: { width: '48%', backgroundColor: '#fff', borderRadius: 14, padding: 12, borderWidth: 1, borderColor: '#ded8c9' },
  itemName: { fontWeight: '800', color: '#111' },
  itemPrice: { color: '#e53b32', fontWeight: '900', marginTop: 6 },
  cart: { marginTop: 8, backgroundColor: '#111', borderRadius: 16, padding: 14 },
  cartTitle: { color: '#fff', fontSize: 19, fontWeight: '900', marginBottom: 8 },
  empty: { color: '#bbb' },
  cartLine: { backgroundColor: '#fff', borderRadius: 12, padding: 10, marginBottom: 10 },
  cartHeader: { flexDirection: 'row', justifyContent: 'space-between', gap: 10 },
  cartItemName: { fontWeight: '900', flex: 1 },
  cartItemPrice: { fontWeight: '900', color: '#173d2f' },
  qtyRow: { flexDirection: 'row', gap: 8, marginTop: 8 },
  qtyButton: { backgroundColor: '#e53b32', borderRadius: 8, width: 44, paddingVertical: 6 },
  qtyText: { color: '#fff', textAlign: 'center', fontSize: 18, fontWeight: '900' },
  noteInput: { backgroundColor: '#f3f3f3', borderRadius: 8, padding: 8, marginTop: 8 },
  orderNote: { backgroundColor: '#fff', borderRadius: 12, padding: 10, minHeight: 50, marginTop: 4 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 14, marginBottom: 12 },
  totalLabel: { color: '#fff', fontWeight: '900', fontSize: 20 },
  totalValue: { color: '#fff', fontWeight: '900', fontSize: 20 },
  printButton: { backgroundColor: '#e53b32', borderRadius: 14, padding: 14 },
  printText: { color: '#fff', textAlign: 'center', fontWeight: '900', fontSize: 16 },
});
