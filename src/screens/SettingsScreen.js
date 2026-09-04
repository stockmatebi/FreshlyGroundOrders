import React, { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { listBluetoothPrinters } from '../utils/receiptPrinter';

export function SettingsScreen({ menu, onSaveMenu, printer, onSavePrinter }) {
  const [localMenu, setLocalMenu] = useState(menu);
  const [printers, setPrinters] = useState([]);

  function updateItem(sectionId, itemId, field, value) {
    setLocalMenu((current) => current.map((section) => {
      if (section.id !== sectionId) return section;
      return {
        ...section,
        items: section.items.map((item) => item.id === itemId ? { ...item, [field]: field === 'price' ? Number(value) || 0 : value } : item),
      };
    }));
  }

  async function scanPrinters() {
    try {
      const found = await listBluetoothPrinters();
      setPrinters(found);
      if (found.length === 0) {
        Alert.alert('No printers found', 'Pair the thermal printer in Android Bluetooth settings first, then scan again.');
      }
    } catch (error) {
      Alert.alert('Bluetooth scan failed', error?.message || 'Could not scan paired printers.');
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Settings</Text>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Bluetooth Printer</Text>
        <Text style={styles.help}>Selected: {printer?.name || 'None selected'}</Text>
        <TouchableOpacity style={styles.primaryButton} onPress={scanPrinters}>
          <Text style={styles.primaryText}>Find Paired Printers</Text>
        </TouchableOpacity>
        {printers.map((foundPrinter) => (
          <TouchableOpacity key={foundPrinter.address} style={styles.printerButton} onPress={() => onSavePrinter(foundPrinter)}>
            <Text style={styles.printerName}>{foundPrinter.name}</Text>
            <Text style={styles.printerAddress}>{foundPrinter.address}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Menu Prices</Text>
        {localMenu.map((section) => (
          <View key={section.id} style={styles.section}>
            <Text style={styles.sectionTitle}>{section.name}</Text>
            {section.items.map((item) => (
              <View key={item.id} style={styles.itemRow}>
                <TextInput style={styles.nameInput} value={item.name} onChangeText={(value) => updateItem(section.id, item.id, 'name', value)} />
                <TextInput style={styles.priceInput} value={String(item.price)} keyboardType="numeric" onChangeText={(value) => updateItem(section.id, item.id, 'price', value)} />
              </View>
            ))}
          </View>
        ))}
        <TouchableOpacity style={styles.primaryButton} onPress={() => onSaveMenu(localMenu)}>
          <Text style={styles.primaryText}>Save Menu Changes</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 14, paddingBottom: 28 },
  title: { fontSize: 22, fontWeight: '900', marginBottom: 12, color: '#111' },
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: '#ded8c9' },
  cardTitle: { fontSize: 18, fontWeight: '900', marginBottom: 8 },
  help: { color: '#555', marginBottom: 10 },
  primaryButton: { backgroundColor: '#e53b32', borderRadius: 12, padding: 12, marginTop: 8 },
  primaryText: { color: '#fff', textAlign: 'center', fontWeight: '900' },
  printerButton: { marginTop: 10, padding: 10, borderRadius: 10, backgroundColor: '#f5f2ea' },
  printerName: { fontWeight: '900' },
  printerAddress: { color: '#555', marginTop: 2 },
  section: { marginTop: 8 },
  sectionTitle: { color: '#173d2f', fontWeight: '900', marginBottom: 6 },
  itemRow: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  nameInput: { flex: 1, backgroundColor: '#f5f2ea', borderRadius: 10, padding: 10 },
  priceInput: { width: 90, backgroundColor: '#f5f2ea', borderRadius: 10, padding: 10, textAlign: 'right' },
});
