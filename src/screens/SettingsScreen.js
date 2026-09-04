import React, { useMemo, useState } from 'react';
import { Alert, Modal, ScrollView, StyleSheet, Switch, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { listUsbPrinters, printTestSlip, formatMoney } from '../utils/receiptPrinter';
import { exportBackupPayload } from '../utils/storage';
import { pickBackup, shareBackup } from '../utils/reports';
import { theme } from '../theme';

function uid(prefix) { return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`; }

export function SettingsScreen({ menu, onSaveMenu, settings, onSaveSettings, orders, onRestoreBackup }) {
  const [printers, setPrinters] = useState([]);
  const [busyPrinter, setBusyPrinter] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [editingItem, setEditingItem] = useState(null);
  const [receipt, setReceipt] = useState(settings.receipt);

  const modifierChoices = useMemo(() => menu.flatMap((s) => (s.items || []).map((item) => ({ ...item, categoryName: s.name }))), [menu]);

  async function detectUsb() {
    setBusyPrinter(true);
    try {
      const found = await listUsbPrinters();
      setPrinters(found);
      if (!found.length) Alert.alert('No USB printer found', 'Connect and power on the POS-8360, then tap Detect USB Printer again. Android may ask you to allow USB access.');
    } catch (error) {
      Alert.alert('USB detection failed', error?.message || 'Could not read connected USB devices.');
    } finally { setBusyPrinter(false); }
  }

  function saveCategory() {
    const name = editingCategory?.name?.trim();
    if (!name) return Alert.alert('Category name required');
    let next;
    if (editingCategory.isNew) {
      next = [...menu, { id: uid('category'), name, sortOrder: menu.length + 1, items: [] }];
    } else {
      next = menu.map((s) => s.id === editingCategory.id ? { ...s, name } : s);
    }
    onSaveMenu(next);
    setEditingCategory(null);
  }

  function deleteCategory(section) {
    Alert.alert('Delete category?', `${section.name} and all items inside it will be removed.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => onSaveMenu(menu.filter((s) => s.id !== section.id)) },
    ]);
  }

  function openItem(section, item = null) {
    setEditingItem(item ? { ...item, sectionId: section.id, originalId: item.id, priceText: String(item.price ?? 0), modifiers: [...(item.modifiers || [])] } : {
      isNew: true, sectionId: section.id, id: uid('item'), originalId: null, name: '', description: '', priceText: '0', active: true, soldOut: false, modifiers: [],
    });
  }

  function saveItem() {
    const name = editingItem?.name?.trim();
    const price = Number(String(editingItem?.priceText || '0').replace(',', '.'));
    if (!name) return Alert.alert('Item name required');
    if (!Number.isFinite(price) || price < 0) return Alert.alert('Invalid price');
    const clean = {
      id: editingItem.id,
      name,
      description: editingItem.description?.trim() || '',
      price,
      active: editingItem.active !== false,
      soldOut: Boolean(editingItem.soldOut),
      modifiers: editingItem.modifiers || [],
      sortOrder: editingItem.sortOrder || 999,
    };
    const next = menu.map((s) => {
      if (s.id !== editingItem.sectionId) return s;
      if (editingItem.isNew) return { ...s, items: [...(s.items || []), { ...clean, sortOrder: (s.items || []).length + 1 }] };
      return { ...s, items: (s.items || []).map((i) => i.id === editingItem.originalId ? clean : i) };
    });
    onSaveMenu(next);
    setEditingItem(null);
  }

  function deleteItem(sectionId, item) {
    Alert.alert('Delete item?', item.name, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => onSaveMenu(menu.map((s) => s.id === sectionId ? { ...s, items: s.items.filter((i) => i.id !== item.id) } : s)) },
    ]);
  }

  function toggleSoldOut(sectionId, itemId) {
    onSaveMenu(menu.map((s) => s.id === sectionId ? { ...s, items: s.items.map((i) => i.id === itemId ? { ...i, soldOut: !i.soldOut } : i) } : s));
  }

  function toggleModifier(id) {
    setEditingItem((current) => ({ ...current, modifiers: current.modifiers.includes(id) ? current.modifiers.filter((x) => x !== id) : [...current.modifiers, id] }));
  }

  async function saveReceipt() {
    await onSaveSettings({ ...settings, receipt });
    Alert.alert('Saved', 'Till slip settings have been saved.');
  }

  async function choosePrinter(printer) {
    await onSaveSettings({ ...settings, printer });
    Alert.alert('USB printer selected', `${printer.name}\nVendor ${printer.vendorId} · Product ${printer.productId}`);
  }

  async function testPrinter() {
    await printTestSlip({ ...settings, receipt });
  }

  async function backup() {
    try {
      await shareBackup(await exportBackupPayload(menu, orders, { ...settings, receipt }));
    } catch (error) { Alert.alert('Backup failed', error?.message || 'Could not create backup.'); }
  }

  async function restore() {
    try {
      const payload = await pickBackup();
      if (!payload) return;
      if (!Array.isArray(payload.menu) || !Array.isArray(payload.orders) || !payload.settings) throw new Error('This is not a valid Freshly Ground backup file.');
      Alert.alert('Restore backup?', 'This will replace the menu, settings and order history on this device.', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Restore', style: 'destructive', onPress: () => onRestoreBackup(payload) },
      ]);
    } catch (error) { Alert.alert('Restore failed', error?.message || 'Could not read backup file.'); }
  }

  return <ScrollView contentContainerStyle={styles.container}>
    <Text style={styles.title}>Settings</Text>

    <View style={styles.card}>
      <Text style={styles.cardTitle}>USB Printer · POS-8360</Text>
      <Text style={styles.help}>Selected: {settings.printer?.name || 'None'}</Text>
      {settings.printer ? <Text style={styles.small}>Vendor {settings.printer.vendorId} · Product {settings.printer.productId}</Text> : null}
      <TouchableOpacity style={styles.primaryButton} onPress={detectUsb}><Text style={styles.primaryText}>{busyPrinter ? 'DETECTING…' : 'DETECT USB PRINTER'}</Text></TouchableOpacity>
      {printers.map((p) => <TouchableOpacity key={p.id} style={styles.printerRow} onPress={() => choosePrinter(p)}><View><Text style={styles.rowTitle}>{p.name}</Text><Text style={styles.small}>Vendor {p.vendorId} · Product {p.productId}</Text></View><Text style={styles.selectText}>SELECT</Text></TouchableOpacity>)}
      <TouchableOpacity style={styles.darkButton} onPress={testPrinter}><Text style={styles.primaryText}>PRINT TEST SLIP</Text></TouchableOpacity>
    </View>

    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.cardHeaderText}><Text style={styles.cardTitle}>Menu & Categories</Text><Text style={styles.help}>Add, edit, remove or temporarily sell out items.</Text></View>
        <TouchableOpacity style={styles.smallAdd} onPress={() => setEditingCategory({ isNew: true, name: '' })}><Text style={styles.smallAddText}>+ CATEGORY</Text></TouchableOpacity>
      </View>
      {menu.map((section) => <View key={section.id} style={styles.section}>
        <View style={styles.sectionHeader}><Text style={styles.sectionTitle}>{section.name}</Text><View style={styles.inlineActions}><TouchableOpacity onPress={() => setEditingCategory({ id: section.id, name: section.name })}><Text style={styles.link}>Rename</Text></TouchableOpacity><TouchableOpacity onPress={() => deleteCategory(section)}><Text style={styles.dangerLink}>Delete</Text></TouchableOpacity></View></View>
        {(section.items || []).map((item) => <View key={item.id} style={styles.itemRow}>
          <View style={{flex:1}}><Text style={styles.rowTitle}>{item.name}</Text><Text style={styles.small}>{formatMoney(item.price)}{item.description ? ` · ${item.description}` : ''}</Text></View>
          <TouchableOpacity style={[styles.stockPill, item.soldOut && styles.stockPillOut]} onPress={() => toggleSoldOut(section.id, item.id)}><Text style={[styles.stockPillText, item.soldOut && styles.stockPillTextOut]}>{item.soldOut ? 'SOLD OUT' : 'AVAILABLE'}</Text></TouchableOpacity>
          <TouchableOpacity onPress={() => openItem(section, item)}><Text style={styles.link}>Edit</Text></TouchableOpacity>
          <TouchableOpacity onPress={() => deleteItem(section.id, item)}><Text style={styles.dangerLink}>×</Text></TouchableOpacity>
        </View>)}
        <TouchableOpacity style={styles.addItemButton} onPress={() => openItem(section)}><Text style={styles.addItemText}>+ Add item to {section.name}</Text></TouchableOpacity>
      </View>)}
    </View>

    <View style={styles.card}>
      <Text style={styles.cardTitle}>Till Slip Template</Text>
      <Text style={styles.help}>Edit the 80 mm receipt without rebuilding the app.</Text>
      {[
        ['Business name','businessName'],['Header line 1','headerLine1'],['Header line 2','headerLine2'],['Phone','phone'],['Footer message','footer']
      ].map(([label,key]) => <View key={key} style={styles.field}><Text style={styles.label}>{label}</Text><TextInput placeholderTextColor={c.muted} style={styles.textInput} value={String(receipt[key] || '')} onChangeText={(v) => setReceipt((r) => ({...r,[key]:v}))}/></View>)}
      {[
        ['Show prices','showPrices'],['Show total','showTotal'],['Show order type','showOrderType'],['Show customer','showCustomer'],['Show table','showTable'],['Show notes','showNotes'],['Auto cut paper','autoCut']
      ].map(([label,key]) => <View key={key} style={styles.switchRow}><Text style={styles.switchLabel}>{label}</Text><Switch value={receipt[key] !== false} onValueChange={(v) => setReceipt((r) => ({...r,[key]:v}))}/></View>)}
      <View style={styles.field}><Text style={styles.label}>Feed lines after print</Text><TextInput keyboardType="numeric" style={styles.textInput} value={String(receipt.feedLines ?? 4)} onChangeText={(v) => setReceipt((r) => ({...r,feedLines:Number(v)||1}))}/></View>
      <TouchableOpacity style={styles.primaryButton} onPress={saveReceipt}><Text style={styles.primaryText}>SAVE TILL SLIP SETTINGS</Text></TouchableOpacity>
    </View>

    <View style={styles.card}>
      <Text style={styles.cardTitle}>Backup & Restore</Text><Text style={styles.help}>Export a local backup before changing devices or reinstalling the app.</Text>
      <TouchableOpacity style={styles.darkButton} onPress={backup}><Text style={styles.primaryText}>EXPORT BACKUP</Text></TouchableOpacity>
      <TouchableOpacity style={styles.lightButton} onPress={restore}><Text style={styles.lightText}>RESTORE BACKUP</Text></TouchableOpacity>
    </View>

    <Modal visible={Boolean(editingCategory)} transparent animationType="fade" onRequestClose={() => setEditingCategory(null)}><View style={styles.modalBackdrop}><View style={styles.modalCard}><Text style={styles.modalTitle}>{editingCategory?.isNew ? 'Add Category' : 'Rename Category'}</Text><TextInput autoFocus placeholder="Category name" placeholderTextColor={c.muted} style={styles.textInput} value={editingCategory?.name || ''} onChangeText={(name) => setEditingCategory((x) => ({...x,name}))}/><View style={styles.modalActions}><TouchableOpacity style={styles.lightButtonFlex} onPress={() => setEditingCategory(null)}><Text style={styles.lightText}>Cancel</Text></TouchableOpacity><TouchableOpacity style={styles.primaryFlex} onPress={saveCategory}><Text style={styles.primaryText}>Save</Text></TouchableOpacity></View></View></View></Modal>

    <Modal visible={Boolean(editingItem)} transparent animationType="slide" onRequestClose={() => setEditingItem(null)}><View style={styles.modalBackdrop}><View style={styles.modalCardLarge}><ScrollView><Text style={styles.modalTitle}>{editingItem?.isNew ? 'Add Menu Item' : 'Edit Menu Item'}</Text>
      <Text style={styles.label}>Item name</Text><TextInput placeholderTextColor={c.muted} style={styles.textInput} value={editingItem?.name || ''} onChangeText={(name) => setEditingItem((x) => ({...x,name}))}/>
      <Text style={styles.label}>Description</Text><TextInput placeholder="Optional" placeholderTextColor={c.muted} style={styles.textInput} value={editingItem?.description || ''} onChangeText={(description) => setEditingItem((x) => ({...x,description}))}/>
      <Text style={styles.label}>Price</Text><TextInput keyboardType="decimal-pad" style={styles.textInput} value={editingItem?.priceText || ''} onChangeText={(priceText) => setEditingItem((x) => ({...x,priceText}))}/>
      <View style={styles.switchRow}><Text style={styles.switchLabel}>Visible on menu</Text><Switch value={editingItem?.active !== false} onValueChange={(active) => setEditingItem((x) => ({...x,active}))}/></View>
      <View style={styles.switchRow}><Text style={styles.switchLabel}>Sold out</Text><Switch value={Boolean(editingItem?.soldOut)} onValueChange={(soldOut) => setEditingItem((x) => ({...x,soldOut}))}/></View>
      <Text style={styles.modHeader}>Optional modifiers / add-ons</Text><Text style={styles.help}>Select extras that should pop up when this item is ordered.</Text>
      {modifierChoices.filter((m) => m.id !== editingItem?.id).map((m) => { const selected=editingItem?.modifiers?.includes(m.id); return <TouchableOpacity key={m.id} style={[styles.modRow,selected&&styles.modRowSelected]} onPress={() => toggleModifier(m.id)}><Text style={[styles.modName,selected&&styles.modNameSelected]}>{selected?'✓ ':''}{m.name}</Text><Text style={[styles.modPrice,selected&&styles.modNameSelected]}>{m.categoryName} · {formatMoney(m.price)}</Text></TouchableOpacity>; })}
      <View style={styles.modalActions}><TouchableOpacity style={styles.lightButtonFlex} onPress={() => setEditingItem(null)}><Text style={styles.lightText}>Cancel</Text></TouchableOpacity><TouchableOpacity style={styles.primaryFlex} onPress={saveItem}><Text style={styles.primaryText}>SAVE ITEM</Text></TouchableOpacity></View>
    </ScrollView></View></View></Modal>
  </ScrollView>;
}

