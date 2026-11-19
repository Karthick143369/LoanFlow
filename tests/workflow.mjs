import assert from 'node:assert/strict';
const origin=process.env.TEST_BASE_URL || 'http://127.0.0.1:4173';
if(!['127.0.0.1','localhost'].includes(new URL(origin).hostname)) throw Error('Integration tests run only against a local sandbox');
const cookies=new Map();let version;
async function request(path,body,expected=200,custom={}){const r=await fetch(origin+path,{method:body?'POST':'GET',headers:{origin,...(body instanceof FormData?{}:{'Content-Type':'application/json'}),cookie:[...cookies].map(([k,v])=>k+'='+v).join('; '),...custom},body:body instanceof FormData?body:body?JSON.stringify(path==='/api/chat'?body:{...body,version:body.version??version}):undefined});for(const sc of r.headers.getSetCookie()){const [k,...v]=sc.split(';')[0].split('=');cookies.set(k,v.join('='));}const text=await r.text();assert.equal(r.status,expected,text);try{return JSON.parse(text)}catch{return text}}
async function state(){const d=await request('/api/workspace');version=d.version;return d}
async function role(r){await request('/api/workspace',{action:'role',role:r});await state()}
const first=await state();
const other=await fetch(origin+'/api/workspace');assert.notEqual(other.headers.get('set-cookie')?.split(';')[0],[...cookies].map(([k,v])=>k+'='+v).join('; '),'Browser sessions must be isolated');
await request('/api/workspace',{action:'approve',id:'LF-1046',reason:'Unauthorized officer attempt'},400);
await request('/api/workspace',{action:'create',loan:{}},400);
await role('Customer');
const input={name:'Test Applicant',email:'test@example.com',purpose:'Education',amount:150000,income:50000,term:24};
await request('/api/workspace',{action:'create',loan:{...input,amount:-100}},400);
await request('/api/workspace',{action:'create',loan:input});
let s=await state();const id=s.loans[0].id;assert.equal(s.loans[0].status,'Draft');
await request('/api/workspace',{action:'submit',id},400);
const f=new FormData();f.set('id',id);f.set('file',new File(['FICTIONAL TEST DOCUMENT'],'income.txt',{type:'text/plain'}));await request('/api/documents',f);s=await state();assert.equal(s.loans[0].documents.length,1);
const stale=version;await request('/api/workspace',{action:'submit',id});s=await state();assert.equal(s.loans[0].status,'Submitted');
await request('/api/workspace',{action:'review',id},400);
await role('Officer');await request('/api/workspace',{action:'review',id});await state();
await request('/api/workspace',{action:'recommend',id,reason:''},400);
await request('/api/workspace',{action:'recommend',id,reason:'Documents reviewed for demo'});s=await state();assert.equal(s.loans[0].status,'Awaiting approval');
await role('Manager');
await request('/api/workspace',{action:'approve',id,reason:'Demo approved',version:stale},409);
await request('/api/workspace',{action:'approve',id,reason:'Demo approved'});s=await state();assert.equal(s.loans[0].status,'Approved');
await request('/api/workspace',{action:'reject',id,reason:'Invalid second decision'},400);
await request('/api/workspace',{action:'note',id,reason:'Post-decision test note'});s=await state();assert.equal(s.loans[0].history[0].text,'Post-decision test note');
await request('/api/workspace',{action:'reject',id:'LF-1046',reason:'Demo rejection'});s=await state();assert.equal(s.loans.find(l=>l.id==='LF-1046').status,'Rejected');
await request('/api/workspace',{action:'role',role:'Admin'},400);
await request('/api/workspace',{action:'note',id,reason:'Wrong origin'},403,{origin:'https://untrusted.example'});
// Chat reads the latest server state and never changes application records.
const beforeChat=await state();
const summary=await request('/api/chat',{message:'Summarize my workspace'});
assert.equal(summary.mode,'built-in');assert.equal(summary.workspaceVersion,beforeChat.version);
assert.match(summary.text,/Applications: 9/);
const found=await request('/api/chat',{message:'Show '+id});assert.equal(found.contextApplicationId,id);assert.match(found.text,/Status: Approved/);
const documents=await request('/api/chat',{message:'What documents does it have?',contextApplicationId:id});assert.match(documents.text,/income.txt/);
const history=await request('/api/chat',{message:'Show activity for '+id});assert.match(history.text,/Post-decision test note/);
const denied=await request('/api/chat',{message:'Approve '+id});assert.match(denied.text,/do not change applications/);
assert.equal((await state()).version,beforeChat.version);
await request('/api/chat',{message:''},400);
await request('/api/chat',{message:'x'.repeat(1201)},400);
await request('/api/chat',{message:'Summary'},403,{origin:'https://untrusted.example'});
// Another browser cannot fetch this session's unique application, even with its exact ID.
const foreignCookies=other.headers.getSetCookie().map(s=>s.split(';')[0]).join('; ');
const foreign=await fetch(origin+'/api/chat',{method:'POST',headers:{origin,'Content-Type':'application/json',cookie:foreignCookies},body:JSON.stringify({message:'Show '+id,contextApplicationId:id})});
assert.equal(foreign.status,200);const privateAnswer=await foreign.json();assert.equal(privateAnswer.references.length,0);assert.match(privateAnswer.text,/could not find/);
const anonymous=await fetch(origin+'/api/chat',{method:'POST',headers:{origin,'Content-Type':'application/json'},body:JSON.stringify({message:'Show '+id})});assert.equal(anonymous.status,401);
console.log('PASS: workflow, document upload, chat answers from live records, follow-ups, read-only behavior, input validation, session isolation and origin protection.');
