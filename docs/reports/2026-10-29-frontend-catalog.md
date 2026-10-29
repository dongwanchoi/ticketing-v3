# Frontend agent — public catalog slice

## Ownership and changes
Worktree `/workspace/ticketing-v3-frontend`, branch `feat/frontend-v3`; changes restricted to `frontend/**` and this report. Started from contract commit a082824 while backend developed independently. No V1/V2, main, or shared contract edits.

Implemented responsive Korean catalog cards, integer KRW formatting, loading/error/empty/retry states, strict runtime response validation and abort-safe fetch lifecycle. Browser calls same-origin `/api/performances`; Next rewrites to V3 backend port 18080. Frontend port 13000. No production mock fallback. No misleading reservation/detail buttons before those endpoints exist.

## Versions and decisions
Selected exact npm versions: Next 16.4.3, React/ReactDOM 19.3.1, TypeScript 5.9.3, Tailwind and PostCSS adapter 4.3.3, Vitest 4.0.18, jsdom 27.4.0, Testing Library React 16.3.2. Lockfile committed; validated Node24.19.0/npm11.9.0. Node >=24 is project baseline.

Official registry checks: `npm view next@16.4.3 engines peerDependencies --json` reports Node>=20.9 and React19 compatible. `npm view react-dom@19.3.1 peerDependencies --json` requires React^19.3.1. `npm view vitest@4.0.18 engines --json` and jsdom27.4 engines include Node24. Tailwind adapter depends on same 4.3.3 release. Exact selected versions and transitive integrity hashes reside in package-lock.json.

Next App Router follows requested stack; Vite could simplify static catalog but would diverge from planned full application routing. Cost: larger build/runtime. Tailwind provides responsive utilities; CSS modules would avoid compiler dependency but require more stylesheet coordination. Native fetch plus a small typed validator avoids premature query-state library; a query library is an alternative once caching/mutations exist, at dependency cost. Vitest+jsdom+Testing Library exercise UI state and fetch boundaries; E2E alone is slower and API mocks alone miss rendered states. Mock tests do not establish database behavior.

Webpack build explicitly selected for predictable cloud subprocess behavior; Turbopack is an alternative to assess later. No external fonts/assets need network access at build time.

## Actual verification
- `npm install --ignore-scripts --no-fund --no-audit`: exit0, initial dependencies installed with normal integrity/TLS validation.
- `npm test`: exit0, 1 file / 6 tests passed: pending loading, contract rendering and price range, empty list, 500 then retry, malformed response rejection, network failure.
- Initial `npm run typecheck` failed in Next dependency declarations: URLPatternInput/URLPatternOptions absent from TypeScript5 standard DOM declarations. Updated Node24 types alone did not resolve it.
- Initial sandbox `npm run build` failed parsing TypeScript subprocess output; rerunning with supported elevated execution succeeded.
- Successful Next build initialized recommended tsconfig options including `skipLibCheck: true`, allowJs and generated route types. Dependency declaration checking is therefore skipped; strict application checking remains enabled. This limitation is explicit rather than claiming all vendor types validate against TS5.
- Final `npm run typecheck`: exit0.
- Repeated `npm test`: exit0, all6 tests pass, 775ms total /187ms test execution.
- Repeated `npm run build` (elevated): exit0, compiled production `/` and `/_not-found` static routes, 4 workers.
- Frozen-lockfile `npm ci --ignore-scripts --no-fund --no-audit`: exit0, 150 packages installed in6s.

## Startup and remaining scope
From frontend directory: `npm ci`, `npm run build`, `npm start`; browser origin port13000, backend origin18080. Override `TICKETING_V3_BACKEND_URL` before build if needed. No secret env values committed.

Real browser→API→MySQL integration is for coordinator validation, not claimed by component tests. Session cookies/CSRF, detail/session/seat UI, seller/admin screens, holds/payment/reservations remain unimplemented. Hold policy approval remains prerequisite for transactional flows. No quantitative speedup claim: actual agents overlapped but elapsed comparison baseline was not measured.
