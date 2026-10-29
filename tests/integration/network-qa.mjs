// Actual services with explicit network-fault injection, never mocked success data.
import {chromium} from 'playwright-core';
import {readFile} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import assert from 'node:assert/strict';
import {verifyResponse} from './contract.mjs';
const accounts=JSON.parse(await readFile(process.env.V3_E2E_ACCOUNTS,'utf8'));
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH??'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
let stage='initial-network';let p;
try{
 p=await browser.newPage({baseURL:process.env.TICKETING_V3_WEB_URL??'http://127.0.0.1:13000',viewport:{width:1280,height:900}});p.setDefaultTimeout(20000);const b=name=>p.getByRole('button',{name,exact:true});
 let blockCatalog=true,resolveCatalog;const firstCatalog=new Promise(resolve=>{resolveCatalog=resolve;});await p.route('**/api/performances*',r=>{if(blockCatalog&&r.request().method()==='GET'){blockCatalog=false;resolveCatalog(r);return;}return r.continue();});
 await p.goto('/');await p.getByRole('status').filter({hasText:'공연을 불러오는 중'}).waitFor();await(await firstCatalog).abort('failed');await p.getByRole('alert').filter({hasText:'네트워크'}).waitFor();await b('검색').click();await p.getByRole('button',{name:/ 상세 보기$/}).first().waitFor();await p.unroute('**/api/performances*');
 await p.getByLabel('공연 검색',{exact:true}).fill('no-match-'+randomUUID());await b('검색').click();await p.getByText('공개된 공연이 없습니다.',{exact:true}).waitFor();
 async function login(){await p.getByLabel('이메일',{exact:true}).fill(accounts.buyer.email);await p.getByLabel('비밀번호',{exact:true}).fill(accounts.buyer.password);await b('로그인').click();await b('로그아웃').waitFor();}
 await login();
 async function csrf(){const r=await p.request.get('/api/auth/csrf');assert.equal(r.status(),200);return r.json();}
 stage='stale-session';let token=await csrf(),headers={[token.headerName]:token.token};
 assert.equal((await p.request.post('/api/auth/logout',{headers})).status(),204);
 let r=p.waitForResponse(r=>r.request().method()==='POST'&&new URL(r.url()).pathname==='/api/auth/logout');await b('로그아웃').click();assert.equal((await r).status(),403);await p.getByRole('alert').filter({hasText:'FORBIDDEN'}).waitFor();
 r=p.waitForResponse(r=>r.request().method()==='POST'&&new URL(r.url()).pathname==='/api/auth/logout');await b('로그아웃').click();assert.equal((await r).status(),401);await b('로그인').waitFor();await login();
 const history=await(await p.request.get('/api/reservations')).json();assert.ok(history.items.length);const title=history.items[0].performanceTitle;
 const catalog=await(await p.request.get('/api/performances?q='+encodeURIComponent(title))).json(),detail=await(await p.request.get(`/api/performances/${catalog.items[0].id}`)).json(),session=detail.sessions[1];
 await p.getByLabel('공연 검색',{exact:true}).fill(title);await b('검색').click();await b(`${title} 상세 보기`).click();await b(`회차 ${session.id} 좌석 조회`).click();
 stage='stale-seat';const available=p.getByRole('button',{name:/^좌석 .+ AVAILABLE$/}),seatButton=available.nth(1),seatName=await seatButton.getAttribute('aria-label');await seatButton.click();
 const inventory=await(await p.request.get(`/api/sessions/${session.id}/seats`)).json(),chosen=inventory.items.find(s=>`좌석 ${s.label} AVAILABLE`===seatName);assert.ok(chosen);
 token=await csrf();headers={[token.headerName]:token.token};
 const competing=await p.request.post('/api/holds',{headers:{...headers,'Idempotency-Key':randomUUID()},data:{sessionId:session.id,seatIds:[chosen.seatId]}});assert.equal(competing.status(),201);const held=await competing.json();
 r=p.waitForResponse(r=>r.request().method()==='POST'&&new URL(r.url()).pathname==='/api/holds');await b('선택 좌석 선점').click();assert.equal((await r).status(),409);await p.getByRole('alert').filter({hasText:'SEAT_UNAVAILABLE'}).first().waitFor();
 assert.equal((await p.request.delete(`/api/holds/${held.id}`,{headers})).status(),204);await b('좌석 새로고침').click();await p.getByRole('button',{name:seatName,exact:true}).click();
 r=p.waitForResponse(r=>r.request().method()==='POST'&&new URL(r.url()).pathname==='/api/holds');await b('선택 좌석 선점').click();const retry=await r;assert.equal(retry.status(),201);const retryHold=await retry.json();await b('선점 해제').click();await p.getByText('선점이 해제되었습니다.',{exact:true}).waitFor();assert.equal((await(await p.request.get(`/api/holds/${retryHold.id}`)).json()).status,'RELEASED');
 await p.getByRole('button',{name:seatName,exact:true}).click();let committed,injected=false;const keys=[];
 stage='lost-response';await p.route('**/api/holds',async route=>{if(route.request().method()!=='POST')return route.continue();keys.push(route.request().headers()['idempotency-key']);if(!injected){injected=true;const actual=await route.fetch();assert.equal(actual.status(),201);committed=await actual.json();verifyResponse('POST','/api/holds',201,committed);return route.abort('failed');}return route.continue();});
 await b('선택 좌석 선점').click();await p.getByRole('alert').filter({hasText:'네트워크'}).waitFor();assert.ok(committed);
 r=p.waitForResponse(r=>r.request().method()==='POST'&&new URL(r.url()).pathname==='/api/holds');await b('선택 좌석 선점').click();const replay=await r;assert.equal(replay.status(),201);assert.equal((await replay.json()).id,committed.id);assert.equal(keys.length,2);assert.equal(keys[0],keys[1]);await p.unroute('**/api/holds');
 await b('선점 해제').click();await p.getByText('선점이 해제되었습니다.',{exact:true}).waitFor();
 stage='max4-load';const firstSession=detail.sessions[0].id;const loaded=p.waitForResponse(r=>r.request().method()==='GET'&&new URL(r.url()).pathname===`/api/sessions/${firstSession}/seats`);await b(`회차 ${firstSession} 좌석 조회`).click();assert.equal((await loaded).status(),200);await p.waitForFunction(id=>[...document.querySelectorAll('p')].some(e=>e.textContent.startsWith(`회차 #${id} ·`)),firstSession);const grid=p.locator('.seat-grid'),five=grid.getByRole('button',{name:/^좌석 .+ AVAILABLE$/});stage='max4-select';const labels=await five.evaluateAll(elements=>elements.map(e=>e.getAttribute('aria-label')));assert.ok(labels.length>=5);for(let n=0;n<4;n++){stage='max4-select-'+n;await grid.getByRole('button',{name:labels[n],exact:true}).click();}assert.ok(await grid.getByRole('button',{name:labels[4],exact:true}).isDisabled());stage='max4-deselect';const selected=grid.getByRole('button',{pressed:true});while(await selected.count())await selected.first().click();
 await p.setViewportSize({width:390,height:844});assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 console.log('PASS real browser fault QA: network recovery; stale-session403→explicit401logout→reauth; stale-seat409→explicitretry; lost committed hold response→same-key replay; max4; mobile390');
}catch(e){let text=p?await p.locator('body').innerText().catch(()=>'<unavailable>'):'';for(const a of Object.values(accounts))for(const value of Object.values(a))if(typeof value==='string')text=text.replaceAll(value,'[fixture-redacted]');console.error('Visible QA failure state: '+text.slice(-6000));throw new Error(`${stage} ${e.name}: ${String(e.message).split('Call log:')[0].split('\n').slice(0,2).join(' ')}`);}finally{await browser.close();}
