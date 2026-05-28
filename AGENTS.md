# Repository Guidelines

## Architecture Overview
Colanode is a local-first collaboration workspace. Clients use local SQLite storage for offline-first behavior. Real-time editing uses CRDTs (Yjs) to merge concurrent changes. Shared packages provide core types, local sync logic, and UI; see `README.md` for product context.

## Project Structure & Module Organization
- `apps/`: client apps (`web`, `desktop`).
- `packages/`: shared libraries (`core`, `client`, `ui`, `crdt`).
- `scripts/`: asset and seed tooling (postinstall runs from here).
- `assets/`: repository images used in docs.

## Development Guide (Quick Start)
- Install dependencies: `npm install`.
- Prefer running tasks in individual app/package directories; repo-level scripts run the entire monorepo.
- Run apps directly:
  - `apps/web`: `npm run dev` (Vite on port 4000)
  - `apps/desktop`: `npm run dev`

## Coding Guidelines
- Ground changes in the existing codebase. Start from the closest feature and mirror its folders, naming, and flow.
- Keep shared behavior in `packages/`; keep `apps/` thin and focused on wiring and UI.
- Client operations follow the query/mutation pattern: define typed `type: 'feature.action'` inputs/outputs in `packages/client/src/queries` or `packages/client/src/mutations`, then wire handlers in `packages/client/src/handlers`.
- Use Kysely (`database`) for SQL access and limit raw SQL.
- UI styling uses Tailwind utilities, shared styles in `packages/ui/src/styles`, and shadcn components in `packages/ui/src/components/ui`. Prefer shared components over one-off styling.
- Use `@colanode/*` imports and follow ESLint import grouping; keep filenames consistent with nearby code.

## Testing
- Tests currently live in `apps/web` and run with Vitest.
- Run `npm run test` in the relevant app directory; `npm run test` at the repo root runs them via Turbo.
- Validate changes manually where tests do not apply and note verification steps.
