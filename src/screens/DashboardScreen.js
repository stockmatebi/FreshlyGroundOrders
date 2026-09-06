import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { formatMoney } from '../utils/receiptPrinter';
import { localDateKey } from '../utils/reports';
import { theme } from '../theme';

export function DashboardScreen({ orders }) {
  const data = useMemo(() => {
    const today = localDateKey(new Date());
    const todays = orders.filter(o => (o.dayKey || localDateKey(o.createdAt)) === today);
    const total = todays.reduce((s,o)=>s+Number(o.total||0),0);
    const counts = {};
    todays.forEach(o => (o.items||[]).forEach(i => { counts[i.name]=(counts[i.name]||0)+Number(i.qty||0); }));
    const top = Object.entries(counts).sort((a,b)=>b[1]-a[1]).slice(0,5);
    const hours = {};
    todays.forEach(o => { const h=new Date(o.createdAt).getHours(); hours[h]=(hours[h]||0)+1; });
    const busiest = Object.entries(hours).sort((a,b)=>b[1]-a[1])[0];
    return { todays,total,average:todays.length?total/todays.length:0,top,busiest };
  },[orders]);
  return <ScrollView contentContainerStyle={s.wrap}>
    <Text style={s.title}>Today's Dashboard</Text>
    <View style={s.cards}>
      <Metric label="SALES TODAY" value={formatMoney(data.total)}/><Metric label="ORDERS" value={String(data.todays.length)}/><Metric label="AVERAGE ORDER" value={formatMoney(data.average)}/><Metric label="BUSIEST HOUR" value={data.busiest?`${String(data.busiest[0]).padStart(2,'0')}:00 (${data.busiest[1]})`:'—'}/>
    </View>
    <View style={s.panel}><Text style={s.panelTitle}>Top Sellers Today</Text>{data.top.length?data.top.map(([name,qty],i)=><View key={name} style={s.row}><Text style={s.rank}>{i+1}</Text><Text style={s.name}>{name}</Text><Text style={s.qty}>{qty}</Text></View>):<Text style={s.empty}>No orders yet today.</Text>}</View>
  </ScrollView>;
}
function Metric({label,value}){return <View style={s.metric}><Text style={s.metricLabel}>{label}</Text><Text style={s.metricValue}>{value}</Text></View>}
const c=theme.colors; const s=StyleSheet.create({wrap:{padding:14,paddingBottom:30},title:{fontSize:25,fontWeight:'900',color:c.ink,marginBottom:12},cards:{flexDirection:'row',flexWrap:'wrap',gap:10},metric:{backgroundColor:c.espresso,borderRadius:16,padding:16,minWidth:'23%',flex:1},metricLabel:{color:'#D8CFC6',fontSize:11,fontWeight:'900'},metricValue:{color:'#fff',fontSize:24,fontWeight:'900',marginTop:5},panel:{backgroundColor:c.surface,borderRadius:16,padding:14,marginTop:14,borderWidth:1,borderColor:c.line},panelTitle:{fontSize:19,fontWeight:'900',color:c.greenDark,marginBottom:8},row:{flexDirection:'row',alignItems:'center',paddingVertical:9,borderBottomWidth:1,borderBottomColor:c.line},rank:{width:32,fontWeight:'900',color:c.red},name:{flex:1,fontWeight:'800',color:c.ink},qty:{fontSize:17,fontWeight:'900',color:c.green},empty:{color:c.muted,paddingVertical:10}});