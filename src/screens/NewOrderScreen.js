import React, { useMemo, useState } from 'react';
import { Alert, Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import { formatMoney, printOrderSlip } from '../utils/receiptPrinter';
import { localDateKey } from '../utils/reports';
import { theme } from '../theme';

const uid = (prefix = 'id') => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
const customerName = (customer) => `${customer?.firstName || ''} ${customer?.surname || ''}`.trim() || customer?.name || 'Unnamed customer';

export function NewOrderScreen({ menu, onSaveMenu, settings, onSaveSettings, customers, onOrderSaved, getNextOrderNumber }) {
  const { width } = useWindowDimensions();
  const landscape = width >= 800;
  const sections = useMemo(() => menu.filter((section) => (section.items || []).some((item) => item.active)), [menu]);
  const [sectionId, setSectionId] = useState(sections[0]?.id || '');
  const [cart, setCart] = useState([]);
  const [orderType, setOrderType] = useState('Takeaway');
  const [selectedCustomerId, setSelectedCustomerId] = useState(null);
  const [walkInName, setWalkInName] = useState('');
  const [program, setProgram] = useState('');
  const [table, setTable] = useState('');
  const [note, setNote] = useState('');
  const [specialOpen, setSpecialOpen] = useState(false);
  const [specialText, setSpecialText] = useState(settings.weekdaySpecial?.description || '');
  const [customerOpen, setCustomerOpen] = useState(false);
  const [customerSearch, setCustomerSearch] = useState('');

  const section = sections.find((item) => item.id === sectionId) || sections[0];
  const allItems = menu.flatMap((sectionItem) => (sectionItem.items || []).map((item) => ({ ...item, sectionId: sectionItem.id })));
  const quickItems = (settings.quickItemIds || []).map((id) => allItems.find((item) => item.id === id)).filter(Boolean);
  const selectedCustomer = customers.find((customer) => customer.id === selectedCustomerId) || null;
  const activeCustomers = useMemo(() => customers.filter((customer) => customer.active !== false), [customers]);
  const filteredCustomers = useMemo(() => {
    const q = customerSearch.trim().toLowerCase();
    if (!q) return activeCustomers.slice(0, 30);
    return activeCustomers.filter((customer) => customerName(customer).toLowerCase().includes(q) || String(customer.phone || '').toLowerCase().includes(q)).slice(0, 30);
  }, [activeCustomers, customerSearch]);

  const total = useMemo(() => cart.reduce((sum, item) => {
    const modifiers = (item.selectedModifiers || []).reduce((modifierSum, modifier) => modifierSum + Number(modifier.price || 0), 0);
    return sum + item.qty * (Number(item.unitPrice || 0) + modifiers);
  }, 0), [cart]);

  const loyaltyEligibility = useMemo(() => ({
    Coffee: cart.some((item) => (item.loyaltyPrograms || []).includes('Coffee')),
    Meal: cart.some((item) => (item.loyaltyPrograms || []).includes('Meal')),
  }), [cart]);

  function add(item) {
    if (item.soldOut) return;
    setCart((current) => {
      const index = current.findIndex((line) => line.id === item.id && !line.note && !(line.selectedModifiers || []).length);
      if (index >= 0) return current.map((line, lineIndex) => lineIndex === index ? { ...line, qty: line.qty + 1 } : line);
      return [...current, {
        lineId: uid('line'),
        id: item.id,
        name: item.id === 'weekday-special-r50' ? (settings.weekdaySpecial?.description || item.name) : item.name,
        qty: 1,
        unitPrice: Number(item.price || 0),
        selectedModifiers: [],
        loyaltyPrograms: [...(item.loyaltyPrograms || [])],
        note: '',
      }];
    });
  }

  function toggleSoldOut(item) {
    Alert.alert(item.soldOut ? 'Mark available?' : 'Mark sold out?', item.name, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: item.soldOut ? 'AVAILABLE' : 'SOLD OUT',
        onPress: () => onSaveMenu(menu.map((sectionItem) => ({
          ...sectionItem,
          items: (sectionItem.items || []).map((menuItem) => menuItem.id === item.id ? { ...menuItem, soldOut: !menuItem.soldOut } : menuItem),
        }))),
      },
    ]);
  }

  function chooseCustomer(customer) {
    setSelectedCustomerId(customer.id);
    setWalkInName('');
    setCustomerOpen(false);
    setCustomerSearch('');
  }

  function clearCustomer() {
    setSelectedCustomerId(null);
    setProgram('');
  }

  async function saveOrder() {
    if (!cart.length) return Alert.alert('Empty order', 'Add at least one item.');
    if (program && !selectedCustomer) return Alert.alert('Select a loyalty customer', 'Choose a customer from the customer database before adding a loyalty stamp.');
    if (program && !loyaltyEligibility[program]) return Alert.alert('No qualifying loyalty item', `This order does not contain an item marked for ${program} loyalty. Edit qualifying items under Settings > Menu & Categories.`);

    const now = new Date();
    const order = {
      id: uid('order'),
      number: getNextOrderNumber(now),
      dayKey: localDateKey(now),
      createdAt: now.toISOString(),
      createdAtText: now.toLocaleString('en-ZA'),
      orderType,
      customerId: selectedCustomer?.id || null,
      customerName: selectedCustomer ? customerName(selectedCustomer) : walkInName.trim(),
      customerPhone: selectedCustomer?.phone || '',
      loyaltyProgram: program || null,
      tableNumber: table.trim(),
      orderNote: note.trim(),
      items: cart,
      total,
    };

    await onOrderSaved(order);
    await printOrderSlip(order, settings);
    setCart([]);
    setSelectedCustomerId(null);
    setWalkInName('');
    setProgram('');
    setTable('');
    setNote('');
  }

  async function saveSpecial() {
    await onSaveSettings({ ...settings, weekdaySpecial: { ...settings.weekdaySpecial, description: specialText.trim() || "Today's R50 Weekday Special" } });
    setSpecialOpen(false);
  }

  const menuPane = <>
    <View style={styles.quickWrap}>
      <View style={styles.quickHeader}>
        <Text style={styles.quickTitle}>QUICK PICKS</Text>
        <TouchableOpacity onPress={() => setSpecialOpen(true)}><Text style={styles.specialEdit}>EDIT R50 SPECIAL</Text></TouchableOpacity>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        {quickItems.map((item) => <TouchableOpacity key={item.id} disabled={item.soldOut} onPress={() => add(item)} onLongPress={() => toggleSoldOut(item)} style={[styles.quickItem, item.soldOut && styles.soldOutOpacity]}><Text style={styles.quickName}>{item.name}</Text><Text style={styles.quickPrice}>{formatMoney(item.price)}</Text>{(item.loyaltyPrograms || []).length ? <Text style={styles.quickLoyalty}>{(item.loyaltyPrograms || []).join(' / ')} loyalty</Text> : null}</TouchableOpacity>)}
      </ScrollView>
    </View>

    <View style={styles.typeRow}>{['Takeaway', 'Sit-down'].map((type) => <TouchableOpacity key={type} onPress={() => setOrderType(type)} style={[styles.typeButton, orderType === type && styles.typeButtonActive]}><Text style={[styles.typeText, orderType === type && styles.typeTextActive]}>{type}</Text></TouchableOpacity>)}</View>

    <View style={styles.customerBar}>
      <View style={{ flex: 1 }}>
        <Text style={styles.customerBarLabel}>CUSTOMER</Text>
        {selectedCustomer ? <><Text style={styles.customerBarName}>{customerName(selectedCustomer)}</Text><Text style={styles.customerBarPhone}>{selectedCustomer.phone}</Text></> : <Text style={styles.customerBarEmpty}>No loyalty customer selected</Text>}
      </View>
      {selectedCustomer ? <TouchableOpacity style={styles.clearCustomer} onPress={clearCustomer}><Text style={styles.clearCustomerText}>CLEAR</Text></TouchableOpacity> : null}
      <TouchableOpacity style={styles.findCustomer} onPress={() => setCustomerOpen(true)}><Text style={styles.findCustomerText}>FIND CUSTOMER</Text></TouchableOpacity>
    </View>

    {!selectedCustomer ? <TextInput style={styles.walkInInput} placeholder="Walk-in customer name (optional)" placeholderTextColor={theme.colors.muted} value={walkInName} onChangeText={setWalkInName} /> : null}

    <View style={styles.fieldsRow}><TextInput style={styles.input} placeholder="Table" placeholderTextColor={theme.colors.muted} value={table} onChangeText={setTable} /></View>

    <View style={styles.loyaltyRow}>
      <Text style={styles.loyaltyLabel}>LOYALTY:</Text>
      {['Coffee', 'Meal'].map((type) => {
        const count = selectedCustomer ? Number(selectedCustomer[type.toLowerCase()] || 0) : 0;
        const eligible = Boolean(selectedCustomer && loyaltyEligibility[type]);
        return <TouchableOpacity key={type} disabled={!eligible} onPress={() => setProgram(program === type ? '' : type)} style={[styles.loyaltyButton, !eligible && styles.loyaltyDisabled, program === type && styles.loyaltyActive]}><Text style={[styles.loyaltyText, program === type && styles.loyaltyTextActive]}>{type} {selectedCustomer ? `${count}/10` : ''}</Text></TouchableOpacity>;
      })}
      {selectedCustomer && (Number(selectedCustomer.coffee || 0) >= 10 || Number(selectedCustomer.meal || 0) >= 10) ? <Text style={styles.rewardReady}>FREE REWARD READY</Text> : null}
    </View>
    {selectedCustomer ? <Text style={styles.loyaltyHint}>Loyalty buttons only activate when the order contains an item marked as eligible for that loyalty card.</Text> : null}

    <Text style={styles.sectionTitle}>{section?.name || 'Menu'}</Text>
    <View style={styles.grid}>{(section?.items || []).filter((item) => item.active).map((item) => <TouchableOpacity key={item.id} disabled={item.soldOut} onPress={() => add(item)} onLongPress={() => toggleSoldOut(item)} style={[styles.menuItem, landscape && styles.menuItemLandscape, item.soldOut && styles.soldOutOpacity]}><Text style={styles.itemName}>{item.id === 'weekday-special-r50' ? (settings.weekdaySpecial?.description || item.name) : item.name}</Text>{item.soldOut ? <Text style={styles.soldOut}>SOLD OUT</Text> : null}{(item.loyaltyPrograms || []).length ? <Text style={styles.itemLoyalty}>LOYALTY: {(item.loyaltyPrograms || []).join(' / ').toUpperCase()}</Text> : null}<Text style={styles.price}>{formatMoney(item.price)}</Text></TouchableOpacity>)}</View>
    <Text style={styles.hint}>Hold any menu button to mark it SOLD OUT / AVAILABLE.</Text>
  </>;

  const cartPane = <View style={styles.cart}>
    <Text style={styles.cartTitle}>Current Order</Text>
    {cart.map((item) => <View key={item.lineId} style={styles.cartLine}><Text style={styles.cartLineName}>{item.qty} x {item.name}</Text><Text style={styles.cartLinePrice}>{formatMoney(item.qty * item.unitPrice)}</Text>{(item.loyaltyPrograms || []).length ? <Text style={styles.cartLoyalty}>{(item.loyaltyPrograms || []).join(' / ')} loyalty eligible</Text> : null}<View style={styles.qtyRow}><TouchableOpacity onPress={() => setCart((current) => current.map((line) => line.lineId === item.lineId ? { ...line, qty: line.qty - 1 } : line).filter((line) => line.qty > 0))}><Text style={styles.qtyButton}> - </Text></TouchableOpacity><TouchableOpacity onPress={() => setCart((current) => current.map((line) => line.lineId === item.lineId ? { ...line, qty: line.qty + 1 } : line))}><Text style={styles.qtyButton}> + </Text></TouchableOpacity></View></View>)}
    <TextInput style={styles.note} placeholder="General order note" placeholderTextColor={theme.colors.muted} value={note} onChangeText={setNote} />
    <View style={styles.totalRow}><Text style={styles.totalText}>TOTAL</Text><Text style={styles.totalText}>{formatMoney(total)}</Text></View>
    <TouchableOpacity style={styles.printButton} onPress={saveOrder}><Text style={styles.printText}>SAVE & PRINT ORDER</Text></TouchableOpacity>
  </View>;

  return <View style={styles.root}>
    <ScrollView horizontal style={styles.categories} showsHorizontalScrollIndicator={false}>{sections.map((item) => <TouchableOpacity key={item.id} onPress={() => setSectionId(item.id)} style={[styles.category, section?.id === item.id && styles.categoryActive]}><Text style={styles.categoryText}>{item.name}</Text></TouchableOpacity>)}</ScrollView>
    {landscape ? <View style={styles.body}><ScrollView style={{ flex: 1.65 }} contentContainerStyle={styles.padding}>{menuPane}</ScrollView><ScrollView style={{ flex: 1 }} contentContainerStyle={styles.padding}>{cartPane}</ScrollView></View> : <ScrollView contentContainerStyle={styles.padding}>{menuPane}{cartPane}</ScrollView>}

    <Modal visible={specialOpen} transparent animationType="fade" onRequestClose={() => setSpecialOpen(false)}><View style={styles.backdrop}><View style={styles.modal}><Text style={styles.modalTitle}>Today's R50 Weekday Special</Text><TextInput autoFocus style={styles.specialInput} value={specialText} onChangeText={setSpecialText} placeholder="e.g. Chicken Curry & Rice" /><View style={styles.actions}><TouchableOpacity onPress={() => setSpecialOpen(false)} style={styles.cancel}><Text>CANCEL</Text></TouchableOpacity><TouchableOpacity onPress={saveSpecial} style={styles.save}><Text style={styles.saveText}>SAVE SPECIAL</Text></TouchableOpacity></View></View></View></Modal>

    <Modal visible={customerOpen} transparent animationType="fade" onRequestClose={() => setCustomerOpen(false)}><View style={styles.backdrop}><View style={[styles.modal, styles.customerModal]}><Text style={styles.modalTitle}>Find Customer</Text><TextInput autoFocus style={styles.specialInput} value={customerSearch} onChangeText={setCustomerSearch} placeholder="Search name or mobile number" placeholderTextColor={theme.colors.muted} /><ScrollView style={{ maxHeight: 380 }}>{filteredCustomers.map((customer) => <TouchableOpacity key={customer.id} style={styles.customerChoice} onPress={() => chooseCustomer(customer)}><View style={{ flex: 1 }}><Text style={styles.customerChoiceName}>{customerName(customer)}</Text><Text style={styles.customerChoicePhone}>{customer.phone}</Text></View><View style={styles.choiceLoyalty}><Text style={styles.choiceLoyaltyText}>Coffee {Number(customer.coffee || 0)}/10</Text><Text style={styles.choiceLoyaltyText}>Meal {Number(customer.meal || 0)}/10</Text></View></TouchableOpacity>)}{!filteredCustomers.length ? <Text style={styles.noCustomers}>No matching customer. Add them from the Customers tab first.</Text> : null}</ScrollView><TouchableOpacity onPress={() => setCustomerOpen(false)} style={styles.cancelFull}><Text style={styles.cancelFullText}>CLOSE</Text></TouchableOpacity></View></View></Modal>
  </View>;
}

