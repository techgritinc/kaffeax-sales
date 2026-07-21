# Kaffea-X Sales

Sales operations automation platform for Kaffea-X. Built to eliminate manual tracking tasks across the sales pipeline.

## Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript 5 (strict) |
| Styling | Tailwind CSS v4 |
| Validation | Zod |
| Database | MongoDB |
| Runtime Env | `@t3-oss/env-nextjs` |
| Package Manager | npm |

---

## Getting Started

### Prerequisites

- Node.js 22+
- npm
- MongoDB connection string

### Setup

**1. Clone and install**

```bash
git clone <repo-url>
cd kx-sales
npm install
```

**2. Configure environment**

Create `.env.development` at the project root. The required variables are:

```env
NEXT_PUBLIC_APP_ENV=development
NEXT_PUBLIC_APP_URL=http://localhost:3000
NODE_ENV=development
MONGO_URI=<your-mongodb-connection-string>
```

> The server **crashes immediately at startup** if any variable is missing or invalid. This is intentional — environment misconfiguration fails loudly before the application binds a port. Set `SKIP_ENV_VALIDATION=true` to bypass this only in CI or scripted builds.

**3. Run the development server**

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server with `.env.development` |
| `npm run dev:prod` | Start dev server with `.env.production` |
| `npm run build` | Production build |
| `npm run build:dev` | Build with `.env.development` |
| `npm run build:prod` | Build with `.env.production` |
| `npm run type-check` | TypeScript check (`tsc --noEmit`) |
| `npm run lint` | ESLint + Prettier check |
| `npm run format` | ESLint fix + Prettier write |
| `npm run validate` | Full pipeline: type-check → lint → build |

`npm run validate` is what CI runs. Run it locally before pushing.

---

## Project Structure

```
kx-sales/
├── src/
│   ├── app/                    # Next.js App Router — routes, layouts, page entry points
│   │   └── globals.css         # Design tokens (single source of truth for all tokens)
│   ├── components/
│   │   ├── ui/                 # Atomic reusable primitives (Button, Input, Badge, etc.)
│   │   └── common/             # Cross-feature composed components
│   ├── features/               # One directory per domain feature
│   │   └── <feature>/
│   │       ├── actions/        # Next.js Server Actions (all mutations live here)
│   │       ├── components/     # Components specific to this feature
│   │       ├── hooks/          # React hooks specific to this feature
│   │       ├── utils/          # Pure utility functions for this feature
│   │       └── types/          # TypeScript types for this feature
│   ├── lib/
│   │   ├── db/                 # MongoDB client and connection helpers
│   │   ├── auth/               # Authentication helpers
│   │   └── utils/              # Shared utility functions (used across features)
│   ├── integrations/           # External API clients (one subdirectory per service)
│   ├── providers/              # React context providers
│   ├── repositories/           # Database abstraction layer (one class per collection)
│   ├── schemas/                # Shared Zod validation schemas
│   ├── config/                 # Application configuration objects
│   ├── constants/              # Named constants — magic numbers and strings live here
│   ├── types/                  # Shared cross-feature TypeScript types
│   └── middleware.ts           # Next.js middleware entry point
├── Design/                     # UI prototype (canonical visual reference)
├── env.mjs                     # Runtime environment validation schema
├── next.config.ts              # Next.js configuration (imports env.mjs for fail-fast)
├── commitlint.config.cjs       # Commit message rules
├── eslint.config.mjs           # ESLint flat config
└── .husky/                     # Git hooks (pre-commit, commit-msg, pre-push)
```

---

## Architecture

### Data Flow

```
Component / Page
      ↓
  Server Action      ← mutations (POST / PUT / PATCH / DELETE)
      ↓
  Repository class   ← all database access is here
      ↓
   MongoDB
```

- Components call repository methods — **never** raw database queries.
- All data mutations use **Next.js Server Actions** — there are no `/app/api/` route handlers.
- Data fetching goes through repository functions — **never** raw `fetch` or Axios in components.

### Feature Modules

All application code is organized by business domain under `src/features/`. A feature module is fully self-contained: its components, server actions, hooks, utilities, and types all live inside the feature directory. **Features must never import from another feature's internals.** Cross-feature dependencies go through `lib/`, `schemas/`, `types/`, or `constants/`.

### Import Paths

Use the `@/` alias for all imports from `src/`. Relative imports beyond one level (`../../`) are not permitted.

```ts
// Correct
import { UserRepository } from '@/repositories/user.repository';

// Wrong
import { UserRepository } from '../../../repositories/user.repository';
```

---

## Coding Standards

### TypeScript

Strict mode is enforced. Two rules with zero tolerance:

- **No `any`** — use `unknown` with type narrowing, explicit generics, or concrete types.
- **No non-null assertions (`!`)** — use optional chaining (`?.`) and nullish coalescing (`??`).

```ts
// Wrong
const data: any = await fetchUser();
const name = user!.profile!.name;

// Correct
const data: User = await fetchUser();
const name = user?.profile?.name ?? 'Unknown';
```

All types and interfaces must be declared explicitly. Shared types across features belong in `src/types/` using domain-based filenames (`user.types.ts`, `api.types.ts`). Feature-specific types live in `src/features/<feature>/types/`.

