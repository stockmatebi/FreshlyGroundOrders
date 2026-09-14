import json
from collections import defaultdict
from html import escape

with open('daily-sales.json', encoding='utf-8') as f:
    payload = json.load(f)
rows = payload['rows']
day = payload['business_date']
source = payload['source']


def first(d, *keys, default=None):
    for k in keys:
        if isinstance(d, dict) and d.get(k) is not None:
            return d[k]
    return default


def decode(value):
    if isinstance(value, (dict, list)):
        return value
    if isinstance(value, str):
        try:
            return json.loads(value)
        except Exception:
            return value
    return value


def unwrap(r):
    if not isinstance(r, dict):
        return r
    merged = dict(r)
    for k in ('order', 'payload', 'data', 'sale', 'details'):
        v = decode(r.get(k))
        if isinstance(v, dict):
            merged.update(v)
    return merged


def looks_like_items(value):
    if not isinstance(value, list) or not value:
        return False
    sample = next((x for x in value if isinstance(x, dict)), None)
    if not sample:
        return False
    keys = set(sample.keys())
    return bool(keys & {'name', 'description', 'item_name', 'qty', 'quantity', 'unitPrice', 'unit_price', 'price'})


def find_items(obj):
    if not isinstance(obj, dict):
        return []
    preferred = ('_report_items', 'items', 'order_items', 'line_items', 'cart', 'products', 'lines')
    for key in preferred:
        value = decode(obj.get(key))
        if looks_like_items(value):
            return value
    for value in obj.values():
        value = decode(value)
        if looks_like_items(value):
            return value
        if isinstance(value, dict):
            found = find_items(value)
            if found:
                return found
    return []


def money(v):
    return f'R{float(v or 0):,.2f}'


orders = [unwrap(r) for r in rows]
turnover = 0.0
types = defaultdict(lambda: [0, 0.0])
cats = defaultdict(lambda: [0.0, 0.0])
prods = defaultdict(lambda: [0.0, 0.0])
loyalty = [0, 0, 0, 0]

for o in orders:
    total = float(first(o, 'total', 'order_value', 'amount', 'grand_total', default=0) or 0)
    turnover += total
    typ = str(first(o, 'orderType', 'order_type', 'type', default='Unknown') or 'Unknown')
    types[typ][0] += 1
    types[typ][1] += total
    program = str(first(o, 'loyaltyProgram', 'loyalty_program', default='') or '')
    if program:
        loyalty[0] += 1
    if program.lower() == 'coffee':
        loyalty[1] += 1
    if program.lower() == 'meal':
        loyalty[2] += 1
    if first(o, 'loyaltyReward', 'loyalty_reward'):
        loyalty[3] += 1

    for item in find_items(o):
        if not isinstance(item, dict):
            continue
        name = str(first(item, 'name', 'description', 'item_name', default='Unknown item'))
        qty = float(first(item, 'qty', 'quantity', default=1) or 1)
        unit = float(first(item, 'unitPrice', 'unit_price', 'price', default=0) or 0)
        mods = decode(first(item, 'selectedModifiers', 'selected_modifiers', default=[]))
        extra = 0.0
        if isinstance(mods, list):
            extra = sum(float(m.get('price', 0) or 0) for m in mods if isinstance(m, dict))
        sales = qty * (unit + extra)
        prods[name][0] += qty
        prods[name][1] += sales
        cat = str(first(item, 'category', 'section', 'sectionName', 'category_name', default='Uncategorised') or 'Uncategorised')
        cats[cat][0] += qty
        cats[cat][1] += sales

avg = turnover / len(orders) if orders else 0
prod_sorted = sorted(prods.items(), key=lambda x: (x[1][1], x[1][0]), reverse=True)


def html_table(headers, data):
    head = ''.join(f'<th>{escape(str(h))}</th>' for h in headers)
    body = ''.join('<tr>' + ''.join(f'<td>{escape(str(c))}</td>' for c in row) + '</tr>' for row in data)
    return f'<table><thead><tr>{head}</tr></thead><tbody>{body}</tbody></table>'


