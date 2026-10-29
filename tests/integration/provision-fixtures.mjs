// Trusted LOCAL process only. No role-escalation HTTP endpoint is introduced.
import { readFile, writeFile, mkdtemp, copyFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import assert from 'node:assert/strict';
const jar=process.env.V3_BACKEND_JAR;
assert.ok(jar,'Set V3_BACKEND_JAR to the reviewed V3 bootJar');
const runtime=await mkdtemp('/tmp/ticketing-v3-provision-');
const snapshot=runtime+'/verified-backend.jar';
await copyFile(jar,snapshot); // never execute a jar being overwritten by a parallel build
const accounts=JSON.parse(await readFile(process.env.V3_E2E_ACCOUNTS??'/tmp/ticketing-v3-e2e-accounts.json','utf8'));
for(const role of ['seller','admin']){
 const result=spawnSync(process.env.JAVA_BIN??'java',['-jar',snapshot,'--spring.main.web-application-type=none','--spring.profiles.active=provision'],{encoding:'utf8',env:{...process.env,V3_PROVISION_EMAIL:accounts[role].email,V3_PROVISION_PASSWORD:accounts[role].password,V3_PROVISION_ROLE:role.toUpperCase()},timeout:90000});
 // Keep process output local/private; never print credentials, even on failure.
 await writeFile(`/tmp/ticketing-v3-provision-${role}.log`,(result.stdout??'')+(result.stderr??''),{mode:0o600});
 assert.equal(result.status,0,`Local ${role} provisioning failed (private /tmp log retained)`);
 console.log(`PASS provisioned fresh ${role} fixture via local CLI`);
}
