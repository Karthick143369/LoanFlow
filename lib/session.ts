import {cookies} from "next/headers";
import {createHmac,randomBytes,timingSafeEqual} from "node:crypto";
import type {Role} from "./workflow";
const localState=globalThis as typeof globalThis & {loanflowDevSecret?:string};
const developmentSecret=localState.loanflowDevSecret??=randomBytes(32).toString("hex");
function secret(){const key=process.env.SESSION_SECRET;if(key&&key.length>=32)return key;if(process.env.NODE_ENV==="production"||process.env.VERCEL)throw new Error("Set SESSION_SECRET to a random value of at least 32 characters.");return developmentSecret;}
function sign(id:string){return createHmac("sha256",secret()).update(id).digest("hex")}
function valid(token:string){const [id,sig]=token.split('.');if(!/^[a-f0-9]{64}$/.test(id||"")||!/^[a-f0-9]{64}$/.test(sig||""))return null;return timingSafeEqual(Buffer.from(sig),Buffer.from(sign(id)))?id:null;}
export async function session(create=false){const jar=await cookies();const token=jar.get("loanflow-session")?.value;let id=token?valid(token):null;if(!id&&create){id=randomBytes(32).toString("hex");jar.set("loanflow-session",id+'.'+sign(id),{httpOnly:true,sameSite:"lax",secure:process.env.NODE_ENV==="production",path:"/",maxAge:60*60*24*30});}if(!id)throw new Error("Your demo session has expired. Refresh the page to start a new workspace.");const value=jar.get("loanflow-role")?.value||"Officer";if(!["Customer","Officer","Manager"].includes(value))throw new Error("Invalid demo persona");return {id,role:value as Role};}
export async function setRole(role:Role){(await cookies()).set("loanflow-role",role,{httpOnly:true,sameSite:"lax",secure:process.env.NODE_ENV==="production",path:"/",maxAge:60*60*24*30});}
export function sameOrigin(req:Request){try {const value=req.headers.get("origin");if(!value)return false;const origin=new URL(value);return value===origin.origin&&origin.host===req.headers.get("host")&&origin.protocol===(process.env.NODE_ENV==="production"?"https:":"http:");}catch{return false;}}
