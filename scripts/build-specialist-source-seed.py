import json,sys
from pathlib import Path
root=Path(sys.argv[1]); dest=Path(sys.argv[2]);dest.mkdir(parents=True,exist_ok=True)
load=lambda f:json.loads((root/f).read_text())
rows=[];key='specialist-source-20261025-v1';sales='5885a020-d363-4c27-910a-c035eda132f5';hvac='d7e80001-0000-4000-b000-000000000001'
def add(typ,id,scope,payload):rows.append({'package_key':key,'record_type':typ,'record_id':id,'product_scope':scope,'tenant_id':None if scope=='shared' else hvac if scope=='support_hvac' else sales,'payload':payload})
for k in load('knowledge.json'):add('knowledge',k['id'],k['scope'],k)
for i in load('intents-all-fields.json'):add('intent',i['IntentID'],'sales' if i['Agent']=='Sales' else 'support_platform',i)
tests=load('validation-tests.json')
for id in sorted({t['article_id'] for t in tests}):add('test_bundle',id,'sales' if id.startswith('SAL-') else 'support_platform',[t for t in tests if t['article_id']==id])
add('guide','sales-voice-flow','sales',load('sales-guide.json'));add('manifest','source-manifest','shared',load('manifest.json'))
# Snapshots are audit references only. Original hosted HVAC KB rows remain authoritative.
if (root/'summit-inventory.json').exists():
 for r in load('summit-inventory.json'):add('hvac_reference',r['id'],'support_hvac',r)
for i in load('summit-intents.json')['intents']:add('intent',i['id'],'support_hvac',i)
quote=lambda s:"'"+s.replace("'","''")+"'"
for num,start in enumerate(range(0,len(rows),10)):
 batch=rows[start:start+10];blob=json.dumps(batch,ensure_ascii=False,separators=(',',':'));q=quote(blob)
 sql="""WITH expected AS (SELECT * FROM jsonb_to_recordset(%s::jsonb) AS e(package_key text,record_type text,record_id text,product_scope text,tenant_id uuid,payload jsonb)), saved AS (
 INSERT INTO public.ai4cc_specialist_source_records(package_key,record_type,record_id,product_scope,tenant_id,payload)
 SELECT package_key,record_type,record_id,product_scope,tenant_id,payload FROM expected
 ON CONFLICT(package_key,record_type,record_id) DO UPDATE SET payload=excluded.payload,product_scope=excluded.product_scope,tenant_id=excluded.tenant_id
 RETURNING *)
 SELECT count(*) AS imported, bool_and(s.payload=e.payload AND s.product_scope=e.product_scope AND s.tenant_id IS NOT DISTINCT FROM e.tenant_id AND s.review_state='draft' AND NOT s.caller_enabled) AS exact_parity
 FROM saved s JOIN expected e USING(package_key,record_type,record_id);"""%q
 (dest/f'batch-{num:03}.sql').write_text(sql)
(root/'expected-import.json').write_text(json.dumps({'rows':len(rows),'package_key':key,'counts':{t:sum(r['record_type']==t for r in rows) for t in sorted({r['record_type'] for r in rows})}},indent=2)+'\n')
print('prepared',len(rows),'records',len(list(dest.glob('batch-*.sql'))),'batches')
