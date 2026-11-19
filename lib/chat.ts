import type {Loan,Role,Status} from './workflow.ts';

export type ChatReference={id:string;name:string;status:Status};
export type ChatAnswer={text:string;references:ChatReference[];suggestions:string[];contextApplicationId:string|null};
const money=(n:number)=>new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR',maximumFractionDigits:0}).format(n);
const normalize=(s:string)=>s.toLowerCase().replace(/[’']s\b/g,'').replace(/[’']/g,'').replace(/[^a-z0-9-]+/g,' ').trim();
const date=(s:string)=>new Date(s).toLocaleString('en-IN',{timeZone:'Asia/Kolkata',dateStyle:'medium',timeStyle:'short'});
const pending:Status[]=['Submitted','Under review','Awaiting approval'];
const choices=['Summarize my workspace','Which applications need attention?','How does the approval workflow work?'];
function answer(text:string,loans:Loan[]=[],suggestions=choices,context:string|null=null):ChatAnswer{return {text,references:loans.map(l=>({id:l.id,name:l.name,status:l.status})),suggestions,contextApplicationId:context};}
function nextStep(l:Loan){switch(l.status){case 'Draft':return l.documents.length?'Customer: open the draft and submit it.':'Customer: attach a supporting document, then submit the draft.';case 'Submitted':return 'Officer: open the application and start review.';case 'Under review':return 'Officer: inspect the documents, write a reason, and recommend for approval.';case 'Awaiting approval':return 'Manager: review the recommendation and approve or reject with a reason.';case 'Approved':case 'Rejected':return 'This decision is final in this demo. Reviewers can still add notes.';}}
function brief(l:Loan){return `${l.id} · ${l.name} — ${money(l.amount)} · ${l.status}`;}
function followups(l:Loan){return [`Show documents for ${l.id}`,`Show activity for ${l.id}`,`What is the next step for ${l.id}?`];}

