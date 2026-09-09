import React, { useState } from 'react';
import { Alert, Modal, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { theme } from '../theme';

const LOOKUP_URL = 'https://iymwzyxlvtyidebxdzyw.supabase.co/functions/v1/lookup-loyalty-customer';
const POS_SYNC_KEY = process.env.EXPO_PUBLIC_POS_SYNC_KEY || '';

export function LoyaltyCardScanner({ visible, onClose, onCustomer }) {
  const [permission, requestPermission] = useCameraPermissions();
  const [locked, setLocked] = useState(false);
  const [manual, setManual] = useState('');

  async function lookup(raw) {
    const cardNumber = String(raw || '').trim().replace(/\s+/g, '');
    if (!cardNumber || locked) return;
    setLocked(true);
    try {
      const response = await fetch(LOOKUP_URL, { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-pos-key': POS_SYNC_KEY }, body: JSON.stringify({ cardNumber }) });
      const result = await response.json();
      if (response.ok && result?.found && result.customer) {
        onCustomer(result.customer);
        setManual('');
        onClose();
      } else {
        Alert.alert('Card not found', `No loyalty customer was found for card ${cardNumber}.`);
      }
    } catch {
      Alert.alert('Lookup failed', 'Could not reach the loyalty customer database. Check the internet connection and try again.');
    } finally {
      setTimeout(() => setLocked(false), 1000);
    }
  }

  if (!visible) return null;
  return <Modal visible transparent animationType="fade" onRequestClose={onClose}><View style={styles.backdrop}><View style={styles.modal}>
    <Text style={styles.title}>Scan Loyalty Card</Text>
    <Text style={styles.help}>Hold the barcode in front of the SELFIE CAMERA.</Text>
    {!permission?.granted ? <View style={styles.permission}><Text style={styles.permissionText}>Camera permission is required to scan loyalty cards.</Text><TouchableOpacity style={styles.primary} onPress={requestPermission}><Text style={styles.primaryText}>ALLOW CAMERA</Text></TouchableOpacity></View> : <View style={styles.cameraWrap}><CameraView style={styles.camera} facing="front" barcodeScannerSettings={{ barcodeTypes: ['code128','code39','ean13','ean8','upc_a','upc_e','itf14','codabar'] }} onBarcodeScanned={locked ? undefined : ({ data }) => lookup(data)} /><View pointerEvents="none" style={styles.target} /></View>}
    <View style={styles.manualRow}><TextInput style={styles.input} value={manual} onChangeText={setManual} keyboardType="number-pad" placeholder="Enter card number manually" placeholderTextColor={theme.colors.muted} /><TouchableOpacity style={styles.primary} onPress={() => lookup(manual)}><Text style={styles.primaryText}>FIND CARD</Text></TouchableOpacity></View>
    <TouchableOpacity style={styles.close} onPress={onClose}><Text style={styles.closeText}>CLOSE</Text></TouchableOpacity>
  </View></View></Modal>;
}

const c=theme.colors;
const styles=StyleSheet.create({backdrop:{flex:1,backgroundColor:'rgba(0,0,0,.72)',justifyContent:'center',padding:18},modal:{width:'100%',maxWidth:720,alignSelf:'center',backgroundColor:'#fff',borderRadius:18,padding:16},title:{fontSize:24,fontWeight:'900',color:c.ink},help:{color:c.muted,fontWeight:'800',marginTop:4,marginBottom:10},cameraWrap:{height:310,borderRadius:14,overflow:'hidden',backgroundColor:'#111'},camera:{flex:1},target:{position:'absolute',left:'12%',right:'12%',top:'36%',height:82,borderWidth:3,borderColor:'#fff',borderRadius:10},permission:{height:240,alignItems:'center',justifyContent:'center',gap:14,backgroundColor:c.bg,borderRadius:14},permissionText:{color:c.ink,fontWeight:'700'},manualRow:{flexDirection:'row',gap:8,marginTop:12},input:{flex:1,borderWidth:1,borderColor:c.line,borderRadius:10,paddingHorizontal:12,color:c.ink,backgroundColor:c.bg},primary:{backgroundColor:c.green,borderRadius:10,paddingHorizontal:16,paddingVertical:12,justifyContent:'center'},primaryText:{color:'#fff',fontWeight:'900'},close:{backgroundColor:c.soft,borderRadius:10,padding:11,marginTop:10},closeText:{textAlign:'center',fontWeight:'900',color:c.ink}});
