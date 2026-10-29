// Bounded local observation, never a production load guarantee.
import {request} from 'playwright-core';
import {readFile,writeFile} from 'node:fs/promises';
import {randomBytes,randomUUID} from 'node:crypto';
import {performance} from 'node:perf_hooks';
import assert from 'node:assert/strict';
const accounts=JSON.parse(await readFile(process.env.V3_E2E_ACCOUNTS,'utf8'));
const origin=process.env.TICKETING_V3_WEB_URL??'http://127.0.0.1:13000';
const contexts=[],count=40,concurrency=10,rounds=3;
async function client(credentials,signup=false){
 const context=await request.newContext({baseURL:origin});contexts.push(context);let token;
 async function csrf(){const r=await context.get('/api/auth/csrf');assert.equal(r.status(),200);token=await r.json();}
 async function call(method,path,data,status=200,key){if(method!=='GET'&&!token)await csrf();const r=await context.fetch(path,{method,headers:{...(method==='GET'?{}:{[token.headerName]:token.token}),...(key?{'Idempotency-Key':key}:{})},...(data!==undefined?{data}:{})}).catch(()=>{throw new Error(`${method} ${path}: transport failure (request headers omitted)`);});assert.equal(r.status(),status,`${method} ${path} status${r.status()}`);return status===204?undefined:r.json();}
 await csrf();if(signup)await call('POST','/api/auth/register',credentials,201);await call('POST','/api/auth/login',credentials);await csrf();return {call};
}
async function parallel(items,fn){let index=0;const results=Array(items.length);await Promise.all(Array.from({length:Math.min(concurrency,items.length)},async()=>{for(;;){const n=index++;if(n>=items.length)return;results[n]=await fn(items[n],n);}}));return results;}
function stats(values){const x=[...values].sort((a,b)=>a-b),at=p=>x[Math.ceil(x.length*p)-1];return {p50Ms:at(.5),p95Ms:at(.95),maxMs:x.at(-1)};}
try{
 const seller=await client(accounts.seller),admin=await client(accounts.admin);
 const venue=await seller.call('POST','/api/seller/venues',{name:'QA benchmark '+randomUUID(),rows:2,seatsPerRow:20},201),fixtures=[];
 for(let n=0;n<5;n++){
  const p=await seller.call('POST','/api/seller/performances',{title:'QA bench '+randomUUID(),description:'Isolated bounded hold gate measurement',venueId:venue.id},201);
  const session=await seller.call('POST',`/api/seller/performances/${p.id}/sessions`,{startsAt:new Date(Date.now()+864000000).toISOString(),priceKrw:1000},201);
  await seller.call('PUT',`/api/seller/performances/${p.id}/sale`,{status:'OPEN',startsAt:null,endsAt:null});await admin.call('POST',`/api/admin/performances/${p.id}/review`,{decision:'APPROVED'});fixtures.push(session);
 }
 const buyers=[];for(let n=0;n<count;n++)buyers.push(await client({email:`qa-bench-${randomUUID()}@example.test`,password:randomBytes(24).toString('base64url')},true));
 const results=[];
 for(let round=1;round<=rounds;round++)for(const scenario of ['one-performance-distinct-seats','four-performances-distinct-seats']){
  const began=performance.now();const samples=await parallel(buyers,async(buyer,n)=>{
   const group=scenario.startsWith('one-')?0:1+n%4,seat=scenario.startsWith('one-')?n:Math.floor(n/4),started=performance.now();
   const held=await buyer.call('POST','/api/holds',{sessionId:fixtures[group].id,seatIds:[venue.seats[seat].id]},201,randomUUID());return {hold:held,buyer,ms:performance.now()-started};
  });
  const elapsedMs=performance.now()-began;results.push({scenario,round,requests:samples.length,success201:samples.length,concurrency,elapsedMs,requestsPerSecond:count/(elapsedMs/1000),...stats(samples.map(s=>s.ms))});
  await parallel(samples,async s=>s.buyer.call('DELETE',`/api/holds/${s.hold.id}`,undefined,204));
 }
 const output={measuredAt:new Date().toISOString(),path:'local Next proxy → Spring → MySQL',users:count,rounds,concurrency,authenticationExcluded:true,setupAndReleaseExcluded:true,results,limits:['single executor, small sample; no production TPS/p95 guarantee','warm application/JVM/DB; no external network latency','performance row gate serializes same-performance writes; host factors not isolated']};
 await writeFile(process.env.V3_QA_BENCHMARK_OUTPUT??'/tmp/ticketing-v3-issue1-benchmark.json',JSON.stringify(output,null,2)+'\n');console.log(JSON.stringify(output,null,2));
}finally{await Promise.all(contexts.map(c=>c.dispose()));}
