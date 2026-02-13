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
- 8-step AI analysis pipeline (steps 0-7 in analysisData.steps)
- Data flow: Report → postProcessAnalysis() → mapReportToDashboardData() → Dashboard component
- Two rendering paths: DashboardPage (live data), SharedDashboard (shared links)
- Schema: `shared/schema.ts` (reports, sharedDashboards, userSessions, userEdits, etc.)

## Key Files
- `server/calculation-postprocessor.ts` — Central post-processing: friction costs, benefits, feasibility, priority
- `server/ai-service.ts` — AI prompts and Claude API calls (Hemingway voice, structured output)
- `src/calc/formulas.ts` — Deterministic formula registry (feasibility, priority, normalization, benefits)
- `src/calc/engine.ts` — HyperFormula wrapper for interactive editing
- `client/src/components/Dashboard.tsx` — Main dashboard (hero, executive summary, matrix, methodology)
- `client/src/lib/dashboardMapper.ts` — Transforms raw report data into DashboardData
- `client/src/components/dashboard/quadrant-bubble-chart.tsx` — D3 bubble chart (Feasibility vs Value)
- `client/src/components/dashboard/methodology-section.tsx` — Expandable methodology explanations
- `shared/taxonomy.ts` — Column ordering, function normalization, formula annotation
- `shared/standardizedRoles.ts` — 25 standardized roles with loaded hourly rates ($45-$175/hr)

## Scoring System (1-10 Scale)
### Feasibility Score (Step 6)
- **Organizational Capacity** (30%) — AI talent, leadership, change readiness
- **Data Availability & Quality** (30%) — System integration, data governance
- **Technical Infrastructure** (20%) — Cloud/API readiness
- **AI-Specific Governance** (20%) — Ethics board, responsible AI framework
- Formula: `(OrgCap × 0.30) + (DataQual × 0.30) + (TechInfra × 0.20) + (Gov × 0.20)`

### Value Normalization (Step 7)
- Min-max across all use cases: `Score = 1 + ((Value - Min) / (Max - Min)) × 9`
- All equal values → 5.5

### Priority Score (Step 7)
- Formula: `(Feasibility × 0.5) + (Normalized Value × 0.5)`
- Tiers: Champions (≥7.5), Quick Wins (value<5.5 & feasibility≥5.5), Strategic (value≥5.5 & feasibility<5.5), Foundation (<5.0)

### TTV Bubble Sizing
- Score: `1 - MIN(TTV/12, 1)` — shorter TTV = larger bubble

## Benefit Formulas (Step 5)
- **Cost**: Hours Saved × Loaded Hourly Rate × Benefits Loading (1.35) × Adoption Rate × Data Maturity
- **Revenue**: Revenue Uplift % × Revenue at Risk × Realization Factor × Data Maturity
- **Cash Flow**: Annual Revenue × (Days Improved / 365) × Cost of Capital × Realization Factor
- **Risk**: Risk Reduction % × Risk Exposure × Realization Factor × Data Maturity
- **Expected Value**: Total Annual Benefit × Probability of Success

## Brand Colors
```
Navy: #001278   Blue: #02a2fd   Green: #36bf78
primary: '#0339AF'  accent: '#4C73E9'  success: '#059669'
teal: '#0D9488'     gray: '#94A3B8'    dark: '#0F172A'
```

## Patterns
- `format.currencyAuto(value)` for money display ($1.2M format)
- `sanitizeForProse(text)` removes markdown artifacts for clean prose
- Optional fields with defaults for backward compat (old analyses still render)
- `apiRequest(method, url, data?)` — method is FIRST parameter
- Structured Formula Labels preferred over raw formula string parsing
- Role normalization runs BEFORE friction cost calculation in postProcessAnalysis()

## Database
- Neon PostgreSQL via `@neondatabase/serverless`
- Env: `NEON_DB_URL` or `DATABASE_URL`
- Drizzle ORM with `drizzle-zod` for validation
- Schema changes: use optional fields with `.default("")` to avoid migrations
- Interactive editing: `userSessions` + `userEdits` tables (anonymous browser-based)

## Writing Voice
- Hemingway style: clear, direct, unadorned prose
- MIT/Stanford rigor, BCG/Bain/McKinsey strategic lens
- Intelligent Choice Architecture: layout information to guide decision-making
- Every number earns its place, every sentence moves the narrative forward
