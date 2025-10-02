# Repository Guidelines

## Project Structure & Module Organization
- Root: npm workspace orchestrating the app and shared config. Vite reads env from repo root (see `frontend/vite.config.ts` → `envDir: ..`).
- `frontend/`: Vite + React + TypeScript app.
  - Source: `frontend/src/`
  - Static assets: `frontend/public/`
  - Build output: `frontend/dist/`
- `supabase/`: SQL migrations in `supabase/migrations/` (schema, RLS, RPCs). Document policy changes in PRs.

## Build, Test, and Development Commands
- Install: `npm install` (root) — installs workspace dependencies.
- Dev server: `npm run dev` — starts Vite at `http://localhost:5173`.
- Build: `npm run build` — Type-checks and builds to `frontend/dist/`.
- Preview: `npm run preview` — serves the built app at `http://localhost:4173`.
- Lint: `npm run lint` (root) or `npm run lint --workspace=frontend`.
- Type check: `npm run type-check` — TS `--noEmit`.
- Clean caches: `npm run clean` — removes `node_modules` and build caches.

## Coding Style & Naming Conventions
- Language: TypeScript + React; Tailwind CSS for styles.
- Linting: see `frontend/eslint.config.js` (React Hooks rules enabled). Fix with `npm run lint:fix` (run in `frontend`).
- Components: PascalCase file and export (e.g., `PriceTable.tsx`).
- Utilities/hooks: camelCase files (e.g., `usePricing.ts`).
- Variables/functions: camelCase; constants: `UPPER_SNAKE_CASE`.

## Testing Guidelines
- No test harness is configured yet. If adding tests, use Vitest + React Testing Library.
- Place tests next to sources as `*.test.ts(x)`; keep them deterministic.
- Prioritize coverage for price import, filtering, and Supabase calls (mock network).

## Commit & Pull Request Guidelines
- Commits: use Conventional Commits (`feat:`, `fix:`, `chore:`). Example: `fix: handle zero codes in classification import`.
- PRs: provide a concise description, link issues, include reproduction steps, and screenshots/GIFs for UI changes.
- Keep PRs small and focused; update docs and scripts when behavior changes.

## Security & Configuration Tips
- Env (root `.env`): `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`. Do not commit secrets.
- Supabase: review RLS impacts when changing migrations; record policy changes in PRs.
- Tooling: Node ≥ 18 and npm ≥ 9.

