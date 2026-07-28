<!--
  Sync Impact Report
  ==================
  Version change: 1.3.0 → 1.4.0 (MINOR — New §XVII prohibiting barrel imports/exports added)

  Rationale: During the Claude API wrapper implementation (002-claude-api-wrapper), Phase 5
  originally planned to create a `src/integrations/claude/index.ts` barrel that re-exports
  TranscriptSummarizer and related types to give consumers a single import path. The team
  explicitly rejected this pattern: barrels silently pull entire modules into consumer bundles
  (defeating tree-shaking), create non-obvious circular dependency risks, and obscure the real
  dependency graph. Consumers must import directly from the source file that declares the symbol.
  This rule was applied retroactively to the 002-claude-api-wrapper spec and tasks, cancelling
  T012, and is now a permanent constitutional prohibition.

  Modified sections:
    - §XVII No Barrel Imports — new section added

  Added principles: §XVII No Barrel Imports
  Added sections: §XVII No Barrel Imports
  Removed sections: None

  Templates:
    ✅ .specify/templates/plan-template.md — no structural changes required
    ✅ .specify/templates/spec-template.md — no structural changes required
    ✅ .specify/templates/tasks-template.md — no structural changes required

  Follow-up TODOs:
    - Audit existing codebase for any accidental index.ts barrel files and remove them.
-->

<!--
  Sync Impact Report
  ==================
  Version change: 1.2.0 → 1.3.0 (MINOR — Principle XI expanded with a new normative rule)

  Rationale: Mongoose model files (e.g. transcript.model.ts, rubric-signal.model.ts) were
  declaring their plain-data interfaces/types inline alongside Schema definitions. This blocked
  reuse of those exact data shapes from frontend code (components, forms, server action return
  types), forcing either duplication or an import that would pull mongoose's runtime into the
  client bundle. Resolved by extracting plain interfaces/types into src/types/<domain>.types.ts
  (zero mongoose dependency) and leaving only Schema/HydratedDocument/model code in the
  lib/db/models/<domain>.model.ts file — first applied to rubric-signal.model.ts, then to
  transcript.model.ts. Principle XI is amended to make this split a explicit, permanent rule
  rather than an ad-hoc fix.

  Modified sections:
    - §XI Type Isolation — added a rule requiring plain data types to be separated from
      persistence-layer (Mongoose) types, so shared types remain directly importable by
      frontend code.

  Added principles: None
  Added sections: None
  Removed sections: None

  Templates:
    ✅ .specify/templates/plan-template.md — no structural changes required
    ✅ .specify/templates/spec-template.md — no structural changes required
    ✅ .specify/templates/tasks-template.md — no structural changes required

  Follow-up TODOs: None
-->

# Kaffea-X Sales Constitution

## Core Principles

### I. Tech Stack & Framework

- The application MUST use **Next.js 16** with the App Router paradigm.
- React 19, TypeScript 5, and Tailwind CSS v4 are the foundational technologies. No alternative frameworks, CSS-in-JS libraries, or unvetted dependencies may be introduced without an amendment to this constitution.
- All environment variables MUST be validated at startup via the `env.mjs` schema using `@t3-oss/env-nextjs` and Zod. Missing or malformed variables MUST crash the process immediately.

### II. CSS & Design Tokens

- **Tailwind CSS v4** is the exclusive styling system.
- All colors, spacing, and typography tokens MUST be defined as CSS custom properties in `src/app/globals.css` and registered via the `@theme inline` directive.
- **Zero tolerance** for hardcoded hex, rgb, or hsl values anywhere in component files. Every color reference MUST use a Tailwind utility class.
- **Zero tolerance** for inline `style` objects in components. All styling MUST be expressed through Tailwind utility classes. No `style={{ }}` props.
- No new colors may be introduced outside the predefined design token set in `globals.css`. Additions require explicit approval and a constitution patch.

**Bad:**
```tsx
<div className="bg-[#1F519F] text-[#6B6B67]">
<div style={{ color: '#A13323', padding: '16px' }}>
```

**Good:**
```tsx
<div className="bg-bright-blue text-muted">
<div className="text-rust p-4">
```

### III. TypeScript Strictness