const c = theme.colors;
const styles = StyleSheet.create({
  root:{flex:1},categories:{maxHeight:54,backgroundColor:c.bg},category:{padding:12,margin:5,borderRadius:20,backgroundColor:'#3A3029'},categoryActive:{backgroundColor:c.green},categoryText:{color:'#fff',fontWeight:'800'},body:{flex:1,flexDirection:'row',gap:10,padding:10},padding:{padding:10,paddingBottom:25},quickWrap:{backgroundColor:c.surface,padding:10,borderRadius:14,marginBottom:10},quickHeader:{flexDirection:'row',justifyContent:'space-between'},quickTitle:{fontWeight:'900',color:c.greenDark},specialEdit:{fontWeight:'900',color:c.red},quickItem:{padding:11,minWidth:130,marginRight:8,marginTop:8,borderRadius:12,backgroundColor:c.espresso},quickName:{color:'#fff',fontWeight:'900'},quickPrice:{color:'#fff',marginTop:3},quickLoyalty:{color:'#D8CFC6',fontSize:10,fontWeight:'800',marginTop:3},typeRow:{flexDirection:'row',gap:8},typeButton:{flex:1,padding:10,borderRadius:10,backgroundColor:c.surface},typeButtonActive:{backgroundColor:c.green},typeText:{textAlign:'center',fontWeight:'900',color:c.ink},typeTextActive:{color:'#fff'},customerBar:{flexDirection:'row',alignItems:'center',gap:8,backgroundColor:'#fff',padding:10,borderRadius:12,borderWidth:1,borderColor:c.line,marginTop:9},customerBarLabel:{fontSize:10,fontWeight:'900',color:c.muted},customerBarName:{fontWeight:'900',fontSize:16,color:c.ink},customerBarPhone:{color:c.greenDark,fontWeight:'700'},customerBarEmpty:{color:c.muted},findCustomer:{backgroundColor:c.green,paddingHorizontal:12,paddingVertical:10,borderRadius:9},findCustomerText:{color:'#fff',fontWeight:'900'},clearCustomer:{backgroundColor:c.soft,paddingHorizontal:9,paddingVertical:10,borderRadius:9},clearCustomerText:{color:c.red,fontWeight:'900'},walkInInput:{backgroundColor:'#fff',padding:10,borderRadius:10,borderWidth:1,borderColor:c.line,marginTop:8,color:c.ink},fieldsRow:{flexDirection:'row',gap:8,marginTop:8},input:{flex:1,backgroundColor:'#fff',padding:10,borderRadius:10,borderWidth:1,borderColor:c.line,color:c.ink},loyaltyRow:{flexDirection:'row',alignItems:'center',gap:8,marginVertical:9,flexWrap:'wrap'},loyaltyLabel:{fontWeight:'900',color:c.ink},loyaltyButton:{padding:9,borderRadius:10,backgroundColor:c.surface,borderWidth:1,borderColor:c.line},loyaltyDisabled:{opacity:.4},loyaltyActive:{backgroundColor:c.green,borderColor:c.green},loyaltyText:{fontWeight:'900',color:c.ink},loyaltyTextActive:{color:'#fff'},loyaltyHint:{fontSize:10,color:c.muted,marginTop:-4,marginBottom:5},rewardReady:{color:c.red,fontWeight:'900'},sectionTitle:{fontSize:21,fontWeight:'900',color:c.greenDark,marginVertical:8},grid:{flexDirection:'row',flexWrap:'wrap',gap:9},menuItem:{width:'48%',minHeight:90,padding:12,borderRadius:14,backgroundColor:c.surface,borderWidth:1,borderColor:c.line},menuItemLandscape:{width:'31.8%'},itemName:{fontWeight:'900',fontSize:15,color:c.ink},itemLoyalty:{fontSize:9,fontWeight:'900',color:c.greenDark,marginTop:5},price:{marginTop:'auto',fontWeight:'900',fontSize:16,color:c.red},soldOut:{color:c.red,fontWeight:'900'},soldOutOpacity:{opacity:.45},hint:{color:c.muted,fontSize:11,marginTop:8},cart:{backgroundColor:c.espresso,padding:13,borderRadius:16},cartTitle:{color:'#fff',fontSize:20,fontWeight:'900'},cartLine:{backgroundColor:'#fff',padding:10,borderRadius:10,marginTop:8},cartLineName:{fontWeight:'900',color:c.ink},cartLinePrice:{color:c.green,fontWeight:'900'},cartLoyalty:{fontSize:10,color:c.greenDark,fontWeight:'800',marginTop:3},qtyRow:{flexDirection:'row',gap:10,marginTop:6},qtyButton:{backgroundColor:c.red,color:'#fff',padding:5,borderRadius:5,fontWeight:'900'},note:{backgroundColor:'#fff',padding:10,borderRadius:10,marginTop:10,color:c.ink},totalRow:{flexDirection:'row',justifyContent:'space-between',marginVertical:12},totalText:{color:'#fff',fontSize:21,fontWeight:'900'},printButton:{backgroundColor:c.red,padding:14,borderRadius:12},printText:{color:'#fff',textAlign:'center',fontWeight:'900'},backdrop:{flex:1,backgroundColor:'rgba(0,0,0,.55)',justifyContent:'center',padding:20},modal:{backgroundColor:'#fff',padding:18,borderRadius:16,maxWidth:520,width:'100%',alignSelf:'center'},customerModal:{maxWidth:650},modalTitle:{fontSize:20,fontWeight:'900',color:c.ink},specialInput:{borderWidth:1,borderColor:c.line,padding:12,borderRadius:10,marginVertical:12,color:c.ink},actions:{flexDirection:'row',gap:10},cancel:{flex:1,padding:12,backgroundColor:c.soft,borderRadius:10,alignItems:'center'},save:{flex:1,padding:12,backgroundColor:c.green,borderRadius:10,alignItems:'center'},saveText:{color:'#fff',fontWeight:'900'},customerChoice:{flexDirection:'row',alignItems:'center',gap:10,padding:12,borderWidth:1,borderColor:c.line,borderRadius:11,marginBottom:8},customerChoiceName:{fontSize:16,fontWeight:'900',color:c.ink},customerChoicePhone:{color:c.greenDark,fontWeight:'700',marginTop:2},choiceLoyalty:{alignItems:'flex-end'},choiceLoyaltyText:{fontWeight:'800',color:c.muted,fontSize:12},noCustomers:{color:c.muted,textAlign:'center',padding:20},cancelFull:{backgroundColor:c.soft,padding:12,borderRadius:10,marginTop:8},cancelFullText:{textAlign:'center',fontWeight:'900',color:c.ink},
});