# agents.md

This file provides guidance to Codex Code when working with code in this repository. All Supabase interactions must go through the MCP Supabase tools because the environment is Supabase Cloud–first with no local Docker available. When documentation is needed, use Context7.

---

## 🎯 Mission-Critical Principles

When working on this codebase, you MUST adhere to these non-negotiable principles:

### ❌ ZERO Hardcoded Data
- NO hardcoded statistics, numbers, or mock values in components
- NO fake data for dashboards, charts, or previews
- NO placeholder content that pretends to be real data
- ALL data MUST come from the database or external sources
- ALL configuration MUST come from environment variables or config files

### ❌ ZERO Mock Data
- NO `const mockData = [...]` patterns
- NO demo/example/sample data in production code
- NO fake diffs, fake imports, fake calculations
- Use real database queries or proper seeding scripts in `supabase/seed/`

### ❌ ZERO Code Duplication
- NO copy-pasted logic between components
- Extract shared logic into reusable hooks, utilities, or services
- Create generic components for repeated UI patterns
- Single source of truth for business logic

### ✅ 100% Type Safety
- TypeScript strict mode ALWAYS enabled
- NO `any` types - use `unknown` with type guards
- NO `@ts-nocheck`, `@ts-ignore`, or `@ts-expect-error`
- NO non-null assertions (`!`) without documented justification
- Explicit return types on ALL functions
- Proper null/undefined handling everywhere

### ✅ 100% Validation
- ALL external data validated with Zod schemas
- ALL user inputs validated before processing
- ALL API responses validated before use
- ALL form data validated with React Hook Form + Zod resolver
- ALL environment variables validated at startup

---

## 📋 Project Overview

**CIR Pricing Management System** - B2B industrial distributor pricing tool for managing product pricing, client groups, and CIR classification mappings.

**Tech Stack**:
- Frontend: React 18 + TypeScript + Vite + Tailwind CSS
- Backend: Supabase (PostgreSQL + Auth + Storage + Edge Functions)
- State: @tanstack/react-query for server state
- Validation: Zod + React Hook Form
- UI: Radix UI primitives

**Current State**: Under active refactoring per [AUDIT.md](./AUDIT.md) to eliminate all hardcoded data, improve type safety, and establish production-grade standards.

---

## 🏗️ Architecture Guidelines

### Database Layer
- **All tables** have RLS (Row Level Security) enabled
- **All tables** use UUID primary keys, `created_at`, `updated_at`
- **Role-based policies**: admin, commercial, viewer (read-only)
- **Migrations only** in `supabase/migrations/` - NO seed data in migrations
- **Seed data** in `supabase/seed/` with idempotent scripts (use `ON CONFLICT`)

### API Layer (`src/lib/api/`)
- Centralized Supabase operations in typed functions
- Each entity (clients, groups, prices, etc.) has its own API module
- All functions throw typed errors (DatabaseError, ValidationError)
- All responses validated with Zod before returning
- Never expose raw Supabase queries in components

### Component Layer
- Use @tanstack/react-query for ALL data fetching
- NO direct `useState` + `useEffect` for API calls
- Forms MUST use React Hook Form + Zod resolver
- Extract reusable logic into custom hooks
- Components receive typed props, return explicit JSX.Element

### Validation Layer (`src/lib/schemas.ts`)
- Define Zod schemas for ALL domain entities
- Validate at boundaries: API responses, form inputs, file imports
- Use `safeParse` for expected errors, `parse` when failure is exceptional
- Provide user-friendly error messages via `ZodError.format()`

---

## 🚫 Forbidden Anti-Patterns

### DO NOT Write Code Like This:

**Hardcoded Statistics**
```typescript
// ❌ FORBIDDEN
const stats = { totalClients: 150, totalPrices: 2500, avgMargin: 15.5 };
```
→ **FIX**: Fetch from database with proper queries/RPCs

**Mock Data**
```typescript
// ❌ FORBIDDEN
const mockClients = [{ id: '1', name: 'Acme Corp' }, ...];
const mockDiff = { additions: 5, modifications: 10 };
```
→ **FIX**: Query real data or implement dry-run RPC for previews

**Any Types**
```typescript
// ❌ FORBIDDEN
function process(data: any) { ... }
const client = data as Client;
const name = client.name!;
```
→ **FIX**: Use `unknown` + validation, no type assertions without validation

**Unvalidated External Data**
```typescript
// ❌ FORBIDDEN
const { data } = await supabase.from('clients').select('*');
return data; // unvalidated
```
→ **FIX**: Validate with Zod schema before returning

