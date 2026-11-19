import { Pool } from "pg";
import type { PGlite } from "@electric-sql/pglite";
type Result<T>={rows:T[];rowCount?:number|null};
export interface Database {query<T extends Record<string,unknown>=Record<string,unknown>>(sql:string,params?:unknown[]):Promise<Result<T>>}
const state=globalThis as typeof globalThis & {loanflowPool?:Pool;loanflowLocal?:Promise<PGlite>};
export async function database():Promise<Database>{
 if(process.env.DATABASE_URL){state.loanflowPool??=new Pool({connectionString:process.env.DATABASE_URL,max:3,idleTimeoutMillis:10000,connectionTimeoutMillis:10000});return {query:async <T extends Record<string,unknown>>(sql:string,params:unknown[]=[])=>{const r=await state.loanflowPool!.query<T>(sql,params);return {rows:r.rows,rowCount:r.rowCount}}};}
 if(process.env.VERCEL||process.env.NODE_ENV==="production")throw new Error("Database is not configured. Set DATABASE_URL and run npm run db:migrate.");
 state.loanflowLocal??=import("@electric-sql/pglite").then(({PGlite})=>new PGlite(process.env.LOCAL_DATABASE_PATH||".loanflow-data"));
 const db=await state.loanflowLocal;return {query:async <T extends Record<string,unknown>>(sql:string,params:unknown[]=[])=>{const r=await db.query<T>(sql,params);return {rows:r.rows,rowCount:r.affectedRows}}};
}
