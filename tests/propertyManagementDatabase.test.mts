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
  const remaining=await db.query<{count:number}>('select count(*)::integer as count from public.pm_properties');
  assert.equal(remaining.rows[0].count,0,'Synthetic fixtures must roll back');
  const policies=await db.query<{tablename:string;commands:number}>("select tablename,count(distinct cmd)::integer as commands from pg_policies where schemaname='public' and (tablename like 'pm_%' or tablename='ai4cc_knowledge_entries') group by tablename");
  assert.ok(policies.rows.length>=13);
  for(const row of policies.rows)assert.equal(row.commands,4,`${row.tablename} needs all four RLS command policies`);
 }finally{await db.close();}
});
