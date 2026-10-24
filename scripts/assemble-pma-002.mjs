import {readFileSync,writeFileSync,readdirSync} from 'node:fs';
const dir='supabase/migrations/';
const path=dir+readdirSync(dir).find(f=>f.endsWith('_pma_002_controlled_domain_safeguards.sql'));
const header=readFileSync(path,'utf8').split('-- Synthetic schedule:')[0];
writeFileSync(path,header+readFileSync('supabase/functions/pma_002_contracts.sql','utf8')+'\ncommit;\n');