- TypeScript strict mode MUST remain enabled in `tsconfig.json`.
- **Absolute zero tolerance** for the `any` keyword. Use `unknown` with type narrowing, explicit generics, or concrete types instead.
- **Absolute zero tolerance** for non-null assertions (`!`). Use optional chaining, nullish coalescing, or explicit null checks.
- All data structures MUST have explicit, reusable `type`, `interface`, or `enum` declarations. Type duplication across files is prohibited; extract shared types into the `types/` directory.
- Unused variables and imports MUST produce warnings that CI treats as errors (`--max-warnings=0`).

**Bad:**
```ts
const data: any = await fetchUser();
const name = user!.profile!.name;
```

**Good:**
```ts
const data: User = await fetchUser();
const name = user?.profile?.name ?? 'Unknown';
```

### IV. Linting & Formatting

- ESLint and Prettier configurations in the repository are authoritative. All code MUST pass both without warnings.
- CI MUST run `eslint --max-warnings=0` — all warnings are treated as hard errors.
- Prettier MUST auto-sort imports (library → scoped → local → relative) and Tailwind classes on save.
- Commits MUST follow the Conventional Commits specification. The `commit-msg` hook validates via commitlint.
- Pre-commit hooks MUST run lint-staged (ESLint + Prettier on staged files) and `tsc --noEmit` type-checking.

### V. Code Modularity

- Enforce hyper-modular file structures. Individual component files MUST NOT exceed **150 lines of code**.
- When a component grows beyond this limit, proactively extract sub-components, hooks, or logic into isolated, reusable modules.
- No monolithic files. Each file MUST have a single, clear responsibility.

### VI. Reusable UI Components

- The application MUST maintain a design-system-level library of atomic, reusable UI components (buttons, inputs, cards, modals, badges, etc.).
- Components MUST be isolated, self-contained, and usable across any feature module without modification.
- Avoid one-off component variants; generalize via props.

### VII. Utility Functions

- Pure utility functions MUST be extracted into dedicated utility files — either globally in `src/lib/utils/` or at the feature level in `src/features/<feature>/utils/`.
- Complex logic (formatting, calculations, transformations) MUST NOT live inside component files.
- Utility functions MUST be pure (no side effects) and independently testable.

### VIII. Schema Validation & Forms

- **Zod** is the exclusive schema validation library for the entire application. No Yup, Joi, or manual validation.
- All forms MUST be driven by `react-hook-form` paired with the Zod resolver (`@hookform/resolvers/zod`).
- Validation schemas MUST be colocated with their feature or placed in a shared `schemas/` directory when reused across features.

### IX. Repository Layer

- **No direct database or ORM calls** within components, pages, or server actions.
- All database queries and mutations MUST be encapsulated behind an abstracted **repository layer** using JavaScript/TypeScript classes.
- Components and server actions call repository methods; repositories call the database.

**Bad:**
```ts
// Inside a server action or component
const users = await db.collection('users').find({});
```

**Good:**
```ts
// repository/user.repository.ts
export class UserRepository {
  async findAll(): Promise<User[]> {
    return db.collection('users').find({}).toArray();
  }
}

// Server action
const users = await userRepository.findAll();
```

### X. Server Actions & API Layer

- All data-mutating requests (POST, PUT, PATCH, DELETE) MUST use **Next.js Server Actions**. Do NOT create route handlers inside `/app/api/`.
- All data fetching (GET) MUST be abstracted into the centralized repository layer. Components MUST call repository functions — never raw `fetch`, Axios, or other HTTP clients directly.

### XI. Type Isolation

- NEVER dump all types into a single global file.
- Types and interfaces MUST be isolated into dedicated `types/` directories organized strictly by feature module: `src/features/<feature>/types/` or `src/types/<domain>.ts`.
- Shared cross-feature types live in `src/types/` with clear domain-based file names (e.g., `user.types.ts`, `api.types.ts`).
- **Plain data types MUST be separated from persistence-layer types.** A Mongoose model file (`src/lib/db/models/<domain>.model.ts`) MUST NOT declare plain interfaces/types inline. It MUST import them from the corresponding `src/types/<domain>.types.ts` file and keep only Mongoose-specific code — `Schema` definitions, sub-schemas, indexes, the `HydratedDocument<T>` type, and the model export. This is not just backend hygiene: the plain type file has zero Mongoose dependency, so the exact same interface is directly reusable by frontend code (components, forms, server action signatures) instead of being duplicated or re-declared.

