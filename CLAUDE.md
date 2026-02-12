# ResearchApp — BlueAlly AI Strategic Assessment Platform

## Stack
- React 19, Vite 7, TypeScript 5.6, Express 4, Drizzle ORM, PostgreSQL (Neon)
- Tailwind CSS v4, Recharts (charts), D3 (quadrant bubble chart), Framer Motion (animations)
- Anthropic Claude SDK, HyperFormula (calculations)
- Export: exceljs, jspdf, docx, @react-pdf/renderer

## Commands
- `npm run dev` — Start dev server (Express + Vite)
- `npm run build` — Production build
- `npm run check` — TypeScript type check
- `npm run db:push` — Push schema to Neon via drizzle-kit
- `npx vitest run` — Run tests

## Path Aliases
- `@/` → `client/src/`
- `@shared/` → `shared/`
- `@db` → `server/db.ts`

## Architecture
- 8-step AI analysis pipeline (steps 1-8 in analysisData.steps)
- Data flow: Report → `mapReportToDashboardData()` → Dashboard component
- Two rendering paths: DashboardPage (live data), SharedDashboard (shared links)
- Schema: `shared/schema.ts` (reports, sharedDashboards, bulkUpdateJobs, etc.)

## Key Files
- `client/src/components/Dashboard.tsx` — Main dashboard (hero, executive summary, matrix, use cases, friction, scenarios)
- `client/src/lib/dashboardMapper.ts` — Transforms raw report data into DashboardData
- `client/src/components/dashboard/chart-config.ts` — Centralized chart colors and config
- `client/src/lib/formatters/index.ts` — `format.currencyAuto()`, `format.tokensPerMonth()`, etc.
- `server/routes.ts` — Express API routes

## Brand Colors
```
primary: '#0339AF'  accent: '#4C73E9'  success: '#059669'
teal: '#0D9488'     gray: '#94A3B8'    dark: '#0F172A'
```
See also: `tailwind.config.ts` → `blueally` palette, `chart-config.ts` → `chartColors`

## Patterns
- `format.currencyAuto(value)` for money display ($1.2M format)
- `sanitizeForProse(text)` removes markdown artifacts for clean prose
- Optional fields with defaults for backward compat (old analyses still render)
- `apiRequest(method, url, data?)` — method is FIRST parameter
- MatrixDataPoint: enriched fields are optional, falls back to z (effort 1-5) if timeToValue missing

## Database
- Neon PostgreSQL via `@neondatabase/serverless`
- Env: `NEON_DB_URL` or `DATABASE_URL`
- Drizzle ORM with `drizzle-zod` for validation
- Schema changes: use optional fields with `.default("")` to avoid migrations
