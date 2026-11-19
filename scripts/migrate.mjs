import {readFile} from 'node:fs/promises';
const schema=await readFile(new URL('../db/schema.sql',import.meta.url),'utf8');
if(process.env.DATABASE_URL){const {Pool}=await import('pg');const db=new Pool({connectionString:process.env.DATABASE_URL,max:1,connectionTimeoutMillis:10000});try{await db.query(schema);console.log('PostgreSQL schema is ready')}finally{await db.end()}}
else{if(process.env.VERCEL||process.env.NODE_ENV==='production')throw Error('Set DATABASE_URL before deploying');const {PGlite}=await import('@electric-sql/pglite');const db=new PGlite(process.env.LOCAL_DATABASE_PATH||'.loanflow-data');try{await db.exec(schema);console.log('Local PostgreSQL sandbox is ready')}finally{await db.close()}}
