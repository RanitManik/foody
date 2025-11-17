<!-- Copilot instructions for AI coding agents working on the Foody monorepo -->

# Quick Purpose

This file tells AI coding agents how to be immediately productive in the Foody monorepo: where to look, which commands to run, and the repository-specific conventions to follow. Prefer concrete, discoverable patterns from the codebase (files and scripts referenced below).

# Quick Start Commands (use these exactly)

- Install deps: `npm install` (this repo uses npm workspaces)
- Dev (both): `npm run dev` (runs `nx run-many --target=dev --parallel`)
- Dev API only: `npm run dev:api` (runs `nx dev @foody/api`)
- Dev Web only: `npm run dev:web` (runs `nx dev @foody/web`)
- Build all: `npm run build` (runs `nx run-many --target=build --all`)
- Run tests: `npm run test` (runs Nx test targets)
- E2E tests: `npm run e2e` or `npm run e2e:api` / `npm run e2e:web`
- Database lifecycle: `npm run db:setup`, `npm run db:migrate`, `npm run db:reset`, `npm run db:seed`

# High-level Architecture (where to look)

- Backend (GraphQL + Express): `api/`
    - Entry points: `api/src/main.ts`, `api/src/graphql-server.ts`, `api/src/plugins.ts`
    - GraphQL schemas & resolvers: `api/src/graphql/` (domain folders: `auth`, `menu`, `order`, `user`, `restaurant`)
    - Middleware: `api/src/middleware/` (logging, rate-limit, security, error-handler)
    - Metrics & health: `api/src/metrics/` and `api/src/middleware/health*`
- Database: `prisma/`
    - Schema: `prisma/schema.prisma`
    - Migrations: `prisma/migrations/`
    - Seed script: `api/scripts/database/seed.ts` (invoked via `npm run db:seed`)
- Frontend: `web/`
    - Next.js app router: `web/src/app/` (example: `web/src/app/layout.tsx`, `page.tsx`)
- Tests & CI
    - API e2e: `api-e2e/`; Playwright e2e: `web-e2e/` (`web-e2e/playwright.config.ts`)
    - CI Workflow: `.github/workflows/ci.yml` (Nx-aware)

# Project-specific Conventions & Patterns

- Prefer Nx invocations: almost all actions should be run through `nx` (via npm scripts). See `AGENTS.md` and `package.json` scripts — use `npx nx` or `npm run <script>` rather than calling underlying tools directly.
- GraphQL structure: each domain follows a folder-per-feature pattern under `api/src/graphql/<domain>/` with `schema.ts` + `resolver.ts`. When adding fields, update the schema and resolver here.
- Middleware pipeline: express middlewares are in `api/src/middleware/`. Authentication and RBAC are applied centrally — changing auth behavior likely impacts many resolvers.
- Prisma workflow: migrations live in `prisma/migrations`. Use `npm run db:migrate` to apply changes locally and `npm run db:generate` to refresh the client.
- Environment files: templates are at `api/.env.example` and `web/.env.example`; local dev expects these to be copied to `.env` / `.env.local`.

# Integration & External Dependencies

- PostgreSQL: configured via `DATABASE_URL` (see `api/.env.example`) — schema lives in `prisma/schema.prisma`.
- Redis: optional but used for caching and rate-limit (see `api/src/lib` and `api/package.json` deps).
- Auth: JWT-based; look at `api/src/lib/auth` and `api/src/graphql/auth` for token handling and role checks.
- Payments: Stripe/PayPal integration is referenced in README and likely under `api/src/payment` modules.

# Testing & Debugging Notes

- Tests run via Nx: `npm run test` delegates to `nx`. Prefer running project-scoped commands (e.g., `npm run test:api`) when iterating.
- E2E tests: `npm run e2e` runs Nx e2e targets; Playwright config is under `web-e2e/`.
- Debugging the API: main runtime code is built via Nx and run with `nx dev @foody/api`. Logs are emitted by Winston; check `api/src/middleware/logging.ts` and `api/src/plugins.ts` for telemetry hooks.

# Common Gotchas (observed from repo)

- Always use Nx for build/test to get correct dependency-order and cached builds; running raw `tsc` or unrelated build commands can lead to stale artifacts.
- Database resets are destructive: `npm run db:reset` is `prisma migrate reset --force` — run only in disposable local environments or test containers.
- When modifying GraphQL schema/migrations: run `npm run db:generate` and update Prisma client before running the server.

# What to change in PRs (agent guidance)

- Keep changes small and focused per domain (e.g., `api/src/graphql/order/*`) and run the relevant tests locally: `npm run test:api` and `npm run e2e:api` when touching API behavior.
- If you add a database column/table, add a Prisma migration under `prisma/migrations/`, run `npm run db:migrate` locally, and update the seed file if needed.
- Update the README or domain README when you add new top-level scripts or health endpoints.

# If Something's Missing

- If you need clarification about run commands or environment setup, check `package.json` scripts, `AGENTS.md` and `README.md` (top-level). If environment templates are not present, ask for the `.env` values rather than guessing secrets.

---

Please review these instructions and tell me any area you'd like expanded (debugging tips, example PR checklist, or more file-level references).
