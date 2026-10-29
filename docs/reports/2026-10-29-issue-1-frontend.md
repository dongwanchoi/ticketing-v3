# Issue #1 — Frontend QA

## Baseline, ownership and continuation
Baseline `dev@13f40e6190d4da53a5e1181398fe39280fb06d59`; assigned branch `qa/issue-1-frontend`, worktree `/workspace/ticketing-v3-qa-frontend`. The interrupted QA's seven modified frontend files were preserved, reviewed and freshly validated; no reset/clean or overwrite of prior work. Shared OpenAPI0.3 commits were coordinator-approved and synchronized before implementation. Only frontend files and this role report are authored here. No V1/V2, main, publication or Issue API changes.

## Findings and minimal corrections
1. **Active hold context lost on refresh/navigation.** The baseline stores only React component state, although server inventory remains held. Added server-authoritative `GET /api/holds` client and an explicit list of all the current user's active unexpired holds. `선점 <id> 복원` revalidates ownership/expiry through existing GET-by-id and reloads session seats. No credentials, prices, expiry or hold state are persisted in browser storage. Multiple holds remain visible: no new quota or automatic release decision.
2. **Restored failed payment appeared retryable.** Optional persisted `paymentStatus` from the approved contract disables payment controls for restored FAILED/SUCCESS state; explicit release remains available where server permits it. This exposes existing state and does not authorize a payment retry policy.
3. **Expired/rejected CSRF cache poisoned explicit retries.** Cache now clears on401/403 so the user's next explicit action fetches a fresh token. Mutating requests are never replayed automatically, preserving idempotency and user intent.
4. **Logout401 left stale authenticated UI.** A server-confirmed expired session now clears local identity and returns to guest browsing. Other failures retain error feedback.
5. **Older async results replaced newer state.** Initial catalog/history/active-hold responses could arrive after a newer search/refresh/create and overwrite it. Request-generation guards reject those stale results and protect loading state.
6. **Successful mutation acknowledgement lost behind failed follow-up read.** Successful payment/release now records the acknowledged terminal state before GET refresh, so a later network read failure does not leave a false ACTIVE/payment-enabled view.
7. **Long identity/text overflow and password guidance.** Email, titles and descriptions wrap on narrow layouts; signup guidance describes the existing backend's minimum8characters/maximum72UTF-8bytes instead of inaccurately promising72characters.

## Current actual verification
Executed in this worktree after continuation at2026-10-29T10:51UTC (19:51KST):
- `cd frontend && npm test` — **PASS**, 3files/33tests,0failed; api7, catalog6, MVP20; duration3.25s, tests2.29s.
- `npm run typecheck` — **PASS**, exit0.
- `npm run build` — **PASS**, Next16.4.3 webpack production build, compile1976ms/typechecking1934ms; static routes emitted, exit0.
- `git diff --check` — **PASS** before commit.

Meaningful added regressions cover own/all-hold explicit restoration without expiry extension or automatic payment, guest privacy, FAILED restored payment disabling, stale catalog/history/list results, expired logout identity, CSRF explicit retry, and server-acknowledged state after a failed follow-up read. Component tests deliberately stub transport and do **not** establish real MySQL/browser readiness.

## QA boundaries and pending decisions
Actual Chromium→Frontend→Backend→MySQL E2E, network behavior and390px geometry are coordinator-owned and **NOT RUN by this role**; final aggregate report must use coordinator results. Baseline failure reruns are not presented as executed by this continuation; code-path inspection plus final regressions and coordinator browser reproduction provide distinct evidence. Active-hold list is fetched on mount/manual refresh, not a live push subscription; expiry/payment/release are always server-revalidated. Existing pending policies—approved-performance session re-review, cancellation/refund/resale/payment retry, role transitions and aggregate hold quota—are unchanged. No extra framework, package or lockfile change.
