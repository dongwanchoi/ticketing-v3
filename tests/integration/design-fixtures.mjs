// Synthetic design-verification records created through actual V3 APIs, not frontend mocks.
import {request} from 'playwright-core';
import {readFile,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const accounts=JSON.parse(await readFile(process.env.V3_E2E_ACCOUNTS,'utf8'));
const baseURL=process.env.V3_DESIGN_API_ORIGIN??'http://127.0.0.1:18080';
const contexts=[];
async function session(role){const c=await request.newContext({baseURL});contexts.push(c);let csrf;async function token(){const r=await c.get('/api/auth/csrf');assert.equal(r.status(),200);csrf=await r.json();}async function call(method,path,data,status=200){if(method!=='GET'&&!csrf)await token();const r=await c.fetch(path,{method,...(data===undefined?{}:{data}),headers:method==='GET'?{}:{[csrf.headerName]:csrf.token}}).catch(()=>{throw new Error(`${method} ${path} transport failure`)});assert.equal(r.status(),status,`${method} ${path}`);return status===204?undefined:r.json();}await token();await call('POST','/api/auth/login',accounts[role]);await token();return {call};}
try{
 const seller=await session('seller'),admin=await session('admin');const venue=await seller.call('POST','/api/seller/venues',{name:'모먼트 아트홀 · UI 검증용',rows:3,seatsPerRow:8},201);
 const names=['오롯이, 피아노의 밤','여름을 닮은 재즈','빛과 그림자의 무대','도시의 작은 오케스트라','우리의 다음 장면','낮과 밤 사이'];const fixtures=[];
 for(let n=0;n<names.length;n++){
  const performance=await seller.call('POST','/api/seller/performances',{title:names[n],description:'V3 리디자인 검증을 위해 실제 API로 등록한 테스트 공연입니다.\n공식 공연이나 판매 정보가 아닙니다. 포스터 이미지는 등록되어 있지 않습니다.',venueId:venue.id},201);const sessions=[];
  for(let k=0;k<2;k++)sessions.push(await seller.call('POST',`/api/seller/performances/${performance.id}/sessions`,{startsAt:new Date(Date.now()+86400000*(7+n)+3600000*k*4).toISOString(),priceKrw:45000+n*5000+k*10000},201));
  await seller.call('PUT',`/api/seller/performances/${performance.id}/sale`,{status:'OPEN',startsAt:null,endsAt:null});await admin.call('POST',`/api/admin/performances/${performance.id}/review`,{decision:'APPROVED'});fixtures.push({...performance,sessions});
 }
 await writeFile(process.env.V3_DESIGN_FIXTURES??'/tmp/ticketing-v3-ui-design-fixtures.json',JSON.stringify({venue,performances:fixtures},null,2)+'\n',{mode:0o600});console.log(`PASS ${fixtures.length} synthetic design performances/12sessions created and approved through real APIs in isolated UI DB`);
}finally{await Promise.all(contexts.map(c=>c.dispose()));}
