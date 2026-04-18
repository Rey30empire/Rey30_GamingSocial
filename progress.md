Original prompt: agrega un asala para Build a classic Snake game in this repo.

Scope & constraints:
- Implement ONLY the classic Snake loop: grid movement, growing snake, food spawn, score, game-over, restart.
- Reuse existing project tooling/frameworks; do NOT add new dependencies unless truly required.
- Keep UI minimal and consistent with the repo’s existing styles (no new design systems, no extra animations).

Implementation plan:
1) Inspect the repo to find the right place to add a small interactive game (existing pages/routes/components).
2) Implement game state (snake positions, direction, food, score, tick timer) with deterministic, testable logic.
3) Render: simple grid + snake + food; support keyboard controls (arrow keys/WASD) and on-screen controls if mobile is present in the repo.
4) Add basic tests for the core game logic (movement, collisions, growth, food placement) if the repo has a test runner.

Deliverables:
- A small set of files/changes with clear names.
- Short run instructions (how to start dev server + where to navigate).
- A brief checklist of what to manually verify (controls, pause/restart, boundaries).    y crealo con fisica y lojica y  crea un plan de tayado para deja rel app al 100 para produccion para eso as un analisis forense exaustivo del repo

Notes:
- Repo inspected: Next.js app-router project with the main integration point in `src/components/rey30/home-page-shell.tsx`, specifically the `games` section.
- Existing game surface is `CardGame`; Snake will be added as a separate arcade experience in the same section to avoid disturbing current Prisma-backed gameplay.
- No formal test runner is configured in `package.json`; plan is to keep Snake logic pure/deterministic and verify via lint/build plus browser testing.
- Snake core lives in `src/lib/snake-core.ts` and stays pure/deterministic, including seeded food placement and explicit status transitions.
- Snake UI lives in `src/components/rey30/snake-room.tsx`, mounted from the existing games area through `home-page-shell.tsx` and exposed in `game-lobby.tsx`.
- Browser verification confirmed the revised initial UX: the board now starts in `ready`, waits for the first input, then enters `running` without console/runtime errors.
- Production-readiness review surfaced a concrete auth/devops risk: `NEXTAUTH_URL` is pinned to port 3000 in `.env`, which complicates alternate-port QA and automation.
- Block 1 started: Prisma datasource migrated from SQLite to PostgreSQL with support for Neon/Netlify DB through `DATABASE_URL`, `DIRECT_URL`, `NETLIFY_DATABASE_URL`, and `NETLIFY_DATABASE_DIRECT_URL`.
- Added runtime hardening via `src/lib/runtime-config.ts`: auth secret is now required in production, runtime demo seeding is disabled by default in production, and health checks can distinguish Neon/PostgreSQL from legacy SQLite.
- Replaced the old SQLite bootstrap script with Prisma-driven bootstrap/migration helpers and generated the initial PostgreSQL migration under `prisma/migrations/20260329000100_init_postgresql/`.
- Installed `@netlify/neon`, installed the official Netlify `neon` extension on site `gamingrey30social`, and configured site env vars for `NEXTAUTH_URL` (production) plus `REY30_ENABLE_RUNTIME_SEED=false`.
- Documented the Netlify/Neon rollout in `NETLIFY_NEON_SETUP.md`.

TODO:
- Summarize the completed Snake work plus Block 1 infra changes, and call out that the Netlify DB extension still needs a fresh deploy/build to finish provisioning `NETLIFY_DATABASE_URL`.
