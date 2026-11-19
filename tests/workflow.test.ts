import {test} from 'node:test';
import assert from 'node:assert/strict';
import {applyAction,actionSchema} from '../lib/actions.ts';
import {seed} from '../lib/workflow.ts';
test('Only the correct persona can advance each stage and reasons are required',()=>{
 const loans=seed();
 assert.throws(()=>applyAction(loans,'Customer',{action:'review',id:'LF-1048'}),/not allowed/);
 const reviewed=applyAction(loans,'Officer',{action:'review',id:'LF-1048'});
 assert.equal(loans[0].status,'Submitted'); // original state is not mutated before persistence
 assert.equal(reviewed[0].status,'Under review');
 assert.throws(()=>applyAction(reviewed,'Officer',{action:'recommend',id:'LF-1048'}),/reason/);
 const recommended=applyAction(reviewed,'Officer',{action:'recommend',id:'LF-1048',reason:'Documents checked'});
 assert.throws(()=>applyAction(recommended,'Officer',{action:'approve',id:'LF-1048',reason:'Test'}),/not allowed/);
 const approved=applyAction(recommended,'Manager',{action:'approve',id:'LF-1048',reason:'Demo approved'});
 assert.equal(approved[0].status,'Approved');
 assert.equal(approved[0].history[0].text,'Approved: Demo approved');
 assert.throws(()=>applyAction(approved,'Manager',{action:'reject',id:'LF-1048',reason:'Test'}),/not allowed/);
});
test('Drafts can be edited but submitted applications cannot',()=>{
 const input={name:'Sample Applicant',email:'sample@example.com',purpose:'Education' as const,amount:100000,income:50000,term:24 as const};
 const created=applyAction(seed(),'Customer',{action:'create',loan:input});const id=created[0].id;
 assert.throws(()=>applyAction(created,'Customer',{action:'submit',id}),/document/);
 const edited=applyAction(created,'Customer',{action:'update',id,loan:{...input,amount:200000}});
 assert.equal(edited[0].amount,200000);
 edited[0].documents.push({id:'sample',name:'income.txt',size:10,sample:true});
 const submitted=applyAction(edited,'Customer',{action:'submit',id});
 assert.throws(()=>applyAction(submitted,'Customer',{action:'update',id,loan:input}),/Only drafts/);
});
test('Invalid inputs and blank decision reasons are rejected by parsing',()=>{
 assert.equal(actionSchema.safeParse({action:'create',loan:{name:'A',amount:-1}}).success,false);
 assert.equal(actionSchema.parse({action:'approve',reason:'   '}).reason,'');
 assert.throws(()=>applyAction(seed(),'Customer',{action:'note',id:'LF-1048',reason:'Test'}),/reviewers/);
});
