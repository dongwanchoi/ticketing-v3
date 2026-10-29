import SwaggerParser from '@apidevtools/swagger-parser';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import assert from 'node:assert/strict';
const spec = await SwaggerParser.dereference(new URL('../../docs/api/openapi.yaml', import.meta.url).pathname);
const ajv = new Ajv({strict:false, allErrors:true});
addFormats(ajv);
const routes = Object.entries(spec.paths).map(([path, methods]) => ({path, methods, regex:new RegExp('^'+path.replace(/\{[^}]+\}/g,'[^/]+')+'$')}));
const cache = new Map();
export function verifyResponse(method, url, status, body) {
 const pathname = new URL(url,'http://v3.test').pathname;
 const route = routes.find(r=>r.regex.test(pathname));
 assert.ok(route,`Undocumented API path: ${pathname}`);
 const operation = route.methods[method.toLowerCase()];
 assert.ok(operation,`Undocumented method: ${method} ${route.path}`);
 const response = operation.responses[String(status)];
 assert.ok(response,`Undocumented status: ${method} ${route.path} ${status}`);
 const schema = response.content?.['application/json']?.schema;
 if (schema) {
  let validate=cache.get(schema); if(!validate) {validate=ajv.compile(schema);cache.set(schema,validate);}
  assert.ok(validate(body),`Response contract mismatch: ${method} ${route.path} ${status}: ${ajv.errorsText(validate.errors)}`);
 } else assert.ok(body===undefined||body==='',`Expected empty response ${status}`);
}
export async function watchContracts(page) {
 const pending=[];const failures=[];let count=0;
 page.on('response',response=>{
  if(!new URL(response.url()).pathname.startsWith('/api/'))return;
  pending.push((async()=>{
   const text=await response.text();
   verifyResponse(response.request().method(),response.url(),response.status(),text?JSON.parse(text):undefined);count++;
  })().catch(e=>failures.push(e.message)));
 });
 return async()=>{await Promise.all(pending);assert.deepEqual(failures,[]);return count;};
}
