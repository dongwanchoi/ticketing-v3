import assert from 'node:assert/strict';
import SwaggerParser from '@apidevtools/swagger-parser';
import { chromium } from 'playwright-core';
await SwaggerParser.validate(new URL('../../docs/api/openapi.yaml', import.meta.url).pathname);
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH ?? '/usr/bin/chromium', headless: true, args: ['--no-sandbox'] });
try {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const responsePromise = page.waitForResponse(r => new URL(r.url()).pathname === '/api/performances');
  await page.goto(process.env.TICKETING_V3_WEB_URL ?? 'http://127.0.0.1:13000');
  const response = await responsePromise;
  assert.equal(response.status(), 200);
  const { items } = await response.json();
  assert.ok(Array.isArray(items));
  for (const item of items) {
    assert.ok(Number.isSafeInteger(item.id));
    assert.equal(typeof item.title, 'string');
    assert.equal(typeof item.venueName, 'string');
    assert.ok(Number.isInteger(item.minPriceKrw) && item.minPriceKrw >= 0);
    assert.ok(Number.isInteger(item.maxPriceKrw) && item.maxPriceKrw >= item.minPriceKrw);
    await page.getByRole('heading', { name: item.title, exact: true }).waitFor();
  }
  if (!items.length) await page.getByText(/공개된 공연이 없습니다/).waitFor();
  if (process.env.EXPECTED_TITLE) assert.ok(items.some(p => p.title === process.env.EXPECTED_TITLE));
  if (process.env.HIDDEN_TITLE) assert.ok(!items.some(p => p.title === process.env.HIDDEN_TITLE));
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  console.log(`PASS catalog browser→Next proxy→API: ${items.length} items; mobile width390; schema valid`);
} finally { await browser.close(); }
