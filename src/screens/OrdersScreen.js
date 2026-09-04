import React, { useMemo, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { formatMoney, printOrderSlip } from '../utils/receiptPrinter';
import { groupOrdersByDay, shareDailySales } from '../utils/reports';
import { theme } from '../theme';

export function OrdersScreen({ orders, settings }) {
  const days = useMemo(() => groupOrdersByDay(orders), [orders]);
  const [openDay, setOpenDay] = useState(days[0]?.date || null);

  async function shareDay(day) {
    try {
      await shareDailySales(day.date, day.orders);
    } catch (error) {
      Alert.alert('Could not share report', error?.message || 'The daily sales report could not be generated.');
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Sales Archive</Text>
      <Text style={styles.subtitle}>Orders are grouped by trading day. Tap a day to open it.</Text>
      {!days.length ? <View style={styles.emptyCard}><Text style={styles.empty}>No orders saved yet.</Text></View> : null}

      {days.map((day) => {
        const expanded = openDay === day.date;
        return <View key={day.date} style={styles.dayCard}>
          <TouchableOpacity style={styles.dayHeader} onPress={() => setOpenDay(expanded ? null : day.date)}>
            <View><Text style={styles.dayDate}>{day.date}</Text><Text style={styles.dayMeta}>{day.count} orders · Avg {formatMoney(day.average)}</Text></View>
            <View style={styles.dayRight}><Text style={styles.dayTotal}>{formatMoney(day.total)}</Text><Text style={styles.chevron}>{expanded ? '▲' : '▼'}</Text></View>
          </TouchableOpacity>
          {expanded ? <View style={styles.dayBody}>
            <TouchableOpacity style={styles.shareButton} onPress={() => shareDay(day)}><Text style={styles.shareText}>EMAIL / SHARE DAILY SALES PDF</Text></TouchableOpacity>
            {day.orders.map((order) => <View key={order.id} style={styles.orderCard}>
              <View style={styles.row}><Text style={styles.orderNo}>Order #{order.number}</Text><Text style={styles.orderTotal}>{formatMoney(order.total)}</Text></View>
              <Text style={styles.meta}>{order.createdAtText} · {order.orderType}</Text>
              {order.customerName ? <Text style={styles.meta}>Customer: {order.customerName}</Text> : null}
              {order.tableNumber ? <Text style={styles.meta}>Table: {order.tableNumber}</Text> : null}
              <View style={styles.itemsBox}>
                {(order.items || []).map((item, index) => <View key={`${item.lineId || item.id}-${index}`} style={styles.itemLine}>
                  <Text style={styles.itemText}>{item.qty} × {item.name}</Text>
                  {(item.selectedModifiers || []).map((m) => <Text key={m.id} style={styles.modText}>+ {m.name}</Text>)}
                  {item.note ? <Text style={styles.note}>Note: {item.note}</Text> : null}
                </View>)}
                {order.orderNote ? <Text style={styles.note}>Order note: {order.orderNote}</Text> : null}
              </View>
              <TouchableOpacity style={styles.reprintButton} onPress={() => printOrderSlip(order, settings, { reprint: true })}><Text style={styles.reprintText}>REPRINT SLIP</Text></TouchableOpacity>
            </View>)}
          </View> : null}
        </View>;
      })}
    </ScrollView>
  );
}

const c = theme.colors;
const styles = StyleSheet.create({
  container:{padding:14,paddingBottom:34},title:{fontSize:24,fontWeight:'900',color:c.ink},subtitle:{color:c.muted,marginTop:3,marginBottom:14},emptyCard:{backgroundColor:c.surface,borderRadius:14,padding:20,borderWidth:1,borderColor:c.line},empty:{color:c.muted},dayCard:{backgroundColor:c.surface,borderRadius:16,marginBottom:12,borderWidth:1,borderColor:c.line,overflow:'hidden'},dayHeader:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',padding:14},dayDate:{fontSize:18,fontWeight:'900',color:c.greenDark},dayMeta:{color:c.muted,marginTop:3,fontWeight:'600'},dayRight:{alignItems:'flex-end'},dayTotal:{fontSize:19,fontWeight:'900',color:c.red},chevron:{color:c.muted,marginTop:3,fontSize:11},dayBody:{borderTopWidth:1,borderTopColor:c.line,padding:12,backgroundColor:c.bg},shareButton:{backgroundColor:c.green,borderRadius:12,padding:12,marginBottom:10},shareText:{color:'#fff',fontWeight:'900',textAlign:'center'},orderCard:{backgroundColor:'#fff',borderRadius:13,padding:12,marginBottom:10,borderWidth:1,borderColor:c.line},row:{flexDirection:'row',justifyContent:'space-between',gap:10},orderNo:{fontSize:17,fontWeight:'900',color:c.ink},orderTotal:{fontSize:17,fontWeight:'900',color:c.red},meta:{color:c.muted,marginTop:3},itemsBox:{marginTop:9,paddingTop:8,borderTopWidth:1,borderTopColor:c.soft},itemLine:{marginBottom:6},itemText:{fontWeight:'800',color:c.ink},modText:{color:c.muted,marginLeft:12},note:{color:c.greenDark,fontStyle:'italic',marginTop:2},reprintButton:{backgroundColor:c.espresso,borderRadius:10,padding:10,marginTop:7},reprintText:{color:'#fff',fontWeight:'900',textAlign:'center'},
});
