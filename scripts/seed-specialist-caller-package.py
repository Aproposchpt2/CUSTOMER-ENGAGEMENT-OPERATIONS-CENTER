"""Generate staging caller seed SQL. Run only against the named staging project."""
import json,sys
from pathlib import Path
rows=json.loads(Path('docs/specialist-staging/caller/articles.json').read_text());out=Path(sys.argv[1]);out.mkdir(exist_ok=True,parents=True)
for n,start in enumerate(range(0,len(rows),20)):
 blob=json.dumps(rows[start:start+20],ensure_ascii=False).replace("'","''")
 sql="""WITH expected AS(SELECT * FROM jsonb_to_recordset('%s'::jsonb) AS e(id uuid,stable_id text,product_scope text,tenant_id uuid,title text,content text,source_ref text,source_status text,execution_mode text,test_only boolean,approval_basis text)), saved AS(
 INSERT INTO public.ai4cc_specialist_staging_articles(id,stable_id,product_scope,tenant_id,title,content,source_ref,source_status,execution_mode,test_only,approval_basis)
 SELECT * FROM expected ON CONFLICT(id) DO UPDATE SET title=excluded.title,content=excluded.content,source_ref=excluded.source_ref,execution_mode=excluded.execution_mode,approval_basis=excluded.approval_basis RETURNING *)
 SELECT count(*) imported,bool_and(s.content=e.content AND s.tenant_id=e.tenant_id AND s.product_scope=e.product_scope) exact_parity FROM saved s JOIN expected e USING(id);"""%blob
 (out/f'batch-{n:02}.sql').write_text(sql)
print('269 staging caller records; replay does not extend expiration or enable retired rows')
