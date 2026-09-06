import React, { useMemo, useState } from 'react';
import { Alert, Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import { formatMoney, printOrderSlip } from '../utils/receiptPrinter';
import { localDateKey } from '../utils/reports';
import { cartEligibility, loyaltySummaryForOrder, resolveLoyaltyProgram } from '../utils/loyalty';
import { theme } from '../theme';

const uid = (prefix = 'id') => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
const customerName = (customer) => `${customer?.firstName || ''} ${customer?.surname || ''}`.trim() || customer?.name || 'Unnamed customer';

export function NewOrderScreen({ menu, onSaveMenu, settings, onSaveSettings, customers, onOrderSaved, getNextOrderNumber }) {
  const { width, height } = useWindowDimensions();
  const landscape = width >= 760;
  const compactTablet = landscape && (height <= 820 || width <= 1400);
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
  const [configItem, setConfigItem] = useState(null);
  const [configSelections, setConfigSelections] = useState({});
  const [configAddons, setConfigAddons] = useState([]);

  const section = sections.find((item) => item.id === sectionId) || sections[0];
  const allItems = menu.flatMap((sectionItem) => (sectionItem.items || []).map((item) => ({ ...item, sectionId: sectionItem.id })));
  const allItemsById = useMemo(() => new Map(allItems.map((item) => [item.id, item])), [menu]);
  const quickItems = (settings.quickItemIds || []).map((id) => allItemsById.get(id)).filter(Boolean);
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

  const loyaltyEligibility = useMemo(() => cartEligibility(cart), [cart]);
  const effectiveProgram = selectedCustomer ? resolveLoyaltyProgram(cart, program) : '';

  function closeConfig() {
    setConfigItem(null);
    setConfigSelections({});
    setConfigAddons([]);
  }

  function addToCart(item, selections = {}, addonIds = []) {
    const optionGroups = item.optionGroups || [];
    let unitPrice = Number(item.price || 0);
    let displayName = item.id === 'weekday-special-r50' ? (settings.weekdaySpecial?.description || item.name) : item.name;
    const selectedModifiers = [];

    optionGroups.forEach((group) => {
      const option = (group.options || []).find((entry) => entry.id === selections[group.id]);
      if (!option) return;
      if (group.type === 'size') {
        if (Number.isFinite(Number(option.finalPrice))) unitPrice = Number(option.finalPrice);
        else unitPrice += Number(option.priceDelta || 0);
        displayName = `${displayName} (${option.label})`;
      } else {
        selectedModifiers.push({ id: `${group.id}-${option.id}`, name: `${group.label.replace(/\?$/, '')}: ${option.label}`, price: Number(option.priceDelta || 0) });
      }
    });

    addonIds.forEach((addonId) => {
      const addon = allItemsById.get(addonId);
      if (addon) selectedModifiers.push({ id: addon.id, name: addon.name, price: Number(addon.price || 0) });
    });

    const signature = `${item.id}|${unitPrice}|${selectedModifiers.map((m) => `${m.id}:${m.price}`).sort().join('|')}`;
    setCart((current) => {
      const index = current.findIndex((line) => line.signature === signature && !line.note);
      if (index >= 0) return current.map((line, lineIndex) => lineIndex === index ? { ...line, qty: line.qty + 1 } : line);
      return [...current, {
        lineId: uid('line'),
        signature,
        id: item.id,
        name: displayName,
        qty: 1,
        unitPrice,
        selectedModifiers,
        loyaltyPrograms: [...(item.loyaltyPrograms || [])],
        note: '',
      }];
    });
  }

  function add(item) {
    if (item.soldOut) return;
    const needsConfig = (item.optionGroups || []).length > 0 || (item.modifiers || []).length > 0;
    if (!needsConfig) return addToCart(item);
    setConfigItem(item);
    setConfigSelections({});
    setConfigAddons([]);
  }

  function confirmConfiguredItem() {
    const missing = (configItem?.optionGroups || []).find((group) => group.required && !configSelections[group.id]);
    if (missing) return Alert.alert('Choose an option', missing.label);
    addToCart(configItem, configSelections, configAddons);
    closeConfig();
  }

  function toggleConfigAddon(id) {
    setConfigAddons((current) => current.includes(id) ? current.filter((value) => value !== id) : [...current, id]);
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
    setProgram('');
    setCustomerOpen(false);
    setCustomerSearch('');
  }

  function clearCustomer() {
    setSelectedCustomerId(null);
    setProgram('');
  }

  async function saveOrder() {
    if (!cart.length) return Alert.alert('Empty order', 'Add at least one item.');
    const loyalty = selectedCustomer ? loyaltySummaryForOrder(cart, effectiveProgram) : { program: null, value: 0 };
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
      loyaltyProgram: loyalty.program,
      loyaltyValue: loyalty.value,
      tableNumber: table.trim(),
      orderNote: note.trim(),
      items: cart,
      total,
    };

    const saveResult = await onOrderSaved(order);
    if (saveResult?.loyaltyReward) order.loyaltyReward = saveResult.loyaltyReward;
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
    <View style={[styles.quickWrap, compactTablet && styles.quickWrapCompact]}>
      <View style={styles.quickHeader}>
        <Text style={styles.quickTitle}>QUICK PICKS</Text>
        <TouchableOpacity onPress={() => setSpecialOpen(true)}><Text style={styles.specialEdit}>EDIT R50 SPECIAL</Text></TouchableOpacity>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        {quickItems.map((item) => <TouchableOpacity key={item.id} disabled={item.soldOut} onPress={() => add(item)} onLongPress={() => toggleSoldOut(item)} style={[styles.quickItem, compactTablet && styles.quickItemCompact, item.soldOut && styles.soldOutOpacity]}><Text style={styles.quickName}>{item.name}</Text><Text style={styles.quickPrice}>{formatMoney(item.price)}</Text></TouchableOpacity>)}
      </ScrollView>
    </View>

    <View style={styles.topControls}>
      <View style={styles.typeRow}>{['Takeaway', 'Sit-down'].map((type) => <TouchableOpacity key={type} onPress={() => setOrderType(type)} style={[styles.typeButton, orderType === type && styles.typeButtonActive]}><Text style={[styles.typeText, orderType === type && styles.typeTextActive]}>{type}</Text></TouchableOpacity>)}</View>
      <TextInput style={styles.tableInput} placeholder="Table" placeholderTextColor={theme.colors.muted} value={table} onChangeText={setTable} />
    </View>

    <View style={[styles.customerBar, compactTablet && styles.customerBarCompact]}>
      <View style={{ flex: 1 }}>
        <Text style={styles.customerBarLabel}>CUSTOMER / LOYALTY</Text>
        {selectedCustomer ? <><Text style={styles.customerBarName}>{customerName(selectedCustomer)}</Text><Text style={styles.customerBarPhone}>{selectedCustomer.phone}</Text></> : <Text style={styles.customerBarEmpty}>No loyalty customer selected</Text>}
      </View>
      {selectedCustomer ? <TouchableOpacity style={styles.clearCustomer} onPress={clearCustomer}><Text style={styles.clearCustomerText}>CLEAR</Text></TouchableOpacity> : null}
      <TouchableOpacity style={styles.findCustomer} onPress={() => setCustomerOpen(true)}><Text style={styles.findCustomerText}>FIND</Text></TouchableOpacity>
    </View>

    {!selectedCustomer ? <TextInput style={styles.walkInInput} placeholder="Walk-in customer name (optional)" placeholderTextColor={theme.colors.muted} value={walkInName} onChangeText={setWalkInName} /> : null}

    {selectedCustomer ? <View style={styles.loyaltyPanel}>
      <Text style={styles.loyaltyLabel}>ONE LOYALTY POINT PER ORDER</Text>
      <View style={styles.loyaltyRow}>
        {['Coffee', 'Meal'].map((type) => {
          const count = Number(selectedCustomer[type.toLowerCase()] || 0);
          const eligible = loyaltyEligibility[type];
          const active = effectiveProgram === type;
          return <TouchableOpacity key={type} disabled={!eligible} onPress={() => setProgram(type)} style={[styles.loyaltyButton, !eligible && styles.loyaltyDisabled, active && styles.loyaltyActive]}><Text style={[styles.loyaltyText, active && styles.loyaltyTextActive]}>{type} {count}/10</Text></TouchableOpacity>;
        })}
        {effectiveProgram ? <Text style={styles.autoPoint}>This order → {effectiveProgram} point</Text> : <Text style={styles.noPoint}>No qualifying loyalty item</Text>}
      </View>
      {loyaltyEligibility.Coffee && loyaltyEligibility.Meal ? <Text style={styles.loyaltyHint}>Mixed order: Meal is selected automatically. Tap Coffee if this visit should count toward Coffee instead.</Text> : null}
    </View> : null}

    <Text style={styles.sectionTitle}>{section?.name || 'Menu'}</Text>
    <View style={styles.grid}>{(section?.items || []).filter((item) => item.active).map((item) => <TouchableOpacity key={item.id} disabled={item.soldOut} onPress={() => add(item)} onLongPress={() => toggleSoldOut(item)} style={[styles.menuItem, landscape && styles.menuItemLandscape, compactTablet && styles.menuItemCompact, item.soldOut && styles.soldOutOpacity]}><Text style={[styles.itemName, compactTablet && styles.itemNameCompact]}>{item.id === 'weekday-special-r50' ? (settings.weekdaySpecial?.description || item.name) : item.name}</Text>{item.description ? <Text numberOfLines={2} style={styles.itemDescription}>{item.description}</Text> : null}{item.soldOut ? <Text style={styles.soldOut}>SOLD OUT</Text> : null}<Text style={styles.price}>{formatMoney(item.price)}</Text></TouchableOpacity>)}</View>
    <Text style={styles.hint}>Tap an item to add it. Hold to mark SOLD OUT / AVAILABLE.</Text>
  </>;

  const cartPane = <View style={[styles.cart, compactTablet && styles.cartCompact]}>
    <Text style={styles.cartTitle}>Current Order</Text>
    {!cart.length ? <Text style={styles.emptyCart}>No items yet</Text> : null}
    {cart.map((item) => <View key={item.lineId} style={styles.cartLine}>
      <View style={styles.cartLineTop}><Text style={styles.cartLineName}>{item.qty} x {item.name}</Text><Text style={styles.cartLinePrice}>{formatMoney(item.qty * (Number(item.unitPrice || 0) + (item.selectedModifiers || []).reduce((s, m) => s + Number(m.price || 0), 0)))}</Text></View>
      {(item.selectedModifiers || []).map((modifier) => <Text key={modifier.id} style={styles.cartModifier}>• {modifier.name}{Number(modifier.price || 0) ? ` +${formatMoney(modifier.price)}` : ''}</Text>)}
      <View style={styles.qtyRow}><TouchableOpacity onPress={() => setCart((current) => current.map((line) => line.lineId === item.lineId ? { ...line, qty: line.qty - 1 } : line).filter((line) => line.qty > 0))}><Text style={styles.qtyButton}>−</Text></TouchableOpacity><TouchableOpacity onPress={() => setCart((current) => current.map((line) => line.lineId === item.lineId ? { ...line, qty: line.qty + 1 } : line))}><Text style={styles.qtyButton}>+</Text></TouchableOpacity></View>
    </View>)}
    <TextInput style={styles.note} placeholder="General order note" placeholderTextColor={theme.colors.muted} value={note} onChangeText={setNote} />
    <View style={styles.totalRow}><Text style={styles.totalText}>TOTAL</Text><Text style={styles.totalText}>{formatMoney(total)}</Text></View>
    <TouchableOpacity style={styles.printButton} onPress={saveOrder}><Text style={styles.printText}>SAVE & PRINT ORDER</Text></TouchableOpacity>
  </View>;

  return <View style={styles.root}>
    <ScrollView horizontal style={[styles.categories, compactTablet && styles.categoriesCompact]} showsHorizontalScrollIndicator={false}>{sections.map((item) => <TouchableOpacity key={item.id} onPress={() => setSectionId(item.id)} style={[styles.category, compactTablet && styles.categoryCompact, section?.id === item.id && styles.categoryActive]}><Text style={styles.categoryText}>{item.name}</Text></TouchableOpacity>)}</ScrollView>
    {landscape ? <View style={[styles.body, compactTablet && styles.bodyCompact]}><ScrollView style={{ flex: 1.9 }} contentContainerStyle={[styles.padding, compactTablet && styles.paddingCompact]}>{menuPane}</ScrollView><ScrollView style={{ flex: 1 }} contentContainerStyle={[styles.padding, compactTablet && styles.paddingCompact]}>{cartPane}</ScrollView></View> : <ScrollView contentContainerStyle={styles.padding}>{menuPane}{cartPane}</ScrollView>}

    <Modal visible={Boolean(configItem)} transparent animationType="fade" onRequestClose={closeConfig}><View style={styles.backdrop}><View style={[styles.modal, styles.configModal]}><ScrollView>
      <Text style={styles.modalTitle}>{configItem?.name}</Text>
      {(configItem?.optionGroups || []).map((group) => <View key={group.id} style={styles.optionGroup}><Text style={styles.optionTitle}>{group.label}</Text><View style={styles.optionWrap}>{(group.options || []).map((option) => { const active = configSelections[group.id] === option.id; const shownPrice = Number.isFinite(Number(option.finalPrice)) ? Number(option.finalPrice) : Number(configItem.price || 0) + Number(option.priceDelta || 0); return <TouchableOpacity key={option.id} onPress={() => setConfigSelections((current) => ({ ...current, [group.id]: option.id }))} style={[styles.optionButton, active && styles.optionButtonActive]}><Text style={[styles.optionText, active && styles.optionTextActive]}>{option.label}{group.type === 'size' ? `  ${formatMoney(shownPrice)}` : ''}</Text></TouchableOpacity>; })}</View></View>)}
      {(configItem?.modifiers || []).length ? <View style={styles.optionGroup}><Text style={styles.optionTitle}>Extras</Text><View style={styles.optionWrap}>{configItem.modifiers.map((id) => { const addon = allItemsById.get(id); if (!addon) return null; const active = configAddons.includes(id); return <TouchableOpacity key={id} onPress={() => toggleConfigAddon(id)} style={[styles.optionButton, active && styles.optionButtonActive]}><Text style={[styles.optionText, active && styles.optionTextActive]}>{addon.name} +{formatMoney(addon.price)}</Text></TouchableOpacity>; })}</View></View> : null}
      <View style={styles.actions}><TouchableOpacity onPress={closeConfig} style={styles.cancel}><Text style={styles.cancelText}>CANCEL</Text></TouchableOpacity><TouchableOpacity onPress={confirmConfiguredItem} style={styles.save}><Text style={styles.saveText}>ADD TO ORDER</Text></TouchableOpacity></View>
    </ScrollView></View></View></Modal>

    <Modal visible={specialOpen} transparent animationType="fade" onRequestClose={() => setSpecialOpen(false)}><View style={styles.backdrop}><View style={styles.modal}><Text style={styles.modalTitle}>Today's R50 Weekday Special</Text><TextInput autoFocus style={styles.specialInput} value={specialText} onChangeText={setSpecialText} placeholder="e.g. Chicken Curry & Rice" /><View style={styles.actions}><TouchableOpacity onPress={() => setSpecialOpen(false)} style={styles.cancel}><Text style={styles.cancelText}>CANCEL</Text></TouchableOpacity><TouchableOpacity onPress={saveSpecial} style={styles.save}><Text style={styles.saveText}>SAVE SPECIAL</Text></TouchableOpacity></View></View></View></Modal>

    <Modal visible={customerOpen} transparent animationType="fade" onRequestClose={() => setCustomerOpen(false)}><View style={styles.backdrop}><View style={[styles.modal, styles.customerModal]}><Text style={styles.modalTitle}>Find Customer</Text><TextInput autoFocus style={styles.specialInput} value={customerSearch} onChangeText={setCustomerSearch} placeholder="Search name or mobile number" placeholderTextColor={theme.colors.muted} /><ScrollView style={{ maxHeight: 380 }}>{filteredCustomers.map((customer) => <TouchableOpacity key={customer.id} style={styles.customerChoice} onPress={() => chooseCustomer(customer)}><View style={{ flex: 1 }}><Text style={styles.customerChoiceName}>{customerName(customer)}</Text><Text style={styles.customerChoicePhone}>{customer.phone}</Text></View><View style={styles.choiceLoyalty}><Text style={styles.choiceLoyaltyText}>Coffee {Number(customer.coffee || 0)}/10</Text><Text style={styles.choiceLoyaltyText}>Meal {Number(customer.meal || 0)}/10</Text></View></TouchableOpacity>)}{!filteredCustomers.length ? <Text style={styles.noCustomers}>No matching customer. Add them from the Customers tab first.</Text> : null}</ScrollView><TouchableOpacity onPress={() => setCustomerOpen(false)} style={styles.cancelFull}><Text style={styles.cancelFullText}>CLOSE</Text></TouchableOpacity></View></View></Modal>
  </View>;
}

const c = theme.colors;
const styles = StyleSheet.create({
  root:{flex:1},categories:{maxHeight:52,backgroundColor:c.bg},categoriesCompact:{maxHeight:44},category:{paddingHorizontal:13,paddingVertical:9,margin:5,borderRadius:18,backgroundColor:'#3A3029'},categoryCompact:{paddingVertical:6,margin:4},categoryActive:{backgroundColor:c.green},categoryText:{color:'#fff',fontWeight:'800',fontSize:12},body:{flex:1,flexDirection:'row',gap:8,padding:8},bodyCompact:{gap:5,padding:5},padding:{padding:8,paddingBottom:18},paddingCompact:{padding:5,paddingBottom:12},quickWrap:{backgroundColor:c.surface,padding:9,borderRadius:12,marginBottom:8},quickWrapCompact:{padding:6,marginBottom:5},quickHeader:{flexDirection:'row',justifyContent:'space-between',alignItems:'center'},quickTitle:{fontWeight:'900',color:c.greenDark,fontSize:12},specialEdit:{fontWeight:'900',color:c.red,fontSize:11},quickItem:{padding:9,minWidth:120,marginRight:7,marginTop:6,borderRadius:10,backgroundColor:c.espresso},quickItemCompact:{padding:6,minWidth:105,marginTop:4},quickName:{color:'#fff',fontWeight:'900',fontSize:12},quickPrice:{color:'#fff',marginTop:2,fontSize:12},topControls:{flexDirection:'row',gap:6,marginBottom:6},typeRow:{flex:1,flexDirection:'row',gap:5},typeButton:{flex:1,paddingVertical:8,borderRadius:10,backgroundColor:c.soft,alignItems:'center'},typeButtonActive:{backgroundColor:c.green},typeText:{fontWeight:'900',color:c.ink,fontSize:12},typeTextActive:{color:'#fff'},tableInput:{width:95,backgroundColor:'#fff',borderWidth:1,borderColor:c.line,borderRadius:10,paddingHorizontal:10,color:c.ink},customerBar:{flexDirection:'row',alignItems:'center',gap:7,backgroundColor:'#fff',borderWidth:1,borderColor:c.line,borderRadius:12,padding:9,marginBottom:6},customerBarCompact:{padding:6},customerBarLabel:{fontSize:9,fontWeight:'900',color:c.muted},customerBarName:{fontSize:15,fontWeight:'900',color:c.ink},customerBarPhone:{fontSize:10,color:c.greenDark,fontWeight:'700'},customerBarEmpty:{color:c.muted,fontSize:11},clearCustomer:{padding:7,borderRadius:8,backgroundColor:c.soft},clearCustomerText:{color:c.red,fontWeight:'900',fontSize:10},findCustomer:{paddingHorizontal:12,paddingVertical:9,borderRadius:9,backgroundColor:c.green},findCustomerText:{color:'#fff',fontWeight:'900',fontSize:11},walkInInput:{backgroundColor:'#fff',borderWidth:1,borderColor:c.line,borderRadius:10,padding:9,marginBottom:6,color:c.ink},loyaltyPanel:{backgroundColor:'#F0F6F2',borderWidth:1,borderColor:'#BFD1C8',borderRadius:11,padding:7,marginBottom:7},loyaltyLabel:{fontSize:9,fontWeight:'900',color:c.greenDark,marginBottom:5},loyaltyRow:{flexDirection:'row',alignItems:'center',gap:5,flexWrap:'wrap'},loyaltyButton:{paddingHorizontal:10,paddingVertical:7,borderRadius:9,backgroundColor:c.soft},loyaltyActive:{backgroundColor:c.green},loyaltyDisabled:{opacity:.35},loyaltyText:{fontSize:11,fontWeight:'900',color:c.ink},loyaltyTextActive:{color:'#fff'},autoPoint:{fontSize:10,fontWeight:'900',color:c.greenDark},noPoint:{fontSize:10,color:c.muted},loyaltyHint:{fontSize:9,color:c.muted,marginTop:5},sectionTitle:{fontSize:17,fontWeight:'900',color:c.ink,marginVertical:5},grid:{flexDirection:'row',flexWrap:'wrap',gap:6},menuItem:{backgroundColor:'#fff',borderWidth:1,borderColor:c.line,borderRadius:12,padding:10,minHeight:92,justifyContent:'space-between'},menuItemLandscape:{width:'32%'},menuItemCompact:{minHeight:78,padding:7},itemName:{fontSize:14,fontWeight:'900',color:c.ink},itemNameCompact:{fontSize:12},itemDescription:{fontSize:9,color:c.muted,marginTop:2},price:{fontSize:15,fontWeight:'900',color:c.red,marginTop:5},soldOut:{fontSize:10,fontWeight:'900',color:c.red},soldOutOpacity:{opacity:.45},hint:{fontSize:9,color:c.muted,marginTop:6},cart:{backgroundColor:'#fff',borderRadius:13,padding:10,borderWidth:1,borderColor:c.line},cartCompact:{padding:7},cartTitle:{fontSize:19,fontWeight:'900',color:c.ink,marginBottom:6},emptyCart:{color:c.muted,textAlign:'center',paddingVertical:18},cartLine:{borderBottomWidth:1,borderBottomColor:c.line,paddingVertical:6},cartLineTop:{flexDirection:'row',gap:8},cartLineName:{flex:1,fontWeight:'900',fontSize:12,color:c.ink},cartLinePrice:{fontWeight:'900',fontSize:12,color:c.red},cartModifier:{fontSize:10,color:c.muted,marginTop:2},qtyRow:{flexDirection:'row',gap:5,marginTop:4},qtyButton:{backgroundColor:c.soft,color:c.ink,fontWeight:'900',fontSize:18,paddingHorizontal:12,paddingVertical:2,borderRadius:7,overflow:'hidden'},note:{backgroundColor:c.bg,borderWidth:1,borderColor:c.line,borderRadius:9,padding:8,marginTop:8,color:c.ink},totalRow:{flexDirection:'row',justifyContent:'space-between',marginTop:8,paddingVertical:7,borderTopWidth:2,borderTopColor:c.espresso},totalText:{fontSize:19,fontWeight:'900',color:c.ink},printButton:{backgroundColor:c.red,borderRadius:10,padding:12,marginTop:5},printText:{color:'#fff',fontWeight:'900',textAlign:'center'},backdrop:{flex:1,backgroundColor:'rgba(0,0,0,.55)',justifyContent:'center',padding:16},modal:{backgroundColor:'#fff',borderRadius:16,padding:16,width:'100%',maxWidth:620,alignSelf:'center'},configModal:{maxHeight:'90%'},customerModal:{maxWidth:720},modalTitle:{fontSize:22,fontWeight:'900',color:c.ink,marginBottom:10},optionGroup:{marginBottom:13},optionTitle:{fontSize:15,fontWeight:'900',color:c.ink,marginBottom:7},optionWrap:{flexDirection:'row',flexWrap:'wrap',gap:7},optionButton:{borderWidth:1,borderColor:c.line,borderRadius:10,paddingHorizontal:14,paddingVertical:10,backgroundColor:c.bg},optionButtonActive:{backgroundColor:c.green,borderColor:c.green},optionText:{fontWeight:'900',color:c.ink},optionTextActive:{color:'#fff'},specialInput:{borderWidth:1,borderColor:c.line,borderRadius:10,padding:11,color:c.ink},actions:{flexDirection:'row',gap:8,marginTop:12},cancel:{flex:1,backgroundColor:c.soft,padding:12,borderRadius:10},cancelText:{textAlign:'center',fontWeight:'900',color:c.ink},save:{flex:1,backgroundColor:c.green,padding:12,borderRadius:10},saveText:{textAlign:'center',fontWeight:'900',color:'#fff'},customerChoice:{flexDirection:'row',padding:10,borderBottomWidth:1,borderBottomColor:c.line},customerChoiceName:{fontWeight:'900',color:c.ink},customerChoicePhone:{color:c.muted,fontSize:11},choiceLoyalty:{alignItems:'flex-end'},choiceLoyaltyText:{fontSize:10,fontWeight:'800',color:c.greenDark},noCustomers:{color:c.muted,textAlign:'center',padding:20},cancelFull:{backgroundColor:c.soft,padding:11,borderRadius:10,marginTop:10},cancelFullText:{textAlign:'center',fontWeight:'900',color:c.ink},
});
