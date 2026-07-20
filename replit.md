# JEE Backlog Manager

A full-stack lecture backlog tracker for JEE aspirants. Track Physics, Chemistry, and Mathematics chapters across Class 11 and Class 12 — with a dashboard, contribution heatmap, statistics, history, and undo.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080, served at `/api`)
- `pnpm --filter @workspace/jee-backlog run dev` — run the frontend (served at `/`)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string (Supabase for production)

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React + Vite, Tailwind CSS, shadcn/ui, Recharts, next-themes, wouter, Framer Motion
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)

## Where things live

- `lib/api-spec/openapi.yaml` — source of truth for all API contracts
- `lib/db/src/schema/` — Drizzle table definitions (classes, subjects, chapters, history, dailyProgress)
- `artifacts/api-server/src/routes/` — Express route handlers by domain
- `artifacts/jee-backlog/src/` — React frontend

## Architecture decisions

- Query params (search, filter, sort) are not declared in the OpenAPI spec to avoid Orval TS2308 type collisions. They are handled by the server via `req.query` with inline Zod validation.
- Classes (Class 11, Class 12) and subjects (Physics, Chemistry, Mathematics) are seeded once and never deleted — only chapters, history, and daily_progress are reset.
- Undo stores old values in `previousValue` / `note` (JSON) so any action type can be reversed without extra tables.
- `remainingLectures` is stored explicitly (not computed) for fast queries and correct cascade behavior.

## Product

- **Dashboard** — 4 stat cards, overall progress bar, subject breakdown by class
- **Chapter view** — CRUD chapters per subject, complete/add lectures, search + filter + sort
- **History** — chronological feed of all actions, filterable by Today/Week/Month/All, with Undo
- **Calendar** — GitHub-style contribution heatmap, click a date for a breakdown popup
- **Statistics** — charts: overall, subject, class, weekly, monthly progress; top pending + recent completions
- **Settings** — light/dark mode, JSON export/import, full database reset
- **Global search** — Ctrl+K command palette searches all chapters across all subjects

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- After changing `lib/db/src/schema/`, run `pnpm run typecheck:libs` before checking artifact packages — stale declarations cause false import errors.
- After any OpenAPI spec change, run codegen before building the frontend.
- The `subjects` table has no unique constraint per class — enforced at the application layer.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
