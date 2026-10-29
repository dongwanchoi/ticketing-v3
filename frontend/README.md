# Ticketing V3 frontend
Node >=24 (validated 24.19.0), Next16.4.3, React19.3.1, TypeScript5.9.3, Tailwind4.3.3. Exact lockfile is committed.

From `frontend`: `npm ci`, `npm test`, `npm run typecheck`, `npm run build`, `npm start` (port13000). Development `npm run dev`. Run V3 backend port18080 first. Browser API requests are same-origin `/api/**`; Next rewrites to backend. Override `TICKETING_V3_BACKEND_URL` before build for another V3-only backend origin. No production mock fallback.

Single route `/`: browse/search/detail/session inventory, login/signup/logout, holds with server expiry and simulation-only payment, reservation history, seller venue/performance/session/sale creation, admin approval/rejection. Roles shown from authenticated server identity; server is authority. Public signup always BUYER. SELLER/ADMIN require trusted backend local provisioning.

CSRF token stays in memory and refreshes after login/logout. Session managed by HttpOnly server cookie. No tokens/passwords/identity in localStorage/sessionStorage. Hold/payment idempotency keys stay stable across ambiguous request retries in the current UI session. Failed simulated payment has no new payment retry; explicit release and existing TTL remain available. Server validates all concurrency, ownership, totals and transitions. Cancel/refund/resale are excluded.

Datetime-local management fields explicitly use KST and convert to UTC API instants. All displayed session/expiry times use Asia/Seoul. Money is integer KRW.

Tests explicitly mock API/fetch and do not prove database integration. Next uses standard skipLibCheck for vendor declaration compatibility with mandated TS5; application strict typecheck is enabled. Coordinator owns real browser/MySQL integration evidence.
