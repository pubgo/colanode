# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Colanode is a local-first collaboration workspace focused on desktop and web clients in this branch. Data is stored locally (SQLite) and collaborative content uses CRDTs (Yjs).

## Monorepo Structure

- `apps/desktop` - Electron desktop app
- `apps/web` - Vite + React web app
- `packages/core` - shared types/schemas/registry
- `packages/client` - local data layer, queries/mutations/services
- `packages/crdt` - Yjs wrapper and CRDT helpers
- `packages/ui` - shared React UI components
- `scripts` - asset generation and seed helpers

## Common Commands

From repository root:

- `npm install`
- `npm run build`
- `npm run lint`
- `npm run test`

Run apps directly:

- `cd apps/desktop && npm run dev`
- `cd apps/web && npm run dev`

## Local-First Notes

- Prioritize local writes and local reads.
- Keep `apps/*` thin; put reusable behavior in `packages/*`.
- For client operations, follow existing query/mutation handler patterns in `packages/client/src/{queries,mutations,handlers}`.
- Prefer Kysely access patterns already present in the codebase.

## Testing

- Web tests are in `apps/web` (Vitest).
- Validate desktop behavior manually when test coverage does not apply.

## Development Tips

- Mirror nearby file/folder naming and import grouping conventions.
- Prefer incremental, verifiable changes.
- For larger refactors, run a quick desktop smoke test (`LOCAL_ONLY=true`).