**Duplicated Fetch Logic**
```typescript
// ❌ FORBIDDEN - repeated pattern in multiple components
useEffect(() => {
  supabase.from('clients').select('*').then(setClients);
}, []);
```
→ **FIX**: Extract to reusable hook or API function with react-query

**Console Logs**
```typescript
// ❌ FORBIDDEN
console.log('📊 Processing...', data);
```
→ **FIX**: Remove all console.log or use proper logging library (dev only)

**Unhandled Promises**
```typescript
// ❌ FORBIDDEN
supabase.from('logs').insert({ message: 'x' }); // fire-and-forget
```
→ **FIX**: Always await and handle errors properly

---

## ✅ Required Patterns

### When Fetching Data
1. Define Zod schema in `src/lib/schemas.ts`
2. Create API function in `src/lib/api/[entity].ts` that validates responses
3. Use @tanstack/react-query in component with proper query keys
4. Handle loading/error/empty states explicitly

### When Creating Forms
1. Define Zod schema for form inputs
2. Use React Hook Form with `zodResolver`
3. All fields properly typed
4. Handle submission errors with user-friendly messages

### When Processing Imports (Excel/CSV)
1. Client-side: Parse file and validate with Zod
2. Client-side: Show validation errors if any (do not proceed)
3. Client-side: Call dry-run RPC to preview changes (real diff from DB)
4. User confirms → Server-side: Edge Function processes import
5. Poll import_batches table for status
6. Invalidate affected react-query caches on success

### When Writing Migrations
1. Use `IF NOT EXISTS` / `IF EXISTS` for idempotency
2. NO hardcoded INSERT statements (use seed files)
3. Define RLS policies in same migration as table creation
4. Add indexes for foreign keys and frequent queries
5. Add `updated_at` trigger if needed

### When Writing Edge Functions
1. Initialize Supabase client OUTSIDE request handler
2. Validate request body with Zod
3. Use service role key (never expose to client)
4. Structured error handling with proper HTTP status codes
5. Return JSON with consistent shape: `{ success: boolean, data?: any, error?: string }`

---

## 🛠️ TypeScript Standards

### Compiler Options (Already Configured)
- `strict: true`
- `noUnusedLocals: true`
- `noUnusedParameters: true`
- `noImplicitReturns: true`
- `exactOptionalPropertyTypes: true`

### Enforcement Rules
- Explicit return types on ALL exported functions
- No implicit `any` (all parameters/variables explicitly typed)
- Proper null/undefined handling (use `??`, optional chaining `?.`)
- Use discriminated unions for complex state
- Branded types for domain primitives (IDs, codes) when appropriate

---

## 🔒 Security Requirements

### Secrets Management
- NO secrets in code or committed files
- Environment variables ONLY (`.env` never committed)
- Client-side uses `VITE_SUPABASE_ANON_KEY` (limited by RLS)
- Server-side (Edge Functions) uses `SUPABASE_SERVICE_ROLE_KEY`

### RLS Policies
- ALL tables have RLS enabled
- Policies enforce role-based access (admin/commercial/viewer)
- Test policies with different user roles
- Document policy logic in migration comments

### Input Validation
- Validate ALL user inputs with Zod
- Sanitize before database insertion
- Validate file uploads (type, size, content)
- Use parameterized queries (Supabase handles this)

---

## 📦 Key Libraries & Their Usage

### @tanstack/react-query
- **Purpose**: Server state management (data fetching, caching, invalidation)
- **Usage**: ALL API calls go through useQuery/useMutation
- **Config**: Proper query keys for cache invalidation
- **Docs**: https://tanstack.com/query/latest

### Zod
- **Purpose**: Runtime validation + TypeScript types
- **Usage**: Validate all external data (API, forms, files, env vars)
- **Pattern**: Define schema → `safeParse` → handle errors
- **Docs**: https://zod.dev/

### React Hook Form
- **Purpose**: Form state management with validation
- **Usage**: ALL forms with `zodResolver` for validation
- **Pattern**: `useForm` → `handleSubmit` → typed validated data
- **Docs**: https://react-hook-form.com/

### Supabase
- **Purpose**: Backend (DB, Auth, Storage, Edge Functions)
- **Usage**: Never expose raw queries in components, use API layer
- **Auth**: Protected routes check `user` from AuthContext
- **Docs**: https://supabase.com/docs

---

