# ticketing-v3
Ticketing Service V3

## V3 development status

Initial implementation: public approved-performance catalog only. The booking MVP is **not complete**. See [delivery plan](docs/requirements/delivery-plan.md), [open decisions](docs/requirements/open-decisions.md), [OpenAPI](docs/api/openapi.yaml), and [reports](docs/reports).

- Backend: Java21 JDK, Gradle8.14.3, SpringBoot4; see backend/README.md for isolated MySQL and startup.
- Frontend: Node24, `cd frontend && npm ci && npm test && npm run typecheck && npm run build && npm start`; port13000; backend18080.
- Integration: running services plus Chromium required. `cd tests/integration && npm ci && npm test`. Optional EXPECTED_TITLE/HIDDEN_TITLE assert actual V3 DB fixtures; test never inserts data.
- Do not use V1/V2 databases or containers. No main merge/push without explicit approval.
- Future tasks use the existing isolated checkout; do not create worktrees unless explicitly requested for parallel development. Current role worktrees were explicitly requested.
