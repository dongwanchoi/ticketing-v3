// Generates fresh fixture identities privately. Actual buyer signup occurs in browser.
import { randomBytes, randomUUID } from 'node:crypto';
import { writeFile } from 'node:fs/promises';
const accounts={};
for(const role of ['seller','admin','buyer']) accounts[role]={email:`v3-${role}-${randomUUID()}@example.test`,password:randomBytes(24).toString('base64url')};
await writeFile(process.env.V3_E2E_ACCOUNTS??'/tmp/ticketing-v3-e2e-accounts.json',JSON.stringify(accounts),{mode:0o600});
console.log('PASS generated fresh fixture identities privately; provision NEW seller/admin via trusted CLI; buyer will register through browser.');
