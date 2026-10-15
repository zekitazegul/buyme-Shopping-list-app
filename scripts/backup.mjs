import { DatabaseSync } from 'node:sqlite';
import { existsSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const source=resolve(process.env.BUYME_DB||resolve(root,'data/buyme.sqlite'));
if(!existsSync(source)) throw new Error('No database yet. Start BuyMe and create an account first.');
const timestamp=new Date().toISOString().replaceAll(':','-').replaceAll('.','-');
const target=resolve(process.argv[2]||resolve(root,'backups',`buyme-${timestamp}.sqlite`));
if(existsSync(target)) throw new Error('Backup destination already exists; choose a new filename.');
mkdirSync(dirname(target),{recursive:true});
const db=new DatabaseSync(source,{readOnly:true});
try { db.prepare('VACUUM INTO ?').run(target); console.log(`Backup saved: ${target}`); }
finally { db.close(); }
