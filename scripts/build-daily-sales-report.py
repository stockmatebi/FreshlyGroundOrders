import json
from collections import defaultdict

with open('daily-sales.json',encoding='utf-8') as f:
    payload=json.load(f)
rows=payload['rows']; day=payload['business_date']; source=payload['source']

def first(d,*keys,default=None):
    for k in keys:
        if isinstance(d,dict) and d.get(k) is not None: return d[k]
    return default

def unwrap(r):
    for k in ('order','payload','data','sale'):
        v=r.get(k) if isinstance(r,dict) else None
        if isinstance(v,dict): return {**r,**v}
        if isinstance(v,str):
            try:
                x=json.loads(v)
                if isinstance(x,dict): return {**r,**x}
            except Exception: pass
    return r

def items(o):
    v=first(o,'items','order_items',default=[])
    if isinstance(v,str):
        try: v=json.loads(v)
        except Exception: v=[]
    return v if isinstance(v,list) else []

def money(v): return f'R{float(v or 0):,.2f}'
orders=[unwrap(r) for r in rows]
turnover=0.0; types=defaultdict(lambda:[0,0.0]); cats=defaultdict(lambda:[0.0,0.0]); prods=defaultdict(lambda:[0.0,0.0]); loyalty=[0,0,0,0]
for o in orders:
    total=float(first(o,'total','order_value','amount','grand_total',default=0) or 0); turnover+=total
    typ=str(first(o,'orderType','order_type','type',default='Unknown') or 'Unknown'); types[typ][0]+=1; types[typ][1]+=total
    program=str(first(o,'loyaltyProgram','loyalty_program',default='') or '')
    if program: loyalty[0]+=1
    if program.lower()=='coffee': loyalty[1]+=1
    if program.lower()=='meal': loyalty[2]+=1
    if first(o,'loyaltyReward','loyalty_reward'): loyalty[3]+=1
    for item in items(o):
        if not isinstance(item,dict): continue
        name=str(first(item,'name','description','item_name',default='Unknown item')); qty=float(first(item,'qty','quantity',default=1) or 1); unit=float(first(item,'unitPrice','unit_price','price',default=0) or 0)
        mods=first(item,'selectedModifiers','selected_modifiers',default=[]); extra=sum(float(m.get('price',0) or 0) for m in mods if isinstance(m,dict)) if isinstance(mods,list) else 0
        sales=qty*(unit+extra); prods[name][0]+=qty; prods[name][1]+=sales
        cat=str(first(item,'category','section','sectionName','category_name',default='Uncategorised') or 'Uncategorised'); cats[cat][0]+=qty; cats[cat][1]+=sales
avg=turnover/len(orders) if orders else 0

def table(headers, data):
    return '<table><tr>'+''.join(f'<th>{h}</th>' for h in headers)+'</tr>'+''.join('<tr>'+''.join(f'<td>{c}</td>' for c in r)+'</tr>' for r in data)+'</table>'
type_rows=[(k,v[0],money(v[1])) for k,v in sorted(types.items())]
cat_rows=[(k,f'{v[0]:g}',money(v[1])) for k,v in sorted(cats.items(),key=lambda x:x[1][1],reverse=True)]
prod_sorted=sorted(prods.items(),key=lambda x:(x[1][0],x[1][1]),reverse=True)
top_rows=[(i,k,f'{v[0]:g}',money(v[1])) for i,(k,v) in enumerate(prod_sorted[:10],1)]
all_rows=[(k,f'{v[0]:g}',money(v[1])) for k,v in prod_sorted]
html=f'''<html><head><meta charset="utf-8"><style>body{{font-family:Arial;color:#222;max-width:950px;margin:auto;padding:24px}}h1,h2{{color:#214c3c}}.cards{{display:flex;gap:12px;flex-wrap:wrap}}.card{{border:1px solid #ddd;border-radius:8px;padding:14px 18px}}.big{{font-size:22px;font-weight:700}}table{{width:100%;border-collapse:collapse;margin-bottom:18px}}th,td{{padding:8px;border-bottom:1px solid #ddd;text-align:left}}th{{background:#f4f4f4}}.muted{{color:#777}}</style></head><body><h1>Freshly Ground Express</h1><p class="muted">Daily Sales Report — {day}</p><div class="cards"><div class="card">Turnover<div class="big">{money(turnover)}</div></div><div class="card">Orders<div class="big">{len(orders)}</div></div><div class="card">Average Order<div class="big">{money(avg)}</div></div></div><h2>Takeaway vs Sit-down</h2>{table(['Type','Orders','Sales'],type_rows)}<h2>Category Sales</h2>{table(['Category','Qty','Sales'],cat_rows)}<h2>Top Products</h2>{table(['#','Product','Qty','Sales'],top_rows)}<h2>All Item Sales</h2>{table(['Item','Qty','Sales'],all_rows)}<h2>Loyalty Activity</h2>{table(['Orders with activity','Coffee points','Meal points','Reward claims'],[loyalty])}<p class="muted">Source: {source}. Business timezone: Africa/Johannesburg.</p></body></html>'''
open('daily-sales-report.html','w',encoding='utf-8').write(html)
open('daily-sales-summary.txt','w',encoding='utf-8').write(f'Freshly Ground Express daily sales report for {day}\nTurnover: {money(turnover)}\nOrders: {len(orders)}\nAverage order: {money(avg)}\n')
print(f'Built report for {day}: {len(orders)} orders, {money(turnover)} turnover')
