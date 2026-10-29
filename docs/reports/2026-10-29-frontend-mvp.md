# Frontend agent — full MVP implementation

## Scope and ownership
Worktree `/workspace/ticketing-v3-frontend`, branch `feat/frontend-v3`, shared contract v0.2 commit6551084 merged before implementation. Only frontend files and role reports changed. Backend and frontend work overlapped; no quantitative time-saving claim. V1/V2 and main untouched.

## Implemented flows
- `/` Workspace restores `/auth/me`, handles BUYER signup, login/logout, exact server roles and errors. Signup cannot send role selection. CSRF issued before mutations, refreshed after login/logout. Session cookie uses same-origin fetch; no localStorage/sessionStorage credentials.
- Public searchable approved catalog, detail, public session summary and KST dates; logged-in session-seat grid with available/held/booked states, max4 selection, server total after hold creation.
- Stable per-request fingerprint/key for hold retries; pending-payment key/outcome retained for ambiguous failure. Busy guards stop double-click requests. Hold expiry countdown, owner status refresh/release, simulation SUCCESS→reservation confirmation or FAILURE→disabled new payment; no card information.
- Current-user reservation history, server totals, seats and confirmed status.
- Seller physical venue row/seat creation, owned venue choice, performance creation, per-performance session KST date/uniform KRW price, common sale PREPARING/OPEN/CLOSED and both-or-neither sale dates with ordering validation.
- Admin review approve/reject buttons; server enforces ownership/self-review constraint. Role tabs are usability affordances, not security enforcement.
- Responsive layouts, keyboard focus, accessible label text, notices and loading/empty/error states. No production mock fallback.

## Changed files
Added lib/types.ts (derived from shared OpenAPI), lib/api.ts (all21 transport operations), components/workspace.tsx, buyer.tsx, management.tsx, ui.tsx; switched app/page.tsx and expanded globals.css; added tests/api.test.ts and mvp.test.tsx; updated frontend README. Original catalog tests remain as a focused client/component regression suite.

## Design reasons / alternatives / drawbacks
A single App Router page with small role components makes first MVP state transitions inspectable; multi-route app and shared state store are alternatives with better deep linking but more initial state coordination. Current active hold state is in memory; page reload loses UI reference, inventory still expires server-side (future secure hold-resume endpoint/UI is an enhancement). Native fetch avoids library dependency; typed OpenAPI-derived types prevent DTO naming drift, but runtime schema validation of every new endpoint is currently coordinator integration coverage. Existing catalog client validates its own runtime responses.
Stable random idempotency keys in refs prevent duplicate submission during a mounted session; durable storage would survive reload but needs privacy/expiry handling. No sensitive storage adopted. Explicit KST parsing avoids executor/browser timezone dependence. Server is source of truth for prices, ownership, expiry and eligibility.
No new libraries beyond previously validated pinned stack. Next standard skipLibCheck caveat persists: strict application checking succeeds; vendor declaration checking is skipped for TypeScript5 DOM incompatibilities in Next16.4.3.

## Actual verification and diagnosis
- Initial `npm test` invoked from checkout root failed ENOENT because package.json lives in frontend; rerun in documented frontend working directory.
- A first management-file write used redundant frontend prefix and failed without creating files; corrected working-directory paths before validation.
- `npm test` from frontend: exit0, **3 files /21 tests passed**, duration1.81s (test execution1.31s). Explicit mocks cover catalog six cases; buyer guest restriction, max4, server request payload, successful simulated confirmation, stable keys across ambiguous failure, history/KST, signup BUYER-only, seller row creation, sale-date validation, admin decision, failed payment/release, expiry payment block; transport CSRF refresh lifecycle, idempotency header/no client price, server errors, timezone conversion.
- `npm run typecheck`: exit0, strict application TypeScript checking.
- `npm run build` with supported elevated subprocess execution: exit0, Next16.4.3 webpack compiled in2.6s, TypeScript2.8s, static routes `/` and `/_not-found`, 4 workers.
- Actual browser→API→MySQL E2E is coordinator-owned and **not claimed by this report**. Mock success is separate from backend integration.

## Remaining boundaries
Cancel/refund/resale/new payment after failure and public seller onboarding remain deliberately outside contract. Trusted CLI provisions privileged accounts. Main merge/PR still requires user approval. Coordinator should run actual seller→admin→buyer browser flows, authentication/CSRF and concurrency tests against MySQL and report those outcomes separately.

Review follow-up: formatted frontend sources/tests with one-off `npm exec --yes --package=prettier@3.8.1 -- prettier --write ...` (exit0, no project dependency changes). `npm run typecheck` after formatting exit0. Formatting changes no API/behavior.

## Recovered-environment validation and retry correction
After environment recovery, reran existing baseline rather than relying on earlier processes: `npm test && npm run typecheck` exit0, original21 tests across3 files passed in1.83s (1.23s test execution); `npm run build` elevated exit0, compile1778ms /TypeScript1792ms, static production routes generated.

Code review found a concrete bug: after an expired/terminal hold, every attempt to create another hold cleared the request key based on old hold state. If the new request committed but its response was lost, the next attempt generated a different key. Replaced this with per-request completed tracking: a new intention gets a new key after a known completed request, while unresolved attempts keep their key. Releasing a previously displayed hold also preserves a pending request key rather than clearing it. Server ownership/integrity policy is unchanged.

Added component regression: an old expired hold followed by a new lost response generates a fresh key once, and retry sends the same new key. Current checks after fix: `npm --prefix frontend test && npm --prefix frontend run typecheck` exit0, **22 tests/3files passed**,1.83s (1.38s test execution). `npm run build` elevated exit0, compile1369ms /TypeScript1560ms, production static pages generated. These are current-instance results; browser/API/MySQL checks remain coordinator-owned.

## Authentication follow-up reliability
Review found that a successful login/logout POST followed by CSRF-refresh network failure previously rejected the entire operation, leaving UI authentication state inconsistent with the committed server action. The client now attempts required CSRF refresh after successful auth, but preserves the successful auth outcome if only that follow-up fails. The cached token is cleared and must be reacquired before the next mutation. Failed login/logout POSTs still reject normally; no identity update occurs for failed authentication.

Added transport regressions for successful login with failed follow-up token fetch, and successful logout followed by failed token fetch then fresh token acquisition before the next registration mutation. Actual current validation: `npm --prefix frontend test && npm --prefix frontend run typecheck` exit0, **24 tests /3files passed**,1.84s (1.33s test execution). Coordinator will rebuild/restart the integrated final version for real-browser verification; no unexecuted final build is claimed here.

## Actual-browser accessible-select correction
Coordinator's real seller browser flow exposed that implicit wrapping select labels included their option text in Playwright label matching, so exact `공연장 선택` did not resolve. Replaced both venue choice and per-performance sale status with separate explicit label/htmlFor and stable unique select IDs. Added regression for exact label lookup and exact role accessible names independently of dynamic option content, including actual selection changes.

Targeted current verification: `npm --prefix frontend test -- --run tests/mvp.test.tsx` exit0,13 component tests pass. Initial typecheck caught unsupported Testing Library `ByRoleOptions.exact` in the new test (string name already exact); corrected the test options and reran targeted tests plus strict `npm --prefix frontend run typecheck`, both exit0. Real-browser full flow remains coordinator-owned and was previously blocked before performance creation; this report does not claim it completed.
