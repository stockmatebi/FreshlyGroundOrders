import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { formatMoney } from '../utils/receiptPrinter';
import { orderAnalytics } from '../utils/operations';
import { theme } from '../theme';

export function DashboardScreen({ orders }) {
  const data = useMemo(() => orderAnalytics(orders), [orders]);
  return <ScrollView contentContainerStyle={s.wrap}>
    <Text style={s.title}>Today's Dashboard</Text>
    <View style={s.cards}>
      <Metric label="SALES TODAY" value={formatMoney(data.gross)}/><Metric label="ORDERS" value={String(data.dayOrders.length)}/><Metric label="AVERAGE ORDER" value={formatMoney(data.average)}/><Metric label="BUSIEST HOUR" value={data.busiest?`${String(data.busiest[0]).padStart(2,'0')}:00 · ${formatMoney(data.busiest[1])}`:'—'}/>
      <Metric label="COFFEE ITEMS" value={String(data.coffeeQty)}/><Metric label="MEAL ITEMS" value={String(data.mealQty)}/><Metric label="REWARDS ISSUED" value={String(data.rewardsIssued)}/><Metric label="REWARDS REDEEMED" value={String(data.rewardsRedeemed)}/>
    </View>
    <View style={s.panels}>
      <View style={s.panel}><Text style={s.panelTitle}>Top Sellers Today</Text>{data.top.length?data.top.map(([name,qty],i)=><View key={name} style={s.row}><Text style={s.rank}>{i+1}</Text><Text style={s.name}>{name}</Text><Text style={s.qty}>{qty}</Text></View>):<Text style={s.empty}>No orders yet today.</Text>}</View>
      <View style={s.panel}><Text style={s.panelTitle}>Popular Choices / Modifiers</Text>{data.modifiers.length?data.modifiers.map(([name,qty])=><View key={name} style={s.row}><Text style={s.name}>{name}</Text><Text style={s.qty}>{qty}</Text></View>):<Text style={s.empty}>Selections such as egg style, bread, milk and sizes will appear here.</Text>}</View>
    </View>
  </ScrollView>;
}
function Metric({label,value}){return <View style={s.metric}><Text style={s.metricLabel}>{label}</Text><Text style={s.metricValue}>{value}</Text></View>}
const c=theme.colors; const s=StyleSheet.create({wrap:{padding:12,paddingBottom:28},title:{fontSize:23,fontWeight:'900',color:c.ink,marginBottom:10},cards:{flexDirection:'row',flexWrap:'wrap',gap:8},metric:{backgroundColor:c.espresso,borderRadius:13,padding:12,minWidth:'22%',flex:1},metricLabel:{color:'#D8CFC6',fontSize:9,fontWeight:'900'},metricValue:{color:'#fff',fontSize:20,fontWeight:'900',marginTop:4},panels:{flexDirection:'row',gap:10,flexWrap:'wrap'},panel:{backgroundColor:c.surface,borderRadius:14,padding:12,marginTop:10,borderWidth:1,borderColor:c.line,flex:1,minWidth:300},panelTitle:{fontSize:17,fontWeight:'900',color:c.greenDark,marginBottom:6},row:{flexDirection:'row',alignItems:'center',paddingVertical:7,borderBottomWidth:1,borderBottomColor:c.line},rank:{width:28,fontWeight:'900',color:c.red},name:{flex:1,fontWeight:'800',color:c.ink},qty:{fontSize:15,fontWeight:'900',color:c.green},empty:{color:c.muted,paddingVertical:8}});