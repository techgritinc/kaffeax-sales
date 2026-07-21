# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Project Overview

Kaffea-X Sales is a sales operations automation tool built with Next.js 16 (App Router), React 19, TypeScript 5, Tailwind CSS v4, and MongoDB. The UI is driven by a pixel-perfect prototype at `Design/POC_Kaffea-X_Prototype.html` — that file is the single source of truth for all visual decisions.

The project constitution at `.specify/memory/constitution.md` defines all engineering principles and is authoritative. Read it before making architectural decisions.

## Commands

```bash
# Development (loads .env.development via env-cmd)
npm run dev

# Development server with production env
npm run dev:prod

# Full validation pipeline — runs all three sequentially
npm run validate          # type-check → lint → build

# Individual gates
npm run type-check        # tsc --noEmit
npm run lint              # eslint --max-warnings=0 + prettier --check
npm run format            # eslint --fix + prettier --write (auto-fix)

# Build
npm run build             # production build (no env file)
npm run build:dev         # build with .env.development
npm run build:prod        # build with .env.production
```

CI (`npm run validate`) runs on PRs to `main` and `dev` via `.github/workflows/ci.yml` with `SKIP_ENV_VALIDATION=true` to bypass the env check during build.

## Environment Setup

Copy `.env.development` variables from `.env.example` (or a teammate). The four required variables are:

```
NEXT_PUBLIC_APP_ENV=development
NEXT_PUBLIC_APP_URL=http://localhost:3000
NODE_ENV=development
MONGO_URI=mongodb://...
```

`env.mjs` is imported in `next.config.ts` — this means the server **crashes immediately at startup** if any required variable is missing or invalid. This is intentional (fail-fast). To skip during CI or scripted builds: `SKIP_ENV_VALIDATION=true`.

## Architecture

### Intended Directory Layout

The codebase is in early setup. The target structure from the constitution:

```
src/
├── app/                    # App Router routes and layouts only
├── components/
│   ├── ui/                 # Atomic primitives (Button, Input, Badge, etc.)
│   └── common/             # Cross-feature composed components
├── features/<feature>/     # All feature code: actions, components, hooks, utils, types
├── lib/
│   ├── db/                 # MongoDB client and helpers
│   ├── auth/               # Auth helpers
│   └── utils/              # Shared utility functions
├── integrations/           # External API clients (self-contained per service)
├── providers/              # React context providers
├── repositories/           # MongoDB repository classes (one class per collection)
├── schemas/                # Shared Zod schemas
├── config/                 # App configuration objects
├── constants/              # Named constants (no magic numbers/strings in components)
├── types/                  # Shared cross-feature TypeScript types
└── middleware.ts            # Next.js middleware entry point
```

### Key Architectural Rules

- **Data flow**: Component → Repository class → MongoDB. No direct DB calls in components or server actions.
- **Mutations**: Next.js Server Actions only — no `/app/api/` route handlers.
- **Fetching**: Repository functions only — no raw `fetch`/Axios in components.
- **Types**: Feature types live in `src/features/<feature>/types/`. Shared types in `src/types/<domain>.types.ts`. Never one global types file.
- **Imports**: Use `@/` alias for all `src/` imports. No `../../` beyond one level up.

### Design Token System

`src/app/globals.css` is the single source of truth for all design tokens.

- **`:root`** — raw CSS custom properties: `--fs-*` (font sizes), `--midnight`, `--green`, etc.
- **`@theme inline`** — Tailwind v4 registration: `--color-*`, `--text-*`, `--font-*`

Use Tailwind utilities (`bg-midnight`, `text-body-sm`, `text-muted`) — never hardcoded hex values or `style={{ }}` props. Adding new tokens requires updating `globals.css` only.

## Conventions

### Commits

Format: `type(scope): description`

Enforced by commitlint via the `commit-msg` hook.

- **Types**: `feat`, `fix`, `hotfix`, `perf`, `refactor`, `docs`, `test`, `chore`, `build`, `ci`, `revert`
- **Scopes**: `app`, `auth`, `api`, `ui`, `db`, `infra`, `config`, `deps`, `release`
- Example: `feat(ui): add sales pipeline dashboard`

### Branch Naming

Format: `type/short-description` (lowercase alphanumeric + hyphens only)

Enforced by the pre-push hook. Protected branches (`main`, `master`, `dev`, `development`) block direct pushes.

### Import Ordering

Handled by `@trivago/prettier-plugin-sort-imports` in `.prettierrc` — **not ESLint**. Runs automatically on save. Order: `react/next` → third-party → `@/local` → `./relative`, with blank lines between groups.

Tailwind class ordering is handled by `prettier-plugin-tailwindcss`.

### ESLint Rules (non-negotiable)

- `@typescript-eslint/no-explicit-any`: **error** — use `unknown` + type narrowing
- `@typescript-eslint/no-non-null-assertion`: **error** — use `?.` and `??`
- `@typescript-eslint/no-floating-promises`: **error** — always `await` or `.catch()`
- `--max-warnings=0` in CI — warnings are errors

## Toolchain Notes

- **`.specify/`** is excluded from Prettier checks (spec kit generated JSON)
- **VSCode**: `"css.lint.unknownAtRules": "ignore"` is set in `.vscode/settings.json` to suppress false positives from Tailwind's `@theme` at-rule
- **Husky**: pre-commit runs lint-staged + `tsc --noEmit`; pre-push enforces branch naming + blocks protected branches
- **No tests yet** — testing infrastructure has not been set up
