import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import {PGlite} from '@electric-sql/pglite';
test('PMA-002 rollback restores previous answer functions and disables new workflows while retaining storage',async()=>{
 const db=new PGlite();try{
 await db.exec(readFileSync('supabase/tests/pma_local_baseline.sql','utf8'));
 for(const file of readdirSync('supabase/migrations').filter(f=>f.includes('_pma_')).sort())await db.exec(readFileSync('supabase/migrations/'+file,'utf8'));
 await db.exec(readFileSync('docs/pma-002/rollback.sql','utf8'));
 const definition=(await db.query<{body:string}>("select prosrc body from pg_proc where oid='private.pm_knowledge_answer(uuid,uuid,uuid,uuid,text)'::regprocedure")).rows[0].body;
 assert.equal(definition.includes('pm_knowledge_eligible_v1'),false);
 for(const signature of ['public.pm_capture_prospect_v1(uuid,uuid,uuid,text,text,jsonb)','private.pm_capture_prospect_v1(uuid,uuid,uuid,text,text,jsonb)','public.pm_public_voice_knowledge_v1(uuid,uuid)'])assert.equal((await db.query<{allowed:boolean}>("select has_function_privilege('service_role',$1,'execute') allowed",[signature])).rows[0].allowed,false);
 assert.equal((await db.query<{allowed:boolean}>("select has_function_privilege('authenticated','private.pm_request_or_book_showing_v1(uuid,uuid,uuid,uuid,text,timestamptz,text,uuid,integer)','execute') allowed")).rows[0].allowed,false);
 assert.ok((await db.query<{v:string}>("select to_regclass('private.pm_tour_operations_v1')::text v")).rows[0].v);
 }finally{await db.close();}
});