### Component Size

Individual component files must not exceed **150 lines**. When a component grows beyond that, extract sub-components, hooks, or logic into dedicated files.

### Styling — CSS Tokens

`src/app/globals.css` is the single source of truth for all design tokens — colors, font sizes, font families, spacing values. All tokens are registered as Tailwind utility classes via `@theme inline`.

**Always use Tailwind utility classes. Never use hardcoded color values or inline `style` props.**

```tsx
// Wrong — hardcoded value
<div className="bg-[#1F519F]">

// Wrong — inline style
<div style={{ color: '#A13323', fontSize: '13px' }}>

// Correct — token-based utilities
<div className="bg-bright-blue text-body text-rust">
```

To see what tokens are available, open `src/app/globals.css`. Adding a new token requires updating that file — no new colors or sizes may be introduced elsewhere.

### Named Constants

Magic numbers and magic strings must not appear in component files. Extract them to `src/constants/` (shared) or a `constants.ts` file inside the relevant feature directory.

---

## Commit Message Conventions

This project enforces [Conventional Commits](https://www.conventionalcommits.org/). The `commit-msg` hook validates every commit via commitlint and will reject non-conforming messages.

### Format

```
type(scope): subject
```

- **`type`** — what kind of change this is (required)
- **`scope`** — what area of the codebase is affected (required)
- **`subject`** — a short, imperative description (required)

### Types

| Type | When to use |
|------|-------------|
| `feat` | A new feature or capability visible to users |
| `fix` | A bug fix |
| `hotfix` | An urgent production fix |
| `perf` | A change that improves performance |
| `refactor` | Code restructuring with no behavior change |
| `docs` | Documentation-only changes |
| `test` | Adding or modifying tests |
| `chore` | Maintenance tasks (configs, tooling, scripts) |
| `build` | Changes to the build system or dependencies |
| `ci` | Changes to CI/CD pipelines and workflows |
| `revert` | Reverting a previous commit |

### Scopes

| Scope | Area |
|-------|------|
| `app` | App Router pages, layouts, routing |
| `auth` | Authentication and authorization |
| `api` | Server actions and data fetching layer |
| `ui` | Components and styling |
| `db` | Database, repositories, schemas |
| `infra` | Infrastructure and deployment |
| `config` | Configuration files, environment |
| `deps` | Dependency updates |
| `release` | Release and versioning |

### Rules

- Subject must be **imperative present tense**: `add`, `fix`, `update` — not `added`, `fixing`, `updated`
- Subject must **not be capitalized** and must **not end with a period**
- Header (first line) must not exceed **100 characters**
- No scope is required for sweeping cross-cutting changes, but a scope is strongly preferred

### Examples

```bash
# New feature
feat(ui): add sales pipeline dashboard

# Bug fix with scope
fix(auth): resolve token expiry not clearing session

# Dependency update
chore(deps): upgrade next to 16.2.10

# Refactor with no behavior change
refactor(db): extract query helpers into repository base class

# CI change
ci(infra): add build status check to PR workflow

# Configuration change
chore(config): add MONGO_URI to env validation schema

# Documentation
docs(config): update .env.example with new required variables

# Wrong — vague subject
feat(ui): changes

# Wrong — past tense
fix(auth): fixed token expiry

# Wrong — missing scope
feat: add dashboard

# Wrong — exceeds 100 chars
feat(ui): add the complete sales operations dashboard with pipeline view, filters, and export functionality
```

---

## Branch Naming

Branches must follow `type/short-description`. The pre-push hook enforces this and blocks direct pushes to protected branches.

```bash
# Correct
feat/sales-dashboard
fix/auth-token-expiry
chore/upgrade-dependencies
hotfix/pipeline-crash
refactor/repository-base-class

# Wrong — no type prefix
sales-dashboard

# Wrong — uppercase or spaces
Feat/Sales-Dashboard
```

**Protected branches** — direct pushes to `main`, `master`, `dev`, and `development` are blocked. All changes must go through a Pull Request.

---

## Git Hooks

Hooks are managed by Husky and run automatically.

| Hook | What it does |
|------|-------------|
| `pre-commit` | Runs lint-staged (ESLint + Prettier on staged files) and `tsc --noEmit` |
| `commit-msg` | Validates the commit message against the Conventional Commits rules |
| `pre-push` | Enforces branch naming and blocks pushes to protected branches |

If the pre-commit hook fails, fix the reported issues and re-stage the files before committing again.

---

## CI / CD

The GitHub Actions workflow (`.github/workflows/ci.yml`) runs on every PR to `main` or `dev`. It executes `npm run validate`, which runs:

1. `tsc --noEmit` — zero type errors
2. `eslint --max-warnings=0` + `prettier --check` — zero warnings, zero formatting drift
3. `next build` — zero compilation errors

All three must pass before a PR can be merged.

---

## Visual Design Reference

The file `Design/POC_Kaffea-X_Prototype.html` is the **canonical source of truth** for the entire UI. All implementation must match it exactly — font sizes, weights, colors, spacing, layout. Do not deviate without explicit approval. When in doubt about a visual decision, the prototype wins.
