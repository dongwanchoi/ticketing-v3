# Ticketing V3 frontend
Node >=24.0 (validated on 24.19.0). `npm ci`, `npm test`, `npm run typecheck`, `npm run build`.
Start backend on V3 port 18080, then `npm run dev` (V3 port 13000). Browser requests `/api/performances`; Next rewrites to backend. Override TICKETING_V3_BACKEND_URL before build/start for other V3-only backend origins. No mock fallback exists in production. Tests stub fetch explicitly. This slice is public catalog only, with no reservation/detail links until contracts exist.
