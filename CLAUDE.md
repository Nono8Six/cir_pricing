# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

CIR Pricing Management System - A B2B industrial distributor pricing tool for managing product pricing, client groups, and CIR classification mappings. This is a React/TypeScript frontend application backed by Supabase.

## Architecture

### Frontend Structure
- **Framework**: React 18 with TypeScript and Vite
- **Routing**: React Router DOM with protected routes
- **UI**: Tailwind CSS with custom components in `components/ui/`
- **State Management**: React Context API (AuthContext)
- **Database**: Supabase with Row Level Security (RLS)

### Key Components Architecture
- **AuthContext** (`src/context/AuthContext.tsx`): Handles authentication state and user management
- **API Layer** (`src/lib/api.ts`): Supabase client and direct database operations
- **Validation** (`src/lib/schemas.ts`): Zod schemas for data validation
- **Excel Processing** (`src/lib/excelParser.ts`): Handles Excel file parsing with fuzzy column matching
- **CIR Data** (`src/utils/cirDataTransformer.ts`): Transforms flat classification data into hierarchical structure

### Database Schema
Main tables: `groups`, `clients`, `brand_category_mappings`, `prices`, `profiles`
- All tables use RLS with role-based policies (admin/commercial)
- CIR classification uses generated columns (fsmega + fsfam + fssfa)
- Historical pricing stored in JSONB columns

## Development Commands

### Root Level
- `npm run dev` - Start development server (delegates to frontend workspace)
- `npm run build` - Build for production
- `npm run lint` - Run ESLint
- `npm run type-check` - Run TypeScript type checking
- `npm run preview` - Preview production build

### Frontend Workspace
- `npm run dev --workspace=frontend` - Start dev server on configurable port (default: 5176)
- `npm run lint:fix --workspace=frontend` - Auto-fix linting issues

### Environment Configuration
- Dev server port configured via `VITE_DEV_PORT` environment variable
- HMR can be disabled with `VITE_DISABLE_HMR=1`
- Supabase configuration requires `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`

## Key Development Patterns

### Excel Data Processing
The application heavily uses Excel file parsing for CIR classification imports:
- Fuzzy column matching with Fuse.js for flexible header detection
- Validation with Zod schemas
- Support for multiple column name variations (French/English)
- Error aggregation and user-friendly feedback

### CIR Classification System
Three-level hierarchy: FSMEGA → FSFAM → FSSFA
- Flat database storage with generated combined classification codes
- Hierarchical transformation for UI display
- Automatic code validation and formatting

### Authentication Flow
- Supabase Auth with profile creation via Edge Functions
- Role-based access control (admin/commercial)
- Protected routes with loading states

### Error Handling
- Custom ErrorBoundary component for React errors
- Supabase error handling in API layer
- Toast notifications for user feedback

## Testing
No test framework currently configured. Project uses only basic TypeScript checking.

## Supabase
- Migrations in `supabase/migrations/` 
- Edge Functions in `supabase/functions/`
- Profile creation function: `create-profile`