const c = theme.colors;
const styles = StyleSheet.create({
  container:{padding:14,paddingBottom:40},title:{fontSize:24,fontWeight:'900',color:c.ink,marginBottom:12},card:{backgroundColor:c.surface,borderRadius:16,padding:14,marginBottom:13,borderWidth:1,borderColor:c.line},cardHeader:{flexDirection:'row',justifyContent:'space-between',alignItems:'flex-start',gap:8},cardHeaderText:{flex:1,minWidth:0,paddingRight:4},cardTitle:{fontSize:19,fontWeight:'900',color:c.greenDark},help:{color:c.muted,marginTop:3,marginBottom:10},small:{color:c.muted,fontSize:12,marginTop:2},primaryButton:{backgroundColor:c.red,borderRadius:12,padding:12,marginTop:9},darkButton:{backgroundColor:c.espresso,borderRadius:12,padding:12,marginTop:9},primaryText:{color:'#fff',textAlign:'center',fontWeight:'900'},printerRow:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',padding:11,borderRadius:10,backgroundColor:c.bg,marginTop:8,borderWidth:1,borderColor:c.line},rowTitle:{fontWeight:'900',color:c.ink},selectText:{color:c.green,fontWeight:'900'},smallAdd:{backgroundColor:c.green,borderRadius:9,paddingHorizontal:10,paddingVertical:8,flexShrink:0,maxWidth:108},smallAddText:{color:'#fff',fontSize:10,fontWeight:'900',textAlign:'center'},section:{marginTop:14,paddingTop:11,borderTopWidth:1,borderTopColor:c.soft},sectionHeader:{flexDirection:'row',justifyContent:'space-between',alignItems:'center'},sectionTitle:{fontSize:17,fontWeight:'900',color:c.ink},inlineActions:{flexDirection:'row',gap:12},link:{color:c.green,fontWeight:'900'},dangerLink:{color:c.red,fontWeight:'900'},itemRow:{flexDirection:'row',alignItems:'center',gap:8,paddingVertical:9,borderBottomWidth:1,borderBottomColor:c.soft},stockPill:{backgroundColor:'#E4F0E8',borderRadius:999,paddingHorizontal:8,paddingVertical:5},stockPillOut:{backgroundColor:c.dangerBg},stockPillText:{fontSize:9,fontWeight:'900',color:c.greenDark},stockPillTextOut:{color:c.red},addItemButton:{paddingVertical:10},addItemText:{color:c.red,fontWeight:'900'},field:{marginTop:8},label:{fontSize:12,fontWeight:'900',color:c.muted,marginBottom:4},textInput:{backgroundColor:c.bg,color:c.ink,borderRadius:10,padding:11,borderWidth:1,borderColor:c.line},switchRow:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',paddingVertical:8,borderBottomWidth:1,borderBottomColor:c.soft},switchLabel:{fontWeight:'800',color:c.ink},lightButton:{backgroundColor:c.soft,borderRadius:12,padding:12,marginTop:9},lightText:{textAlign:'center',fontWeight:'900',color:c.ink},modalBackdrop:{flex:1,backgroundColor:'rgba(0,0,0,.6)',justifyContent:'center',padding:16},modalCard:{backgroundColor:'#fff',borderRadius:18,padding:16},modalCardLarge:{backgroundColor:'#fff',borderRadius:18,padding:16,maxHeight:'88%'},modalTitle:{fontSize:21,fontWeight:'900',color:c.ink,marginBottom:12},modalActions:{flexDirection:'row',gap:10,marginTop:15},lightButtonFlex:{flex:1,backgroundColor:c.soft,borderRadius:11,padding:12},primaryFlex:{flex:1,backgroundColor:c.red,borderRadius:11,padding:12},modHeader:{fontWeight:'900',fontSize:16,color:c.greenDark,marginTop:12},modRow:{flexDirection:'row',justifyContent:'space-between',padding:10,borderRadius:10,backgroundColor:c.bg,marginBottom:7,borderWidth:1,borderColor:c.line},modRowSelected:{backgroundColor:c.green,borderColor:c.green},modName:{fontWeight:'800',color:c.ink,flex:1},modPrice:{color:c.muted,fontSize:12},modNameSelected:{color:'#fff'},
});