**Bad:**
```ts
// src/lib/db/models/transcript.model.ts
interface TranscriptFields { title: string; status: TranscriptStatus /* ... */ }
const transcriptSchema = new Schema<TranscriptFields>({ /* ... */ });
```

**Good:**
```ts
// src/types/transcript.types.ts — zero mongoose dependency, frontend-safe
export interface TranscriptFields { title: string; status: TranscriptStatus /* ... */ }

// src/lib/db/models/transcript.model.ts
import type { TranscriptFields } from '@/types/transcript.types';
const transcriptSchema = new Schema<TranscriptFields>({ /* ... */ });
```

### XII. Design Fidelity

- The prototype HTML file located in the `/Design` directory is the **single canonical source of truth** for the entire application's visual design.
- Code MUST deliver a **1:1 pixel-perfect match** to this file: exact font sizes, font weights, font families, colors, margins, paddings, border radii, and spacing.
- Any deviation from the prototype MUST be flagged and justified. When in doubt, the prototype wins.

### XIII. AI-Assisted Development Workflow

- **UI implementation** — The prototype in `/Design` is the complete visual spec. There is nothing to brainstorm or redesign. Use the `frontend-design` skill to translate the prototype into code with exact fidelity: matching font sizes, weights, colors, spacing, and layout 1:1. The skill ensures intentional execution rather than templated or generic output. Do NOT invent new layouts, color choices, or visual directions — replicate the prototype.
- **Non-visual work** (feature logic, architecture, data layer, integrations, config) — Use the `superpowers:brainstorming` skill to explore requirements, propose approaches, and get user approval before implementation. No code may be written until the design is approved.
- The development sequence depends on the task:
  - **UI tasks**: `frontend-design` → Plan → Implement (prototype IS the design — no brainstorming needed)
  - **Logic/architecture tasks**: `superpowers:brainstorming` → Plan → Implement
  - **Mixed tasks**: Brainstorm the logic, then use `frontend-design` for the UI portion

### XIV. Error Handling & Observability

- Errors MUST be categorized as **operational** (recoverable, expected) or **programmer** (bugs, unexpected state). Operational errors MUST surface user-friendly messages. Programmer errors MUST fail loudly with full context — never silently swallowed.
- Bare `catch {}` blocks are NEVER permitted. Every caught error MUST be handled explicitly: either surfaced to the user, logged with context, or re-thrown with enriched information.
- Async operations MUST ALWAYS have error handling. Unhandled promise rejections are NEVER permitted.
- Error responses from server actions and API routes MUST NEVER expose internal stack traces, database details, or system information to end users. Return structured error objects with user-safe messages.
- Structured logging MUST be used throughout the application. Every meaningful server-side event MUST be logged with sufficient context to diagnose issues without accessing production systems directly.
- Sensitive data (passwords, tokens, personal data) MUST NEVER appear in logs under any circumstances.

**Bad:**
```ts
try {
  await createUser(data);
} catch {}  // silent failure

// Exposing internals
return { error: error.stack };
```

**Good:**
```ts
try {
  await createUser(data);
} catch (error) {
  logger.error('User creation failed', { userId: data.id, error });
  return { error: 'Unable to create user. Please try again.' };
}
```

### XV. Quality & Performance

- Code MUST be clean, readable, and maintainable. Every function and file MUST follow the Single Responsibility Principle. Functions SHOULD do exactly one thing and do it well.
- Naming MUST be descriptive, consistent, and self-documenting. Magic numbers and hardcoded strings MUST be extracted into named constants in `src/constants/` or feature-level constant files.
- Dead code MUST be removed immediately. Commented-out code MUST NOT be committed to the codebase — use git history instead.
- Application components MUST remain stateless wherever practical. UI state that influences navigation MUST use URL state. Global client state MUST be minimized.
- Performance MUST be considered throughout development. Every data-dependent view MUST have loading, empty, and error states designed. Images MUST use Next.js `<Image>` with explicit dimensions. Heavy client bundles MUST be code-split.
- New dependencies MUST have a clear justification. Before adding a package, evaluate: maintenance status, security posture, bundle size impact, licensing, and whether the functionality can reasonably be implemented without the dependency.
- Simplicity MUST be preferred over cleverness. YAGNI and KISS: nothing built speculatively, nothing more complex than the problem demands.