/** Grounded read-only intent matching. No model, arbitrary SQL, or external data transmission. */
export function respondToChat(message:string,loans:Loan[],role:Role,contextApplicationId:string|null=null):ChatAnswer{
 const q=normalize(message);
 if(/\b(approve|reject|delete|submit|edit|update|change|upload|create|recommend)\b/.test(q)&&!/\b(how|who|can|steps?|what|why|where|workflow|documents?|help)\b/.test(q)&&!/(approved|rejected|submitted)/.test(q))return answer('I can explain and find information, but I do not change applications. Open the application and use the appropriate Customer, Officer, or Manager action so the workflow checks and activity history are preserved.');
 if(/\b(interest|apr|emi|eligib\w*|credit score|creditworthiness|real loan|loan advice)\b/.test(q))return answer('This demo does not store interest rates, calculate EMI, assess creditworthiness, or determine eligibility. I can show recorded loan amounts, income, tenure, status, and the recorded decision history.');
 if(/\b(api key|password|secret|session token|environment variables|other (users?|workspaces?)|all users)\b/.test(q))return answer('I can only read application records in your current browser-session workspace. I cannot access credentials, other workspaces, or account information.');
 if(/\b(workflow|how (do|does|can|to|should|is).*(approval|approve|apply|submit|upload|review)|roles?|personas?|who can|what can i do|how does)\b/.test(q)){
  if(/upload|document/.test(q))return answer('To attach documents: switch to Customer, open a Draft application, select Documents, and choose a PDF, PNG, JPG, or text file up to 3 MB. Each application supports up to five files. A supporting document is required before submission. I can list attachments, but I do not read or extract their contents.');
  return answer(`The workflow is Draft → Submitted → Under review → Awaiting approval → Approved or Rejected.\n\nCustomer creates and edits drafts, attaches documents, and submits. Officer starts review and recommends with a reason. Manager approves or rejects with a reason. Approved and Rejected are final states.\n\nYou are currently viewing as ${role}. Use the persona selector in the top bar to explore each stage.`,[],['Which applications need attention?','How do I upload documents?','Summarize my workspace']);
 }
 if(/\b(export|csv|download report)\b/.test(q))return answer('Use Export report above the applications table. The CSV includes the applications matching your current table filters, with ID, applicant, purpose, amount, and status. To download a supporting file, open its application and choose Documents.');
 if(/\b(architecture|tech stack|technology|technologies|built with|database|deploy|vercel|github|storage)\b/.test(q))return answer('LoanFlow uses React, TypeScript, Next.js, and PostgreSQL. Production requires DATABASE_URL and SESSION_SECRET in Vercel. Supporting files are stored in PostgreSQL for this small demo; local development can use PGlite. The chatbot uses built-in intent matching and live workspace data, so no AI API key is required. See README.md for deployment instructions.');
 if(/\b(help|hello|hi|hey|what can you|capabilities)\b/.test(q))return answer('Hi! I can summarize your pipeline, find applications by name or ID, list statuses and amounts, show attachment metadata and recent activity, and explain the next step. Try “Show Arjun Menon”, “Which applications are approved?”, or “How do I upload documents?”. I am a built-in workspace assistant, not a general-purpose AI model.');
 const explicitIds=message.match(/\bLF-[a-zA-Z0-9]+\b/gi)||[];
 let matches=loans.filter(l=>explicitIds.some(id=>id.toLowerCase()===l.id.toLowerCase()));
 if(explicitIds.length&&!matches.length)return answer('I could not find that application ID in your current workspace. Check the ID or ask me to list all applications.');
 if(!matches.length){matches=loans.filter(l=>{const name=normalize(l.name);const words=name.split(' ').filter(x=>x.length>=3);return q.includes(name)||words.some(w=>q.split(' ').includes(w));});}
 // Use context only for clearly referential follow-ups; unrelated questions must not reuse it.
 if(!matches.length&&/\b(it|its|this application|that application|their|his|her|them|documents|activity|history|next step|income|tenure|email|status)\b/.test(q)&&!/\b(all|applications|workspace|pipeline|total|which|list)\b/.test(q))matches=loans.filter(l=>l.id===contextApplicationId);
 if(matches.length){
  if(matches.length>1)return answer('I found these matching applications. Choose an application below, or ask again with its exact ID.\n\n'+matches.map(brief).join('\n'),matches,[],null);
  const l=matches[0];
  if(/\b(documents?|attachments?|files?)\b/.test(q))return answer(l.documents.length?`${l.name} (${l.id}) has ${l.documents.length} attachment(s):\n\n${l.documents.map(d=>`• ${d.name} — ${d.sample?'fictional sample':Math.max(1,Math.ceil(d.size/1024))+' KB'}`).join('\n')}\n\nOpen the application’s Documents tab to download them. I can report filenames and sizes, but I cannot read document contents.`:`${l.name} (${l.id}) has no attachments. ${nextStep(l)}`,[l],followups(l),l.id);
  if(/\b(history|activity|notes?|reason|why)\b/.test(q))return answer(`${l.name} (${l.id}) — ${l.status}\n\n`+l.history.slice(0,10).map(h=>`${date(h.at)} · ${h.role}\n${h.text}`).join('\n\n')+(l.history.length>10?'\n\nShowing the latest 10 events. Open Activity to see the full history.':''),[l],followups(l),l.id);
  if(/next|attention|action|do now/.test(q))return answer(`${l.name} (${l.id}) is ${l.status}.\n\n${nextStep(l)}\n\nCurrent persona: ${role}.`,[l],followups(l),l.id);
  return answer(`${l.name} · ${l.id}\nStatus: ${l.status}\nPurpose: ${l.purpose}\nRequested amount: ${money(l.amount)}\nMonthly income: ${money(l.income)}\nTenure: ${l.term} months\nEmail: ${l.email}\nCreated: ${date(l.created)}\nAttachments: ${l.documents.length}\n\nNext step: ${nextStep(l)}`,[l],followups(l),l.id);
 }
 if(/\b(recent|latest)\b/.test(q)&&/\b(activity|history|events?|notes?)\b/.test(q)){
  const events=loans.flatMap(l=>l.history.map(h=>({...h,loan:l}))).sort((a,b)=>b.at.localeCompare(a.at)).slice(0,8);
  return answer(events.length?'Latest recorded activity:\n\n'+events.map(e=>`${e.loan.id} · ${e.loan.name}\n${date(e.at)} · ${e.role}: ${e.text}`).join('\n\n'):'There is no recorded activity in this workspace.',Array.from(new Map(events.map(e=>[e.loan.id,e.loan])).values()));
 }
 if(/\b(missing|without|no)\b/.test(q)&&/\b(documents?|attachments?|files?)\b/.test(q)){const found=loans.filter(l=>!l.documents.length);return answer(found.length?`${found.length} application(s) have no attachments:\n\n`+found.map(brief).join('\n'):'Every application in this workspace has at least one attachment. This does not verify the contents or completeness of those documents.',found);}
 if(/\b(today|yesterday|last week|last month|this week|this month)\b/.test(q)&&/\b(applications?|loans?|approved|rejected|draft|submitted|pipeline|activity|status)\b/.test(q))return answer('I do not currently filter by date. I can filter by status or requested amount, show recent activity, and find an application by name or ID.');
 const amountMatch=message.toLowerCase().replace(/₹/g,'').match(/\b(above|over|greater than|more than|at least|below|under|less than|at most)\s*(?:rs\.?|inr|rupees)?\s*([0-9][0-9,]*(?:\.[0-9]+)?)\s*(crores?|cr|lakhs?|lacs?|l|k|thousand|million)?\b/);
 const units:Record<string,number>={crore:10000000,crores:10000000,cr:10000000,lakh:100000,lakhs:100000,lac:100000,lacs:100000,l:100000,k:1000,thousand:1000,million:1000000};
 const threshold=amountMatch?Number(amountMatch[2].replaceAll(',',''))*(units[amountMatch[3]]||1):0;
 const matchesAmount=(l:Loan)=>{if(!amountMatch)return true;switch(amountMatch[1]){case 'at least':return l.amount>=threshold;case 'at most':return l.amount<=threshold;case 'below':case 'under':case 'less than':return l.amount<threshold;default:return l.amount>threshold}};
 if(/\bbetween\b/.test(q)&&/\b(amount|loans?|applications?)\b/.test(q))return answer('I support one requested-amount threshold at a time. Try “Show loans above ₹5 lakh” or “Approved applications below ₹10 lakh”.');
 const wantsPending=/\b(pending|attention|queue|action|in progress)\b/.test(q);
 const wanted:Status[]=[];
 if(/\b(approved|accepted)\b/.test(q))wanted.push('Approved');
 if(/\b(rejected|declined)\b/.test(q))wanted.push('Rejected');
 if(/\b(drafts?|unsubmitted)\b/.test(q))wanted.push('Draft');
 if(/\b(submitted|new submissions?)\b/.test(q))wanted.push('Submitted');
 if(/\b(under review|being reviewed|in review)\b/.test(q))wanted.push('Under review');
 if(/\b(awaiting approval|waiting for approval|pending approval|approval pending|manager decisions?)\b/.test(q))wanted.push('Awaiting approval');
 if(wantsPending||wanted.length||amountMatch){const found=loans.filter(l=>(wanted.length?wanted.includes(l.status):wantsPending?pending.includes(l.status):true)&&matchesAmount(l));const title=(wanted.length?wanted.join(' / '):wantsPending?'Pending review or decision':'Requested amounts')+(amountMatch?' '+amountMatch[1]+' '+money(threshold):'');return answer(`${title}: ${found.length} application(s), requested amount ${money(found.reduce((s,l)=>s+l.amount,0))}.`+(found.length?'\n\n'+found.map(l=>brief(l)+(wantsPending?'\n'+nextStep(l):'')).join('\n'):'\nNo applications match in this workspace.'),found);}
 if(/\b(highest|largest|biggest|lowest|smallest)\b/.test(q)&&/\b(amount|loan|application)\b/.test(q)){const sorted=[...loans].sort((a,b)=>a.amount-b.amount);const l=/lowest|smallest/.test(q)?sorted[0]:sorted.at(-1);return l?answer(`The ${/lowest|smallest/.test(q)?'smallest':'largest'} requested loan is:\n\n${brief(l)}\n\n${nextStep(l)}`,[l],followups(l),l.id):answer('There are no applications in this workspace yet.');}
 if(/\b(all|list|show|find)\b/.test(q)&&/\b(applications?|applicants?|loans?)\b/.test(q))return answer(loans.length?`${loans.length} applications in this workspace:\n\n`+loans.map(brief).join('\n'):'There are no applications yet. Use New application in Customer mode.',loans);
 if(/\b(summary|summarize|overview|pipeline|workspace|total|how many|statistics|stats|my applications)\b/.test(q)){
 const total=loans.reduce((s,l)=>s+l.amount,0);const approved=loans.filter(l=>l.status==='Approved');return answer(`Workspace summary\n\nApplications: ${loans.length}\nTotal requested: ${money(total)}\nApproved amount: ${money(approved.reduce((s,l)=>s+l.amount,0))}\nAwaiting action: ${loans.filter(l=>pending.includes(l.status)).length}\n\n`+(['Draft','Submitted','Under review','Awaiting approval','Approved','Rejected'] as Status[]).map(s=>`${s}: ${loans.filter(l=>l.status===s).length}`).join('\n')+`\n\nCurrent persona: ${role}. These figures are from the whole workspace, not the table’s current filters.`);
 }
 if(/document|attachment|upload/.test(q))return answer('Ask for attachments using an application name or ID, for example “Show documents for LF-1048”. I can list filenames and sizes, not read document contents. To upload: Customer → Draft application → Documents. Supported types: PDF, PNG, JPG and text; 3 MB per file, five files per application.');
 return answer('I could not match that question to the information I can retrieve. Ask about an application by name or ID, pipeline totals, a status, documents, activity, or the workflow. I do not search the web or read document contents.',[],choices);
}
