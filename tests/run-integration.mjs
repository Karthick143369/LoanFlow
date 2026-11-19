import {spawn} from 'node:child_process';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {randomBytes} from 'node:crypto';
const dir=await mkdtemp(join(tmpdir(),'loanflow-test-'));
const env={...process.env,LOCAL_DATABASE_PATH:join(dir,'db'),DATABASE_URL:'',SESSION_SECRET:randomBytes(32).toString('hex'),LOANFLOW_DIST_DIR:'.next-integration',NEXT_TELEMETRY_DISABLED:'1',TEST_BASE_URL:'http://127.0.0.1:4012'};
function run(command,args){return new Promise((resolve,reject)=>{const p=spawn(command,args,{env,stdio:'inherit'});p.on('error',reject);p.on('exit',code=>code===0?resolve():reject(Error(command+' exited '+code)))})}
let server;
try{
 await run(process.execPath,['scripts/migrate.mjs']);
 server=spawn(process.execPath,['node_modules/next/dist/bin/next','dev','--hostname','127.0.0.1','--port','4012'],{env,stdio:['ignore','pipe','pipe']});
 await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('Server startup timed out')),30000);server.on('error',reject);server.on('exit',code=>reject(Error('Server exited '+code)));server.stdout.on('data',chunk=>{const s=String(chunk);process.stdout.write(s);if(s.includes('Ready in')){clearTimeout(timer);resolve()}});server.stderr.on('data',chunk=>process.stderr.write(chunk));});
 await run(process.execPath,['tests/workflow.mjs']);
}catch(e){console.error(e);process.exitCode=1}finally{if(server){server.kill('SIGTERM');await new Promise(resolve=>server.once('exit',resolve));}await rm(dir,{recursive:true,force:true});}
