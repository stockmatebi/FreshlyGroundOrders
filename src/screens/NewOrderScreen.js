import React, { useMemo, useState } from 'react';
import { Alert, Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { formatMoney, printOrderSlip } from '../utils/receiptPrinter';
import { localDateKey } from '../utils/reports';
import { theme } from '../theme';

function uid(prefix = 'id') {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function NewOrderScreen({ menu, settings, onOrderSaved, getNextOrderNumber }) {
  const activeSections = useMemo(() => menu.filter((s) => (s.items || []).some((i) => i.active)), [menu]);
  const [sectionId, setSectionId] = useState(activeSections[0]?.id || '');
  const [cart, setCart] = useState([]);
  const [orderType, setOrderType] = useState('Takeaway');
  const [customerName, setCustomerName] = useState('');
  const [tableNumber, setTableNumber] = useState('');
  const [orderNote, setOrderNote] = useState('');
  const [modifierItem, setModifierItem] = useState(null);
  const [selectedModifiers, setSelectedModifiers] = useState([]);

  const section = activeSections.find((s) => s.id === sectionId) || activeSections[0];
  const modifierPool = useMemo(() => menu.flatMap((s) => s.items || []), [menu]);
  const total = useMemo(() => cart.reduce((sum, item) => {
    const modTotal = (item.selectedModifiers || []).reduce((s, m) => s + Number(m.price || 0), 0);
    return sum + item.qty * (Number(item.unitPrice || 0) + modTotal);
  }, 0), [cart]);

  function beginAdd(item) {
    if (item.soldOut) return;
    const mods = (item.modifiers || []).map((id) => modifierPool.find((m) => m.id === id)).filter(Boolean).filter((m) => m.active && !m.soldOut);
    if (mods.length) {
      setModifierItem({ ...item, availableModifiers: mods });
      setSelectedModifiers([]);
      return;
    }
    addCartLine(item, []);
  }

  function addCartLine(item, mods) {
    const signature = (mods || []).map((m) => m.id).sort().join('|');
    setCart((current) => {
      const index = current.findIndex((c) => c.id === item.id && c.modifierSignature === signature && !c.note);
      if (index >= 0) return current.map((c, i) => i === index ? { ...c, qty: c.qty + 1 } : c);
      return [...current, {
        lineId: uid('line'), id: item.id, name: item.name, description: item.description || '', qty: 1,
        unitPrice: Number(item.price || 0), selectedModifiers: mods || [], modifierSignature: signature, note: '',
      }];
    });
  }

  function confirmModifiers() {
    if (!modifierItem) return;
    addCartLine(modifierItem, selectedModifiers);
    setModifierItem(null);
    setSelectedModifiers([]);
  }

  function toggleModifier(mod) {
    setSelectedModifiers((current) => current.some((m) => m.id === mod.id) ? current.filter((m) => m.id !== mod.id) : [...current, { id: mod.id, name: mod.name, price: Number(mod.price || 0) }]);
  }

  function changeQty(lineId, delta) {
    setCart((current) => current.map((item) => item.lineId === lineId ? { ...item, qty: Math.max(0, item.qty + delta) } : item).filter((item) => item.qty > 0));
  }

  function updateNote(lineId, note) {
    setCart((current) => current.map((item) => item.lineId === lineId ? { ...item, note } : item));
  }

  async function saveAndPrint() {
    if (!cart.length) return Alert.alert('Empty order', 'Add at least one item first.');
    const now = new Date();
    const order = {
      id: uid('order'),
      number: getNextOrderNumber(now),
      dayKey: localDateKey(now),
      createdAt: now.toISOString(),
      createdAtText: now.toLocaleString('en-ZA'),
      orderType,
      customerName: customerName.trim(),
      tableNumber: tableNumber.trim(),
      orderNote: orderNote.trim(),
      items: cart.map((item) => ({ ...item })),
      total,
    };
    await onOrderSaved(order);
    await printOrderSlip(order, settings);
    setCart([]);
    setCustomerName('');
    setTableNumber('');
    setOrderNote('');
  }

  return (
    <View style={styles.root}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryBar} contentContainerStyle={styles.categoryContent}>
        {activeSections.map((s) => (
          <TouchableOpacity key={s.id} style={[styles.category, (section?.id === s.id) && styles.categoryActive]} onPress={() => setSectionId(s.id)}>
            <Text style={[styles.categoryText, (section?.id === s.id) && styles.categoryTextActive]}>{s.name}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.typeRow}>
          {['Takeaway', 'Sit-down'].map((type) => (
            <TouchableOpacity key={type} onPress={() => setOrderType(type)} style={[styles.typeButton, orderType === type && styles.typeButtonActive]}>
              <Text style={[styles.typeText, orderType === type && styles.typeTextActive]}>{type}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <View style={styles.fieldsRow}>
          <TextInput placeholderTextColor={theme.colors.muted} style={styles.input} placeholder="Customer name (optional)" value={customerName} onChangeText={setCustomerName} />
          <TextInput placeholderTextColor={theme.colors.muted} style={styles.input} placeholder="Table no. (optional)" value={tableNumber} onChangeText={setTableNumber} />
        </View>

        <Text style={styles.sectionTitle}>{section?.name || 'Menu'}</Text>
        <View style={styles.menuGrid}>
          {(section?.items || []).filter((item) => item.active).sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0)).map((item) => (
            <TouchableOpacity key={item.id} disabled={item.soldOut} style={[styles.menuItem, item.soldOut && styles.soldOutCard]} onPress={() => beginAdd(item)}>
              <View style={styles.itemTop}><Text style={styles.itemName}>{item.name}</Text>{item.soldOut ? <Text style={styles.soldOut}>SOLD OUT</Text> : null}</View>
              {item.description ? <Text style={styles.itemDescription}>{item.description}</Text> : null}
              <Text style={styles.itemPrice}>{formatMoney(item.price)}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.cart}>
          <View style={styles.cartTitleRow}><Text style={styles.cartTitle}>Current Order</Text><Text style={styles.cartCount}>{cart.reduce((s, i) => s + i.qty, 0)} items</Text></View>
          {!cart.length ? <Text style={styles.empty}>Tap a menu item to add it.</Text> : null}
          {cart.map((item) => {
            const unit = item.unitPrice + (item.selectedModifiers || []).reduce((s, m) => s + m.price, 0);
            return <View key={item.lineId} style={styles.cartLine}>
              <View style={styles.cartHeader}><Text style={styles.cartItemName}>{item.qty} × {item.name}</Text><Text style={styles.cartItemPrice}>{formatMoney(item.qty * unit)}</Text></View>
              {(item.selectedModifiers || []).map((m) => <Text key={m.id} style={styles.modText}>+ {m.name} {formatMoney(m.price)}</Text>)}
              <View style={styles.qtyRow}>
                <TouchableOpacity onPress={() => changeQty(item.lineId, -1)} style={styles.qtyButton}><Text style={styles.qtyText}>−</Text></TouchableOpacity>
                <Text style={styles.qtyNumber}>{item.qty}</Text>
                <TouchableOpacity onPress={() => changeQty(item.lineId, 1)} style={styles.qtyButton}><Text style={styles.qtyText}>+</Text></TouchableOpacity>
              </View>
              <TextInput placeholderTextColor={theme.colors.muted} style={styles.noteInput} placeholder="Item note — extra hot, no tomato, etc." value={item.note} onChangeText={(note) => updateNote(item.lineId, note)} />
            </View>;
          })}
          <TextInput placeholderTextColor={theme.colors.muted} style={styles.orderNote} placeholder="General order note" value={orderNote} onChangeText={setOrderNote} multiline />
          <View style={styles.totalRow}><Text style={styles.totalLabel}>TOTAL</Text><Text style={styles.totalValue}>{formatMoney(total)}</Text></View>
          <TouchableOpacity style={styles.printButton} onPress={saveAndPrint}><Text style={styles.printText}>SAVE & PRINT ORDER</Text></TouchableOpacity>
        </View>
      </ScrollView>

      <Modal visible={Boolean(modifierItem)} transparent animationType="fade" onRequestClose={() => setModifierItem(null)}>
        <View style={styles.modalBackdrop}><View style={styles.modalCard}>
          <Text style={styles.modalTitle}>{modifierItem?.name}</Text><Text style={styles.modalSub}>Choose any extras</Text>
          {(modifierItem?.availableModifiers || []).map((mod) => {
            const selected = selectedModifiers.some((m) => m.id === mod.id);
            return <TouchableOpacity key={mod.id} onPress={() => toggleModifier(mod)} style={[styles.modChoice, selected && styles.modChoiceActive]}>
              <Text style={[styles.modChoiceText, selected && styles.modChoiceTextActive]}>{selected ? '✓ ' : ''}{mod.name}</Text><Text style={[styles.modChoiceText, selected && styles.modChoiceTextActive]}>{formatMoney(mod.price)}</Text>
            </TouchableOpacity>;
          })}
          <View style={styles.modalActions}><TouchableOpacity style={styles.secondaryButton} onPress={() => setModifierItem(null)}><Text style={styles.secondaryText}>Cancel</Text></TouchableOpacity><TouchableOpacity style={styles.primaryButton} onPress={confirmModifiers}><Text style={styles.primaryText}>Add to Order</Text></TouchableOpacity></View>
        </View></View>
      </Modal>
    </View>
  );
}

const c = theme.colors;
const styles = StyleSheet.create({
  root:{flex:1,backgroundColor:c.bg},categoryBar:{maxHeight:58,backgroundColor:c.espresso},categoryContent:{padding:9,gap:8},category:{paddingHorizontal:16,paddingVertical:10,borderRadius:999,backgroundColor:'#3A3029'},categoryActive:{backgroundColor:c.green},categoryText:{color:'#E9E1D7',fontWeight:'800'},categoryTextActive:{color:'#fff'},container:{padding:14,paddingBottom:32},typeRow:{flexDirection:'row',gap:10,marginBottom:10},typeButton:{flex:1,padding:12,borderRadius:12,backgroundColor:c.surface,borderWidth:1,borderColor:c.line},typeButtonActive:{backgroundColor:c.green,borderColor:c.green},typeText:{textAlign:'center',fontWeight:'900',color:c.ink},typeTextActive:{color:'#fff'},fieldsRow:{flexDirection:'row',gap:10},input:{flex:1,backgroundColor:c.surface,color:c.ink,padding:12,borderRadius:12,marginBottom:14,borderWidth:1,borderColor:c.line},sectionTitle:{fontSize:22,fontWeight:'900',color:c.greenDark,marginBottom:10},menuGrid:{flexDirection:'row',flexWrap:'wrap',gap:10},menuItem:{width:'48%',backgroundColor:c.surface,borderRadius:16,padding:13,borderWidth:1,borderColor:c.line,minHeight:96},soldOutCard:{opacity:.5,backgroundColor:c.soft},itemTop:{gap:4},itemName:{fontSize:16,fontWeight:'900',color:c.ink},itemDescription:{color:c.muted,fontSize:12,marginTop:4},itemPrice:{color:c.red,fontWeight:'900',fontSize:17,marginTop:'auto',paddingTop:8},soldOut:{color:c.red,fontWeight:'900',fontSize:10},cart:{marginTop:18,backgroundColor:c.espresso,borderRadius:18,padding:14},cartTitleRow:{flexDirection:'row',justifyContent:'space-between',alignItems:'center'},cartTitle:{color:'#fff',fontSize:21,fontWeight:'900'},cartCount:{color:'#D8CFC6',fontWeight:'700'},empty:{color:'#D2C8BE',paddingVertical:16},cartLine:{backgroundColor:'#fff',borderRadius:13,padding:11,marginTop:10},cartHeader:{flexDirection:'row',justifyContent:'space-between',gap:8},cartItemName:{fontWeight:'900',fontSize:16,flex:1,color:c.ink},cartItemPrice:{fontWeight:'900',color:c.green},modText:{color:c.muted,marginTop:3,fontWeight:'700'},qtyRow:{flexDirection:'row',alignItems:'center',gap:10,marginTop:9},qtyButton:{backgroundColor:c.red,borderRadius:9,width:40,height:34,justifyContent:'center'},qtyText:{color:'#fff',textAlign:'center',fontSize:20,fontWeight:'900'},qtyNumber:{fontSize:17,fontWeight:'900',minWidth:22,textAlign:'center'},noteInput:{backgroundColor:c.bg,color:c.ink,borderRadius:9,padding:9,marginTop:9,borderWidth:1,borderColor:c.line},orderNote:{backgroundColor:'#fff',color:c.ink,borderRadius:12,padding:11,minHeight:54,marginTop:12},totalRow:{flexDirection:'row',justifyContent:'space-between',marginTop:15,marginBottom:12},totalLabel:{color:'#fff',fontWeight:'900',fontSize:21},totalValue:{color:'#fff',fontWeight:'900',fontSize:24},printButton:{backgroundColor:c.red,borderRadius:14,padding:15},printText:{color:'#fff',textAlign:'center',fontWeight:'900',fontSize:16},modalBackdrop:{flex:1,backgroundColor:'rgba(0,0,0,.55)',justifyContent:'center',padding:18},modalCard:{backgroundColor:'#fff',borderRadius:18,padding:17},modalTitle:{fontSize:22,fontWeight:'900',color:c.ink},modalSub:{color:c.muted,marginBottom:12},modChoice:{flexDirection:'row',justifyContent:'space-between',padding:13,borderRadius:11,backgroundColor:c.bg,marginBottom:8,borderWidth:1,borderColor:c.line},modChoiceActive:{backgroundColor:c.green,borderColor:c.green},modChoiceText:{fontWeight:'800',color:c.ink},modChoiceTextActive:{color:'#fff'},modalActions:{flexDirection:'row',gap:10,marginTop:8},secondaryButton:{flex:1,padding:13,borderRadius:11,backgroundColor:c.soft},secondaryText:{textAlign:'center',fontWeight:'900',color:c.ink},primaryButton:{flex:1,padding:13,borderRadius:11,backgroundColor:c.red},primaryText:{textAlign:'center',fontWeight:'900',color:'#fff'},
});
