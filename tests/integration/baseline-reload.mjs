// Run ONLY against dev13f40e6 frontend to reproduce Issue1; this is not a passing readiness check.
import {chromium} from 'playwright-core';
import {readFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const accounts=JSON.parse(await readFile(process.env.V3_E2E_ACCOUNTS,'utf8'));
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH??'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
try{
 const p=await browser.newPage({baseURL:process.env.TICKETING_V3_WEB_URL??'http://127.0.0.1:13000'});await p.goto('/');
 await p.getByLabel('이메일',{exact:true}).fill(accounts.buyer.email);await p.getByLabel('비밀번호',{exact:true}).fill(accounts.buyer.password);await p.getByRole('button',{name:'로그인',exact:true}).click();await p.getByRole('button',{name:'로그아웃',exact:true}).waitFor();
 const history=await (await p.request.get('/api/reservations')).json();assert.ok(history.items.length);
 const title=history.items[0].performanceTitle;await p.getByLabel('공연 검색',{exact:true}).fill(title);await p.getByRole('button',{name:'검색',exact:true}).click();await p.getByRole('button',{name:`${title} 상세 보기`,exact:true}).click();
 const catalog=await(await p.request.get('/api/performances?q='+encodeURIComponent(title))).json();const detail=await(await p.request.get(`/api/performances/${catalog.items[0].id}`)).json();
 await p.getByRole('button',{name:`회차 ${detail.sessions[1].id} 좌석 조회`,exact:true}).click();await p.getByRole('button',{name:/^좌석 .+ AVAILABLE$/}).first().click();
 const response=p.waitForResponse(r=>r.request().method()==='POST'&&new URL(r.url()).pathname==='/api/holds');await p.getByRole('button',{name:'선택 좌석 선점',exact:true}).click();const held=await response;assert.equal(held.status(),201);const hold=await held.json();
 await p.getByRole('heading',{name:'선점 및 모의 결제',exact:true}).waitFor();await p.reload();await p.getByRole('button',{name:'로그아웃',exact:true}).waitFor();
 const state=await p.request.get(`/api/holds/${hold.id}`);assert.equal(state.status(),200);assert.equal((await state.json()).status,'ACTIVE');
 assert.equal(await p.getByRole('heading',{name:'선점 및 모의 결제',exact:true}).count(),0);assert.equal(await p.getByRole('button',{name:`선점 ${hold.id} 복원`,exact:true}).count(),0);
 console.log('REPRODUCED baseline defect: UI-created ACTIVE hold remains on server but refresh loses payment/release/restore controls');
}catch(e){throw new Error(`${e.name}: ${String(e.message).split('Call log:')[0].split('\n')[0]}`);}finally{await browser.close();}
