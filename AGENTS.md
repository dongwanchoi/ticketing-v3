# Ticketing V3 collaboration
Orchestrator owns docs/**, root configuration and API contract. Backend owns backend/** and its role report only; Frontend owns frontend/** and its role report only. Each agent works in its assigned worktree. No V1/V2 access or modification. No main push/merge/PR without explicit approval. Integrate reviewed commits into dev. Never commit credentials.
Read docs/api/openapi.yaml before implementation. Propose contract changes to orchestrator. Report exact commands, results, limitations and changed files. Do not call mock tests real integration.
