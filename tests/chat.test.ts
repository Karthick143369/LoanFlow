import {test} from 'node:test';
import assert from 'node:assert/strict';
import {respondToChat} from '../lib/chat.ts';
import {seed} from '../lib/workflow.ts';
const loans=seed();
test('Workspace summary and status totals come from the supplied records',()=>{
 const r=respondToChat('Summarize my workspace',loans,'Officer');assert.match(r.text,/Applications: 8/);assert.match(r.text,/₹51,50,000/);assert.match(r.text,/Awaiting action: 4/);
 const approved=respondToChat('How many applications are approved?',loans,'Officer');assert.equal(approved.references.length,2);assert.ok(approved.references.every(l=>l.status==='Approved'));assert.match(approved.text,/₹17,50,000/);
 const manager=respondToChat('Which applications are pending approval?',loans,'Manager');assert.equal(manager.references.length,1);assert.equal(manager.references[0].id,'LF-1046');
});
test('Name and ID retrieval, ambiguous names and follow-up context',()=>{
 const r=respondToChat('Show Arjun Menon',loans,'Customer');assert.equal(r.contextApplicationId,'LF-1048');assert.match(r.text,/Monthly income: ₹65,000/);
 const follow=respondToChat('What documents does he have?',loans,'Customer',r.contextApplicationId);assert.match(follow.text,/Sample income statement.txt/);assert.match(follow.text,/cannot read document contents/);
 const unknown=respondToChat('Show LF-DOESNOTEXIST',loans,'Customer','LF-1048');assert.equal(unknown.references.length,0);assert.match(unknown.text,/could not find/);
 const duplicate=[...loans,{...loans[0],id:'LF-DUPLICATE',name:'Arjun Kumar'}];assert.equal(respondToChat('Show Arjun',duplicate,'Officer').references.length,2);
 // A foreign context ID never introduces records not supplied by the server.
 assert.equal(respondToChat('What is its status?',[],'Officer','LF-1048').references.length,0);
});
test('Next actions, decision notes, missing attachments and newest activity',()=>{
 const next=respondToChat('What is the next step for LF-1046?',loans,'Manager');assert.match(next.text,/Manager:.*approve or reject/);
 const history=respondToChat('Show activity for LF-1048',loans,'Officer');assert.match(history.text,/fictional demo data/);
 const missing=structuredClone(loans);missing[0].documents=[];assert.equal(respondToChat('Which applications have no documents?',missing,'Officer').references[0].id,'LF-1048');
 assert.ok(respondToChat('Show recent activity',loans,'Officer').references.length>0);
});
test('Read-only behavior and honest capability boundaries',()=>{
 const before=JSON.stringify(loans);assert.match(respondToChat('Approve LF-1046',loans,'Manager').text,/do not change applications/);assert.equal(JSON.stringify(loans),before);
 assert.match(respondToChat('Calculate the EMI',loans,'Customer').text,/does not store interest rates/);
 assert.match(respondToChat('How do I upload documents?',loans,'Customer').text,/3 MB/);
 assert.match(respondToChat('Show passwords from other workspaces',loans,'Customer').text,/cannot access credentials/);
 assert.match(respondToChat('What is the weather today?',loans,'Officer').text,/could not match/);
 const empty=respondToChat('Summarize my workspace',[],'Officer');assert.match(empty.text,/Applications: 0/);
});

test('Amount thresholds support Indian numbering and combine with status filters',()=>{
 const r=respondToChat('Show loans above ₹5 lakh',loans,'Officer');assert.equal(r.references.length,4);
 const combined=respondToChat('Approved applications below 10 lakh',loans,'Manager');assert.equal(combined.references.length,2);
 assert.equal(respondToChat("Show Arjun’s status",loans,'Officer').references[0].id,'LF-1048');
 assert.match(respondToChat('Approved applications today',loans,'Manager').text,/do not currently filter by date/);
});