type_rows = [(k, v[0], money(v[1])) for k, v in sorted(types.items())]
cat_rows = [(k, f'{v[0]:g}', money(v[1])) for k, v in sorted(cats.items(), key=lambda x: x[1][1], reverse=True)]
top_rows = [(i, k, f'{v[0]:g}', money(v[1])) for i, (k, v) in enumerate(prod_sorted[:10], 1)]
all_rows = [(k, f'{v[0]:g}', money(v[1])) for k, v in prod_sorted]

no_products_note = '' if all_rows else '<div class="warning">Product line detail is not present in the current Supabase sales records. Order totals are valid, but item-level reporting needs the synced line items.</div>'

html = f'''<!doctype html><html><head><meta charset="utf-8"><style>
@page {{ size: A4; margin: 14mm; }}
body {{ font-family: Arial, sans-serif; color:#222; font-size:11px; margin:0; }}
.header {{ border-bottom:3px solid #214c3c; padding-bottom:10px; margin-bottom:14px; }}
h1 {{ color:#214c3c; font-size:24px; margin:0; }}
.subtitle {{ color:#666; margin-top:4px; }}
.cards {{ display:flex; gap:10px; margin:14px 0 18px; }}
.card {{ flex:1; border:1px solid #d8dedb; border-radius:7px; padding:10px 12px; background:#fafcfb; }}
.label {{ font-size:10px; color:#666; text-transform:uppercase; }}
.value {{ font-size:20px; font-weight:bold; color:#214c3c; margin-top:3px; }}
h2 {{ color:#214c3c; font-size:15px; margin:18px 0 7px; border-bottom:1px solid #d8dedb; padding-bottom:4px; }}
table {{ width:100%; border-collapse:collapse; margin-bottom:12px; }}
th {{ background:#214c3c; color:white; text-align:left; padding:6px; font-size:10px; }}
td {{ padding:6px; border-bottom:1px solid #e5e5e5; }}
tr:nth-child(even) td {{ background:#f7f7f7; }}
.warning {{ border:1px solid #d7b36a; background:#fff8e8; padding:9px; border-radius:5px; margin:8px 0; }}
.footer {{ color:#777; font-size:9px; border-top:1px solid #ddd; padding-top:8px; margin-top:18px; }}
</style></head><body>
<div class="header"><h1>Freshly Ground Express</h1><div class="subtitle">Daily Sales Report — {escape(day)}</div></div>
<div class="cards">
<div class="card"><div class="label">Turnover</div><div class="value">{money(turnover)}</div></div>
<div class="card"><div class="label">Orders</div><div class="value">{len(orders)}</div></div>
<div class="card"><div class="label">Average Order</div><div class="value">{money(avg)}</div></div>
</div>
<h2>Takeaway vs Sit-down</h2>{html_table(['Type','Orders','Sales'], type_rows)}
<h2>Category Sales</h2>{html_table(['Category','Qty','Sales'], cat_rows)}
<h2>Top Products</h2>{no_products_note}{html_table(['#','Product','Qty','Sales'], top_rows)}
<h2>All Products Sold</h2>{html_table(['Product','Qty','Sales'], all_rows)}
<h2>Loyalty Activity</h2>{html_table(['Orders with activity','Coffee points','Meal points','Reward claims'], [loyalty])}
<div class="footer">Source: {escape(source)} · Business timezone: Africa/Johannesburg</div>
</body></html>'''

open('daily-sales-report.html', 'w', encoding='utf-8').write(html)
open('daily-sales-summary.txt', 'w', encoding='utf-8').write(
    f'Freshly Ground Express daily sales report for {day}\n'
    f'Turnover: {money(turnover)}\n'
    f'Orders: {len(orders)}\n'
    f'Average order: {money(avg)}\n'
    f'Product lines found: {len(all_rows)}\n'
)
print(f'Built report for {day}: {len(orders)} orders, {money(turnover)} turnover, {len(all_rows)} products')