## 📂 File Organization

### Core Directories
- `frontend/src/lib/` - Core utilities (API, schemas, supabase client)
- `frontend/src/components/` - React components (ui/ for base, features elsewhere)
- `frontend/src/hooks/` - Custom React hooks
- `frontend/src/pages/` - Route pages
- `frontend/src/types/` - TypeScript type definitions
- `supabase/migrations/` - Database schema migrations (SQL)
- `supabase/seed/` - Seed data scripts (NOT mock data)
- `supabase/functions/` - Edge Functions (Deno)

### Naming Conventions
- Files: kebab-case (e.g., `client-list.tsx`, `use-clients.ts`)
- Components: PascalCase (e.g., `ClientList`, `Button`)
- Functions: camelCase (e.g., `fetchClients`, `validateInput`)
- Types/Interfaces: PascalCase (e.g., `Client`, `ApiResponse`)
- Constants: UPPER_SNAKE_CASE (e.g., `MAX_FILE_SIZE`)

---

## ✅ Pre-Commit Quality Checklist

Before committing, verify:

**Type Safety**
- [ ] No `any` types
- [ ] No `@ts-nocheck` or `@ts-ignore`
- [ ] All functions have explicit return types
- [ ] No unused variables or imports
- [ ] `npm run type-check` passes

**Data Integrity**
- [ ] No hardcoded data or mock values
- [ ] All data fetched from database
- [ ] All external data validated with Zod
- [ ] No console.log statements

**Code Quality**
- [ ] No duplicated logic
- [ ] Reusable code extracted to utilities/hooks
- [ ] Components follow single-responsibility principle
- [ ] `npm run lint` passes

**Security**
- [ ] No secrets in code
- [ ] Environment variables properly used
- [ ] User inputs validated
- [ ] RLS policies tested (if changed)

**Testing** (when implemented)
- [ ] Unit tests for utilities/hooks
- [ ] Integration tests for forms/flows
- [ ] Manual testing completed

---

## 🚀 Development Workflow

### Local Development
```bash
npm run dev              # Start dev server
npm run type-check       # Check TypeScript
npm run lint             # Check ESLint
npm run lint:fix         # Auto-fix linting issues
```

### Supabase
```bash
supabase start           # Start local instance
supabase db reset        # Reset DB + run migrations
supabase gen types typescript --local > src/types/supabase.ts
supabase functions serve # Serve Edge Functions locally
```

### Git
- Branch: `feat/`, `fix/`, `refactor/`, `docs/`, `test/`
- Commit: `type(scope): description`
- PR: Include checklist, screenshots for UI changes

---

## 📖 Documentation

### Code Comments
- Functions: JSDoc with `@param`, `@returns`, `@throws`
- Complex logic: Inline comments explaining "why" not "what"
- Workarounds: Comment with ticket reference

### README Files
- Keep root README up to date with setup instructions
- Document feature-specific patterns in respective directories

### AUDIT.md
- Refer to [AUDIT.md](./AUDIT.md) for detailed improvement roadmap
- Current priorities: security, type safety, data integrity

---

## 🆘 Reference Resources

**Documentation**
- React Query: https://tanstack.com/query/latest
- Zod: https://zod.dev/
- Supabase: https://supabase.com/docs
- Radix UI: https://www.radix-ui.com/
- Tailwind: https://tailwindcss.com/docs

**Internal**
- [AUDIT.md](./AUDIT.md) - Detailed audit and improvement plan
- [supabase/migrations/](./supabase/migrations/) - Database schema
- [frontend/src/lib/schemas.ts](./frontend/src/lib/schemas.ts) - Validation schemas

---

## 🎓 Key Principles Summary

When working on this repository:

1. **NO HARDCODE** - All data from database or config
2. **NO MOCKS** - Real data or proper seed scripts
3. **NO DUPLICATION** - Extract, reuse, DRY
4. **STRICT TYPES** - Explicit types, no `any`, full validation
5. **VALIDATE EVERYTHING** - Zod schemas at all boundaries
6. **USE REACT QUERY** - All data fetching through queries/mutations
7. **USE PROPER FORMS** - React Hook Form + Zod resolver
8. **SECURE BY DEFAULT** - RLS enabled, inputs validated, secrets protected
9. **DOCUMENT DECISIONS** - Comment complex logic, update docs
10. **QUALITY FIRST** - Type-check, lint, test before committing

**When in doubt**: Fetch real data, validate with Zod, use proper TypeScript types.
