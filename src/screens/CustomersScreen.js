import React, { useMemo, useState } from 'react';
import { Alert, Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { theme } from '../theme';

const uid = () => `customer-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

function displayName(customer) {
  const full = `${customer.firstName || ''} ${customer.surname || ''}`.trim();
  return String(customer.name || '').trim() || full || 'Unnamed customer';
}

function normalizeCardNumber(value) {
  return String(value || '').trim();
}

export function CustomersScreen({ customers, onSaveCustomers }) {
  const [query, setQuery] = useState('');
  const [editing, setEditing] = useState(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return [...customers]
      .filter((customer) => {
        if (!q) return true;
        return displayName(customer).toLowerCase().includes(q)
          || String(customer.cardNumber || '').toLowerCase().includes(q);
      })
      .sort((a, b) => displayName(a).localeCompare(displayName(b)));
  }, [customers, query]);

  function openNew() {
    setEditing({
      isNew: true,
      id: uid(),
      name: '',
      cardNumber: '',
      coffee: 0,
      meal: 0,
      totalVisits: 0,
      lastVisitAt: null,
      notes: '',
      active: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }

  function openEdit(customer) {
    setEditing({
      ...customer,
      name: displayName(customer) === 'Unnamed customer' ? '' : displayName(customer),
      cardNumber: customer.cardNumber || '',
      isNew: false,
    });
  }

  async function saveCustomer() {
    const name = String(editing?.name || '').trim();
    const cardNumber = normalizeCardNumber(editing?.cardNumber);

    if (!name) return Alert.alert('Customer name required', 'Enter the customer name.');
    if (!cardNumber) return Alert.alert('Card number required', 'Enter or scan the customer loyalty card number.');

    const duplicate = customers.find((c) => normalizeCardNumber(c.cardNumber) === cardNumber && c.id !== editing.id);
    if (duplicate) return Alert.alert('Card number already used', `That card belongs to ${displayName(duplicate)}.`);

    const clean = {
      ...editing,
      name,
      firstName: '',
      surname: '',
      cardNumber,
      phone: '',
      coffee: Math.max(0, Number(editing?.coffee || 0)),
      meal: Math.max(0, Number(editing?.meal || 0)),
      totalVisits: Math.max(0, Number(editing?.totalVisits || 0)),
      notes: String(editing?.notes || '').trim(),
      active: editing?.active !== false,
      createdAt: editing?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    delete clean.isNew;

    const next = editing.isNew ? [...customers, clean] : customers.map((c) => c.id === clean.id ? clean : c);
    await onSaveCustomers(next);
    setEditing(null);
  }

  function changeStamp(field, delta) {
    setEditing((current) => ({ ...current, [field]: Math.max(0, Number(current?.[field] || 0) + delta) }));
  }

  function resetStamp(field) {
    Alert.alert(`Reset ${field} loyalty?`, 'This will set the counter back to 0.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Reset', style: 'destructive', onPress: () => setEditing((current) => ({ ...current, [field]: 0 })) },
    ]);
  }

  function archiveCustomer(customer) {
    const nextState = customer.active === false;
    Alert.alert(nextState ? 'Reactivate customer?' : 'Archive customer?', displayName(customer), [
      { text: 'Cancel', style: 'cancel' },
      { text: nextState ? 'Reactivate' : 'Archive', onPress: () => onSaveCustomers(customers.map((c) => c.id === customer.id ? { ...c, active: nextState, updatedAt: new Date().toISOString() } : c)) },
    ]);
  }

  return (
    <View style={styles.root}>
      <View style={styles.topRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Customers</Text>
          <Text style={styles.subtitle}>{customers.filter((c) => c.active !== false).length} active customers · Coffee and meal loyalty stored on this tablet.</Text>
        </View>
        <TouchableOpacity style={styles.addButton} onPress={openNew}><Text style={styles.addText}>+ ADD CUSTOMER</Text></TouchableOpacity>
      </View>

      <TextInput
        style={styles.search}
        placeholder="Search by customer name or card number"
        placeholderTextColor={theme.colors.muted}
        value={query}
        onChangeText={setQuery}
      />

      <ScrollView contentContainerStyle={styles.list}>
        {!filtered.length ? <Text style={styles.empty}>No customers found.</Text> : null}
        {filtered.map((customer) => (
          <TouchableOpacity key={customer.id} style={[styles.card, customer.active === false && styles.archived]} onPress={() => openEdit(customer)}>
            <View style={styles.cardMain}>
              <Text style={styles.name}>{displayName(customer)}</Text>
              <Text style={styles.cardNumber}>Card: {customer.cardNumber || 'Not assigned'}</Text>
              <Text style={styles.meta}>{customer.totalVisits || 0} visits{customer.lastVisitAt ? ` · Last ${new Date(customer.lastVisitAt).toLocaleDateString('en-ZA')}` : ''}</Text>
              {customer.notes ? <Text style={styles.notes}>{customer.notes}</Text> : null}
            </View>
            <View style={styles.loyaltyBlock}>
              <View style={styles.badge}><Text style={styles.badgeLabel}>COFFEE</Text><Text style={styles.badgeValue}>{Number(customer.coffee || 0)}/10</Text></View>
              <View style={styles.badge}><Text style={styles.badgeLabel}>MEAL</Text><Text style={styles.badgeValue}>{Number(customer.meal || 0)}/10</Text></View>
              {customer.active === false ? <Text style={styles.inactive}>ARCHIVED</Text> : null}
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <Modal visible={Boolean(editing)} transparent animationType="slide" onRequestClose={() => setEditing(null)}>
        <View style={styles.backdrop}>
          <View style={styles.modal}>
            <ScrollView>
              <Text style={styles.modalTitle}>{editing?.isNew ? 'Add Customer' : 'Edit Customer'}</Text>

              <View style={styles.field}>
                <Text style={styles.label}>Customer name</Text>
                <TextInput
                  style={styles.input}
                  value={editing?.name || ''}
                  onChangeText={(v) => setEditing((x) => ({ ...x, name: v }))}
                  placeholder="Customer name"
                  placeholderTextColor={theme.colors.muted}
                />
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>Card number</Text>
                <TextInput
                  style={styles.input}
                  value={editing?.cardNumber || ''}
                  onChangeText={(v) => setEditing((x) => ({ ...x, cardNumber: v }))}
                  placeholder="Scan or enter loyalty card number"
                  placeholderTextColor={theme.colors.muted}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>

              <Text style={styles.loyaltyTitle}>Loyalty Counters</Text>
              {['coffee', 'meal'].map((field) => (
                <View key={field} style={styles.counterRow}>
                  <Text style={styles.counterLabel}>{field.toUpperCase()}</Text>
                  <TouchableOpacity style={styles.counterButton} onPress={() => changeStamp(field, -1)}><Text style={styles.counterButtonText}>−</Text></TouchableOpacity>
                  <Text style={styles.counterValue}>{Number(editing?.[field] || 0)}/10</Text>
                  <TouchableOpacity style={styles.counterButton} onPress={() => changeStamp(field, 1)}><Text style={styles.counterButtonText}>+</Text></TouchableOpacity>
                  <TouchableOpacity style={styles.resetButton} onPress={() => resetStamp(field)}><Text style={styles.resetText}>RESET</Text></TouchableOpacity>
                </View>
              ))}

              {!editing?.isNew ? <TouchableOpacity style={styles.archiveButton} onPress={() => { archiveCustomer(editing); setEditing(null); }}><Text style={styles.archiveText}>{editing?.active === false ? 'REACTIVATE CUSTOMER' : 'ARCHIVE CUSTOMER'}</Text></TouchableOpacity> : null}
              <View style={styles.actions}>
                <TouchableOpacity style={styles.cancelButton} onPress={() => setEditing(null)}><Text style={styles.cancelText}>CANCEL</Text></TouchableOpacity>
                <TouchableOpacity style={styles.saveButton} onPress={saveCustomer}><Text style={styles.saveText}>SAVE CUSTOMER</Text></TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const c = theme.colors;
const styles = StyleSheet.create({
  root:{flex:1,padding:14,backgroundColor:c.bg},topRow:{flexDirection:'row',alignItems:'center',gap:12},title:{fontSize:25,fontWeight:'900',color:c.ink},subtitle:{color:c.muted,marginTop:3},addButton:{backgroundColor:c.green,borderRadius:12,paddingHorizontal:16,paddingVertical:12},addText:{color:'#fff',fontWeight:'900'},search:{backgroundColor:'#fff',borderWidth:1,borderColor:c.line,borderRadius:12,padding:12,marginTop:13,color:c.ink},list:{paddingVertical:12,paddingBottom:30},empty:{color:c.muted,textAlign:'center',padding:30},card:{backgroundColor:'#fff',borderWidth:1,borderColor:c.line,borderRadius:15,padding:13,marginBottom:10,flexDirection:'row',gap:12},archived:{opacity:.55},cardMain:{flex:1},name:{fontSize:18,fontWeight:'900',color:c.ink},cardNumber:{color:c.greenDark,fontWeight:'800',marginTop:2},meta:{color:c.muted,marginTop:4},notes:{color:c.ink,marginTop:5,fontStyle:'italic'},loyaltyBlock:{flexDirection:'row',gap:8,alignItems:'center'},badge:{backgroundColor:c.espresso,borderRadius:11,paddingHorizontal:10,paddingVertical:8,minWidth:72,alignItems:'center'},badgeLabel:{color:'#D8CFC6',fontSize:10,fontWeight:'900'},badgeValue:{color:'#fff',fontSize:16,fontWeight:'900'},inactive:{color:c.red,fontSize:10,fontWeight:'900'},backdrop:{flex:1,backgroundColor:'rgba(0,0,0,.55)',justifyContent:'center',padding:20},modal:{backgroundColor:'#fff',borderRadius:18,padding:18,maxWidth:650,width:'100%',maxHeight:'92%',alignSelf:'center'},modalTitle:{fontSize:23,fontWeight:'900',color:c.ink,marginBottom:12},field:{flex:1,marginBottom:10},label:{fontWeight:'900',color:c.ink,marginBottom:5},input:{borderWidth:1,borderColor:c.line,borderRadius:10,padding:11,color:c.ink,backgroundColor:c.bg},loyaltyTitle:{fontSize:17,fontWeight:'900',color:c.greenDark,marginTop:5,marginBottom:8},counterRow:{flexDirection:'row',alignItems:'center',gap:9,backgroundColor:c.bg,padding:10,borderRadius:11,marginBottom:8},counterLabel:{fontWeight:'900',width:62,color:c.ink},counterButton:{width:38,height:38,borderRadius:9,backgroundColor:c.green,alignItems:'center',justifyContent:'center'},counterButtonText:{color:'#fff',fontSize:22,fontWeight:'900'},counterValue:{fontSize:18,fontWeight:'900',minWidth:55,textAlign:'center',color:c.ink},resetButton:{marginLeft:'auto',backgroundColor:c.soft,paddingHorizontal:11,paddingVertical:9,borderRadius:9},resetText:{fontWeight:'900',color:c.red},archiveButton:{backgroundColor:c.soft,borderRadius:10,padding:11,marginTop:4},archiveText:{textAlign:'center',fontWeight:'900',color:c.red},actions:{flexDirection:'row',gap:10,marginTop:12},cancelButton:{flex:1,backgroundColor:c.soft,padding:13,borderRadius:11},cancelText:{textAlign:'center',fontWeight:'900',color:c.ink},saveButton:{flex:1,backgroundColor:c.red,padding:13,borderRadius:11},saveText:{textAlign:'center',fontWeight:'900',color:'#fff'},
});
