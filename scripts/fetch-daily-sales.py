import json, os, urllib.request
from datetime import datetime
from zoneinfo import ZoneInfo

base = os.environ['SUPABASE_URL'].rstrip('/')
key = os.environ['SUPABASE_KEY']
day = os.getenv('BUSINESS_DATE') or datetime.now(ZoneInfo('Africa/Johannesburg')).strftime('%Y-%m-%d')
headers = {'apikey': key, 'Authorization': 'Bearer ' + key, 'Accept': 'application/json'}

def fetch(table):
    req = urllib.request.Request(f'{base}/rest/v1/{table}?select=*', headers=headers)
    with urllib.request.urlopen(req, timeout=60) as r:
        return json.loads(r.read().decode())

rows = None
source = None
for table in ('sales','orders'):
    try:
        rows = fetch(table)
        source = table
        break
    except Exception:
        pass
if rows is None:
    raise SystemExit('No readable sales or orders table found')

def date_of(row):
    for k in ('business_date','day_key','dayKey'):
        if row.get(k): return str(row[k])[:10]
    for k in ('created_at','createdAt','order_datetime'):
        if row.get(k): return str(row[k])[:10]
    return None

rows = [r for r in rows if date_of(r) == day]
with open('daily-sales.json','w',encoding='utf-8') as f:
    json.dump({'business_date': day, 'source': source, 'rows': rows}, f)
print(f'{len(rows)} rows for {day} from {source}')
