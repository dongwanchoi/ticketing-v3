import { chromium } from 'playwright-core';
import { readFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import assert from 'node:assert/strict';
import { watchContracts } from './contract.mjs';
const accounts=JSON.parse(await readFile(process.env.V3_E2E_ACCOUNTS??'/tmp/ticketing-v3-e2e-accounts.json','utf8'));
const title=`MVP-${randomUUID()}`,venue=`Venue-${randomUUID()}`;
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH??'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
let page;
try {
 page=await browser.newPage({viewport:{width:1280,height:900}});page.setDefaultTimeout(20000);
 const finishContracts=await watchContracts(page);
 await page.goto(process.env.TICKETING_V3_WEB_URL??'http://127.0.0.1:13000');
 const button=(name)=>page.getByRole('button',{name,exact:true});
 async function login(role,signup=false){await page.getByLabel('이메일',{exact:true}).fill(accounts[role].email);await page.getByLabel('비밀번호',{exact:true}).fill(accounts[role].password);await button(signup?'회원가입':'로그인').click();await button('로그아웃').waitFor();}
 async function logout(){await button('로그아웃').click();await button('로그인').waitFor();}
 async function exchange(method,path,action){const promise=page.waitForResponse(r=>r.request().method()===method&&new URL(r.url()).pathname===path);await action();const r=await promise;assert.ok(r.ok(),`${method} ${path} failed: ${r.status()}`);return r.status()===204?undefined:r.json();}
 await login('seller');await button('판매자 관리').click();
 await page.getByLabel('공연장 이름',{exact:true}).fill(venue);await page.getByLabel('좌석 행 수',{exact:true}).fill('2');await page.getByLabel('행별 좌석 수',{exact:true}).fill('3');
 await exchange('POST','/api/seller/venues',()=>button('공연장 등록').click());
 await page.getByLabel('공연장 선택',{exact:true}).selectOption({label:venue});await page.getByLabel('공연 제목',{exact:true}).fill(title);await page.getByLabel('공연 설명',{exact:true}).fill('Real browser seller/admin/buyer integration fixture');
 const performance=await exchange('POST','/api/seller/performances',()=>button('공연 등록').click());
 const sessionForm=page.getByRole('form',{name:`${title} 회차 등록`,exact:true});
 const start=new Date(Date.now()+86400000*7).toISOString().slice(0,16);
 async function session(date){await page.waitForFunction(()=>[...document.querySelectorAll('button')].some(b=>b.textContent==='회차 등록'&&!b.disabled));await page.getByLabel(`${title} 공연 시작 KST`,{exact:true}).fill(date);await page.getByLabel(`${title} 회차 가격 KRW`,{exact:true}).fill('25000');return exchange('POST',`/api/seller/performances/${performance.id}/sessions`,()=>sessionForm.getByRole('button',{name:'회차 등록',exact:true}).click());}
 const first=await session(start);await page.getByText('회차와 회차별 좌석이 등록되었습니다.',{exact:true}).waitFor();
 const second=await session(new Date(Date.now()+86400000*8).toISOString().slice(0,16));
 await page.waitForFunction(()=>[...document.querySelectorAll('button')].some(b=>b.textContent==='판매 정책 저장'&&!b.disabled));
 await page.getByLabel(`${title} 판매 상태`,{exact:true}).selectOption('OPEN');
 await exchange('PUT',`/api/seller/performances/${performance.id}/sale`,()=>page.getByRole('form',{name:`${title} 판매 정책`,exact:true}).getByRole('button',{name:'판매 정책 저장',exact:true}).click());
 await logout();
 // Public catalog must not expose pending seller registration.
 const pending=await page.request.get('/api/performances?q='+encodeURIComponent(title));assert.equal(pending.status(),200);assert.equal((await pending.json()).items.length,0);
 await login('admin');await button('관리자 검수').click();
 await exchange('POST',`/api/admin/performances/${performance.id}/review`,()=>button(`${title} 승인`).click());await logout();
 await login('buyer',true); // actual UI signup and automatic login
 await logout();await login('buyer'); // explicit UI logout and re-login
 await page.getByLabel('공연 검색',{exact:true}).fill(title);await button('검색').click();await button(`${title} 상세 보기`).click();
 await button(`회차 ${first.id} 좌석 조회`).click();
 await page.getByRole('button',{name:/^좌석 A1 AVAILABLE$/}).click();
 const hold=await exchange('POST','/api/holds',()=>button('선택 좌석 선점').click());assert.equal(hold.totalKrw,25000);
 const ttl=(new Date(hold.expiresAt).getTime()-Date.now())/1000;assert.ok(ttl>270&&ttl<=301);
 const payment=await exchange('POST',`/api/holds/${hold.id}/payments`,()=>button('모의 결제 성공 · 예매 확정').click());assert.equal(payment.status,'SUCCESS');assert.ok(payment.reservationId);
 await button('내 예매').click();await page.getByRole('heading',{name:title,exact:true}).waitFor();
 await page.setViewportSize({width:390,height:844});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 await button('공연 탐색').click();await page.getByLabel('공연 검색',{exact:true}).fill(title);await button('검색').click();await button(`${title} 상세 보기`).click();await button(`회차 ${second.id} 좌석 조회`).click();
 // Same physical seat in another session remains independently bookable.
 await page.getByRole('button',{name:/^좌석 A1 AVAILABLE$/}).click();
 const failedHold=await exchange('POST','/api/holds',()=>button('선택 좌석 선점').click());
 const failure=await exchange('POST',`/api/holds/${failedHold.id}/payments`,()=>button('모의 결제 실패').click());assert.equal(failure.status,'FAILED');assert.equal(failure.reservationId,null);
 await exchange('DELETE',`/api/holds/${failedHold.id}`,()=>button('선점 해제').click());
 await page.getByRole('button',{name:/^좌석 A1 AVAILABLE$/}).waitFor();
 await button('내 예매').click();await page.getByRole('heading',{name:title,exact:true}).waitFor();assert.equal(await page.getByRole('heading',{name:title,exact:true}).count(),1);
 await logout();
 const count=await finishContracts();
 console.log(`PASS full MVP browser: seller venue/performance/2sessions/sale → admin approval → buyer signup/login/hold/payment/history; cross-session independence; failure/release; mobile390; ${count} API responses match OpenAPI`);
} catch(error) {
 let body=page?await page.locator('body').innerText().catch(()=>'<unavailable>'):'';
 for(const account of Object.values(accounts)) for(const value of Object.values(account)) if(typeof value==='string')body=body.replaceAll(value,'[fixture-redacted]');
 console.error('Browser failure visible text (fixture identity redacted):\n'+body.slice(-6000));
 let message=String(error?.stack??error);
 for(const account of Object.values(accounts)) for(const value of Object.values(account)) if(typeof value==='string')message=message.replaceAll(value,'[fixture-redacted]');
 throw new Error(message);
} finally {await browser.close();}
