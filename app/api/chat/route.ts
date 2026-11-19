import {z} from 'zod';
import {database} from '../../../lib/database';
import {session,sameOrigin} from '../../../lib/session';
import {respondToChat} from '../../../lib/chat';
import type {Loan} from '../../../lib/workflow';
export const runtime='nodejs';
export const dynamic='force-dynamic';
const input=z.object({message:z.string().trim().min(1).max(1200),contextApplicationId:z.string().max(100).nullable().optional()}).strict();
const headers={'Cache-Control':'private, no-store'};
export async function POST(req:Request){
 if(!sameOrigin(req))return Response.json({error:'Invalid origin'},{status:403,headers});
 if(Number(req.headers.get('content-length'))>8192)return Response.json({error:'Please keep your question under 1,200 characters.'},{status:413,headers});
 let s;try{s=await session()}catch{return Response.json({error:'Refresh the workspace to start your demo session.'},{status:401,headers})}
 const parsed=input.safeParse(await req.json().catch(()=>null));if(!parsed.success)return Response.json({error:'Enter a question of 1–1,200 characters.'},{status:400,headers});
 try{const db=await database();const result=await db.query<{data:Loan[];version:number}>('SELECT data,version FROM loanflow_workspaces WHERE id=$1',[s.id]);const row=result.rows[0];if(!row)return Response.json({error:'Open the workspace first, then try again.'},{status:409,headers});
 return Response.json({...respondToChat(parsed.data.message,row.data,s.role,parsed.data.contextApplicationId??null),asOf:new Date().toISOString(),workspaceVersion:row.version,mode:'built-in'},{headers});
 }catch{return Response.json({error:'The workspace is temporarily unavailable. Please try again.'},{status:503,headers})}
}