### XVII. No Barrel Imports

- **Barrel files are categorically prohibited.** A "barrel" is any `index.ts` (or `index.js`) that exists solely to re-export symbols from other files within the same directory. NEVER create or maintain barrel files anywhere in the codebase.
- Consumers MUST import directly from the source file that declares the symbol. This applies to all code — components, features, integrations, utilities, repositories, schemas, and any other directory.
- No exceptions: not for `src/integrations/<service>/index.ts`, not for feature modules, not for `src/components/ui/index.ts`, not for shared libraries. If a directory has multiple exports, consumers import each one directly.

**Rationale**: Barrel files silently pull entire modules into the consumer's bundle, defeating tree-shaking. They also create non-obvious circular dependency risks and obscure the actual dependency graph, making refactoring harder and import audits unreliable.

**Bad:**
```ts
// src/integrations/claude/index.ts — DO NOT CREATE
export { TranscriptSummarizer } from './transcript-summarizer';
export type { SummarizationResponse } from '@/types/claude.types';

// server action
import { TranscriptSummarizer } from '@/integrations/claude';
```

**Good:**
```ts
// server action — import directly from source files
import { TranscriptSummarizer } from '@/integrations/claude/transcript-summarizer';
import type { SummarizationResponse } from '@/types/claude.types';
```

### XVI. Git & Deployment Standards

- **Branch naming** MUST follow `type/short-description`. Permitted types: `feat`, `fix`, `hotfix`, `perf`, `refactor`, `docs`, `test`, `chore`, `build`, `ci`, `revert`. Description MUST be lowercase alphanumeric with hyphens only.
- **Direct pushes** to `main`, `master`, `dev`, and `development` are STRICTLY PROHIBITED. All changes MUST flow through Pull Requests. The pre-push hook enforces this automatically.
- **Commits** MUST follow Conventional Commits: `type(scope): description`. Permitted scopes: `app`, `auth`, `api`, `ui`, `db`, `infra`, `config`, `deps`, `release`. Subject MUST be imperative, lowercase, and under 100 characters. The `commit-msg` hook enforces this via commitlint.
- Every PR MUST be reviewed before merging. Reviews MUST verify correctness, constitution compliance, TypeScript strictness, and security.
- Every PR to `main` or `dev` MUST pass the full `validate` pipeline (type-check → lint → build) before it can be merged. CI enforces this automatically.
- Environment variables MUST be validated at startup before the server binds any port. The `env.mjs` import in `next.config.ts` enforces fail-fast behavior.

### XVII. No Barrel Imports

- **Barrel files are categorically prohibited.** A "barrel" is any `index.ts` (or `index.js`) that exists solely to re-export symbols from other files within the same directory. NEVER create or maintain barrel files anywhere in the codebase.
- Consumers MUST import directly from the source file that declares the symbol. This applies to all code — components, features, integrations, utilities, repositories, schemas, and any other directory.
- No exceptions: not for `src/integrations/<service>/index.ts`, not for feature modules, not for `src/components/ui/index.ts`, not for shared libraries. If a directory has multiple exports, consumers import each one directly.

**Rationale**: Barrel files silently pull entire modules into the consumer's bundle, defeating tree-shaking. They also create non-obvious circular dependency risks and obscure the actual dependency graph, making refactoring harder and import audits unreliable.

**Bad:**
```ts
// src/integrations/claude/index.ts — DO NOT CREATE
export { TranscriptSummarizer } from './transcript-summarizer';
export type { SummarizationResponse } from '@/types/claude.types';

// server action
import { TranscriptSummarizer } from '@/integrations/claude';
```

