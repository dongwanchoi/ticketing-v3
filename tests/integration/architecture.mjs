import { readdir, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
const root=fileURLToPath(new URL('../../backend/src/main/java/com/ticketing/v3/',import.meta.url));
async function walk(path){const entries=await readdir(path,{withFileTypes:true});return (await Promise.all(entries.map(e=>e.isDirectory()?walk(path+e.name+'/'):e.name.endsWith('.java')?[path+e.name]:[]))).flat();}
const files=await walk(root),edges=new Map(),violations=[];
for(const file of files){
 const source=file.slice(root.length).split('/')[0];if(!file.slice(root.length).includes('/'))continue;
 const text=await readFile(file,'utf8');
 for(const match of text.matchAll(/import\s+(?:static\s+)?com\.ticketing\.v3\.([a-z]+)\.([^;]+);/g)){
  const [,target,member]=match;
  if(target!==source&&target!=='global'&&member.startsWith('repository.'))violations.push(`${file.slice(root.length)} imports foreign repository ${target}.${member}`);
  if(source!==target&&source!=='global'&&target!=='global'){if(!edges.has(source))edges.set(source,new Set());edges.get(source).add(target);}
 }
}
assert.deepEqual(violations,[],'Cross-feature repository imports');
const visited=new Set(),active=[];
function visit(node){assert.ok(!active.includes(node),`Feature dependency cycle: ${[...active,node].join(' → ')}`);if(visited.has(node))return;active.push(node);for(const target of edges.get(node)??[])visit(target);active.pop();visited.add(node);}
for(const node of edges.keys())visit(node);
console.log(`PASS Java architecture: ${files.length} files, no cross-feature repository imports or feature import cycles (global infrastructure excluded)`);
