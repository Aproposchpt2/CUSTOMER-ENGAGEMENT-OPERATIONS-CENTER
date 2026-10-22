import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import {PGlite} from '@electric-sql/pglite';

test('PMA migrations and synthetic isolation/workflow acceptance on isolated PostgreSQL',async()=>{
 const db=new PGlite();
 try{
  await db.exec(readFileSync('supabase/tests/pma_local_baseline.sql','utf8'));
  for(const file of readdirSync('supabase/migrations').filter(f=>f.includes('_pma_')).sort()) await db.exec(readFileSync(`supabase/migrations/${file}`,'utf8'));
  const results=await db.exec(readFileSync('supabase/tests/pma_acceptance.sql','utf8'));
  const pass=results.flatMap(r=>r.rows as {result?:string}[]).find(r=>r.result?.startsWith('PASS:'));
  assert.ok(pass,'Transactional database acceptance did not complete');
  const catalogResults=await db.exec(readFileSync('supabase/tests/pma_catalog_acceptance.sql','utf8'));
  assert.ok(catalogResults.flatMap(r=>r.rows as {result?:string}[]).some(r=>r.result?.startsWith('PASS: all 25')));
  const remaining=await db.query<{count:number}>('select count(*)::integer as count from public.pm_properties');
  assert.equal(remaining.rows[0].count,0,'Synthetic fixtures must roll back');
  const policies=await db.query<{tablename:string;commands:number}>("select tablename,count(distinct cmd)::integer as commands from pg_policies where schemaname='public' and (tablename like 'pm_%' or tablename='ai4cc_knowledge_entries') group by tablename");
  assert.ok(policies.rows.length>=13);
  for(const row of policies.rows)assert.equal(row.commands,4,`${row.tablename} needs all four RLS command policies`);
 }finally{await db.close();}
});

test('knowledge migration reconciles pre-existing structures and a placeholder without duplication',async()=>{
 const db=new PGlite();try{
  await db.exec(readFileSync('supabase/tests/pma_local_baseline.sql','utf8'));
  const files=readdirSync('supabase/migrations').filter(f=>f.includes('_pma_')).sort();
  const model=files.find(f=>f.includes('_knowledge_model_v1'))!;
  for(const f of files.filter(f=>f<=model))await db.exec(readFileSync('supabase/migrations/'+f,'utf8'));
  await db.exec(`insert into public.tenants(id,business_name,tenant_slug,status)values('20000000-0000-4000-8000-000000000001','Synthetic reconciliation','pma-reconcile','ACTIVE');insert into public.ai4cc_knowledge_entries(tenant_id,title,category,content,visibility,approved)values('20000000-0000-4000-8000-000000000001','Placeholder','pma_agent_model_v1','{}','staff',false);alter table public.ai4cc_knowledge_entries add column external_metadata jsonb;`);
  await db.exec(readFileSync('supabase/migrations/'+model,'utf8'));
  const rows=await db.query<{sections:number;approved:boolean;visibility:string}>("select jsonb_array_length(content::jsonb->'sections') sections,approved,visibility from public.ai4cc_knowledge_entries where category='pma_agent_model_v1'");
  assert.equal(rows.rows.length,1);assert.equal(rows.rows[0].sections,18);assert.equal(rows.rows[0].approved,false);assert.equal(rows.rows[0].visibility,'staff');
  await db.query('select external_metadata from public.ai4cc_knowledge_entries');
 }finally{await db.close();}
});