**Good:**
```ts
// server action — import directly from source files
import { TranscriptSummarizer } from '@/integrations/claude/transcript-summarizer';
import type { SummarizationResponse } from '@/types/claude.types';

**Bad:**
```bash
git push origin main          # direct push to protected branch
git commit -m "fix stuff"     # no conventional commit format
git checkout -b myFeature     # no type prefix, wrong case
```

**Good:**
```bash
git checkout -b feat/sales-dashboard
git commit -m "feat(ui): add sales pipeline dashboard"
git push origin feat/sales-dashboard  # then open a PR
```

## Directory Architecture

```text
src/
├── app/                    # Next.js App Router pages & layouts
│   ├── globals.css         # Design tokens (single source of truth)
│   ├── layout.tsx          # Root layout
│   └── <feature>/          # Route-based feature directories
├── components/
│   ├── ui/                 # Atomic reusable UI primitives (buttons, inputs, badges, etc.)
│   └── common/             # Shared cross-feature composed components
├── features/               # Self-contained domain feature modules
│   └── <feature>/
│       ├── actions/        # Server actions
│       ├── components/     # Feature-specific composed components
│       ├── hooks/          # Feature-specific hooks
│       ├── utils/          # Feature-specific utilities
│       └── types/          # Feature-specific types
├── lib/                    # Shared infrastructure and core libraries
│   ├── db/                 # Database client (MongoDB connection, helpers)
│   ├── auth/               # Authentication and authorization helpers
│   └── utils/              # Shared utility functions
├── integrations/           # External service integrations and API clients
├── providers/              # React context providers
├── repositories/           # Database abstraction layer (classes)
├── schemas/                # Shared Zod validation schemas
├── config/                 # Application configuration
├── constants/              # Shared constants and configuration values
├── types/                  # Shared cross-feature types
└── middleware.ts           # Next.js middleware entry point
```

**Directory Principles**

- `app/` MUST contain only routing, layouts, page entry points, and route-level Server Components.
- `features/` MUST organize code by business domain. Each feature MUST be self-contained: components, actions, hooks, utils, and types all live inside the feature directory.
- A feature MUST NEVER import directly from another feature's internals. Cross-feature dependencies MUST flow through explicitly defined shared modules (`lib/`, `schemas/`, `types/`, `constants/`).
- `components/` MUST contain only UI components shared across multiple features. `ui/` holds atomic primitives; `common/` holds cross-feature composed components.
- `lib/` MUST contain shared infrastructure: database client, authentication helpers, and global utilities. No business logic belongs here.
- `integrations/` MUST encapsulate all communication with external services and third-party APIs. Each integration MUST be self-contained with its own client, types, and error handling.
- `providers/` MUST contain React context providers (e.g., auth context, theme). Providers MUST NOT contain business logic.
- `repositories/` MUST contain all database abstraction classes. No direct database calls outside this directory.
- `schemas/` MUST contain Zod schemas shared across multiple features. Feature-specific schemas live inside the feature directory.
- `constants/` MUST contain named constants and configuration values used across the application. Magic numbers and magic strings MUST be extracted here.
- The `@/*` path alias MUST be used for all imports from `src/`. Relative imports beyond one level (`../../`) are NEVER permitted.
- `middleware.ts` MUST be the sole Next.js middleware entry point. Helper modules MAY be organized in a `middleware/` subdirectory imported by the entry point.

## Quality Gates & CI/CD

All pull requests to `main` or `dev` MUST pass the `validate` pipeline which executes sequentially:

1. **Type-check** — `tsc --noEmit` (zero type errors)
2. **Lint & Format** — `eslint --max-warnings=0` + `prettier --check` (zero warnings, zero formatting drift)
3. **Build** — `next build` (zero compilation errors)

Pre-commit hooks enforce lint-staged and type-checking locally. Pre-push hooks enforce branch naming conventions (`type/short-description`) and block direct pushes to protected branches (`main`, `master`, `dev`, `development`).

## Governance

- This constitution **supersedes** all other coding practices, conventions, and ad-hoc decisions for the Kaffea-X Sales codebase.
- All pull requests and code reviews MUST verify compliance with these principles.
- **Amendments** require:
  1. A written proposal documenting the change and rationale.
  2. Version bump following semantic versioning (MAJOR for principle removals/redefinitions, MINOR for additions, PATCH for clarifications).
  3. Update to this file and propagation to dependent templates.
- The `rulebook.md` file at the repository root serves as the upstream source for constitutional principles. Changes to the rulebook MUST be reflected here.

**Version**: 1.4.0 | **Ratified**: 2026-07-20 | **Last Amended**: 2026-07-23
