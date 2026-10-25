"""Rebuild unapproved staging source from owner-supplied files. Never activates callers."""
import csv,hashlib,json,re,sys
from pathlib import Path
from docx import Document
from docx.oxml.ns import qn
upload=Path(sys.argv[1]);out=Path(sys.argv[2]);out.mkdir(parents=True,exist_ok=True)
names={'kb':'STELLAR_Combined_Sales_and_Support_KB_Population_FINAL_v1.2.docx','intents':'STELLAR_Expanded_Intent_Catalog_All_Fields.csv','expansion':'STELLAR_Final_90_Sales_Support_KB_Articles_Draft_v4.0.json','tests':'STELLAR_90_KB_Article_Validation_Tests_v3.0.docx','sales':'Stellar_Sales_Specialist_Knowledge_Base_Voice_Call_Flows_v1.1 (1) (1).docx'}
def blocks(name):
 d=Document(upload/name)
 for e in d.element.body:
  if e.tag==qn('w:p'):yield {'type':'paragraph','text':''.join(e.xpath('.//w:t/text()'))}
  elif e.tag==qn('w:tbl'):yield {'type':'table','rows':[[''.join(c.xpath('.//w:t/text()')) for c in r.xpath('./w:tc')] for r in e.xpath('./w:tr')]}
def emit(name,data):
 (out/name).write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n')
def scope(i):return 'sales' if i.startswith('SAL-') else 'support_platform'
kb=[];cur=None
for b in blocks(names['kb']):
 m=re.fullmatch(r'((?:SAL|SUP)-\d{3}) \| (.+)',b.get('text',''))
 if m:
  cur={'id':m[1],'title':m[2],'scope':scope(m[1]),'approval':'draft','origin':'RECOVERED_SOURCE','source':names['kb'],'source_blocks':[]};kb.append(cur)
 elif b.get('text','').startswith('Appendix '):cur=None
 elif cur:
  cur['source_blocks'].append(b)
  if b['type']=='table':
   if len(b['rows'])==1 and b['rows'][0][0].startswith('APPROVED VOICE ANSWER'):cur['caller_answer']=b['rows'][0][0][len('APPROVED VOICE ANSWER'):].strip()
   elif any(r[0]=='Intent ID' for r in b['rows']):cur['metadata']={r[0]:r[1] for r in b['rows'] if len(r)==2}
exp=json.loads((upload/names['expansion']).read_text())
for a in exp['articles']:kb.append({'id':a['article_id'],'title':a['intent_name'],'scope':scope(a['article_id']),'approval':'draft','origin':a['content_origin'],'source':names['expansion'],'caller_answer':a['caller_facing_answer'],'article':a})
with open(upload/names['intents'],encoding='utf-8-sig',newline='') as f:intents=list(csv.DictReader(f))
tests=[];cur=None
for b in blocks(names['tests']):
 m=re.match(r'^((?:SAL|SUP)-\d{3}-T\d{2}) (.+)',b.get('text',''))
 if m:cur={'id':m[1],'article_id':m[1].rsplit('-T',1)[0],'name':m[2],'status':'NOT_EXECUTED','source_blocks':[]};tests.append(cur)
 elif cur:cur['source_blocks'].append(b)
# Keep the original Sales guide in exact paragraph/table order as internal instructions.
sales=list(blocks(names['sales']))
assert len(kb)==250 and len({a['id'] for a in kb})==250
assert sum(a['scope']=='sales' for a in kb)==100
assert all(a.get('caller_answer') for a in kb)
assert len(intents)==250 and all(len(i)==32 for i in intents)
assert {a['id'] for a in kb}=={i['IntentID'] for i in intents}
assert len(tests)==630 and len({t['id'] for t in tests})==630
assert {t['id'] for t in tests}=={t for a in exp['articles'] for t in a['validation_test_mapping']}
manifest={'version':'source-integration-20261025.1','project':'hvzauakkhlivzeqatfqm','caller_activation':False,'scope_note':'Support articles describe platform Support; never Summit tenant policy.','sources':{k:{'filename':v,'sha256':hashlib.sha256((upload/v).read_bytes()).hexdigest()} for k,v in names.items()},'counts':{'kb':250,'sales_kb':100,'platform_support_kb':150,'catalog':250,'tests':630},'approval':'DRAFT_PENDING_OWNER_REVIEW'}
emit('knowledge.json',kb);emit('intents-all-fields.json',intents);emit('validation-tests.json',tests);emit('sales-guide.json',sales);emit('manifest.json',manifest)
print(json.dumps(manifest['counts']))
