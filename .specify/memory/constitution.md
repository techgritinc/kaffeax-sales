<!--
  Sync Impact Report
  ==================
  Version change: 1.1.0 → 1.1.1 (PATCH — clarify brainstorm vs prototype scope)
  Added principles:
    - I. Tech Stack & Framework
    - II. CSS & Design Tokens
    - III. TypeScript Strictness
    - IV. Linting & Formatting
    - V. Code Modularity
    - VI. Reusable UI Components
    - VII. Utility Functions
    - VIII. Schema Validation & Forms
    - IX. Repository Layer
    - X. Server Actions & API Layer
    - XI. Type Isolation
    - XII. Design Fidelity
    - XIII. AI-Assisted Development Workflow
  Added sections:
    - Directory Architecture
    - Quality Gates & CI/CD
  Removed sections: None (initial version)
  Templates:
    ✅ .specify/templates/plan-template.md — Constitution Check section aligns with principle-driven gates; no update needed.
    ✅ .specify/templates/spec-template.md — User stories and requirements structure is compatible; no update needed.
    ✅ .specify/templates/tasks-template.md — Phase structure supports modularity and story-based delivery; no update needed.
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

- Pure utility functions MUST be extracted into dedicated utility files — either globally in `src/utils/` or at the feature level in `src/features/<feature>/utils/`.
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

## Directory Architecture

```text
src/
├── app/                    # Next.js App Router pages & layouts
│   ├── globals.css         # Design tokens (single source of truth)
│   ├── layout.tsx          # Root layout
│   └── <feature>/          # Route-based feature directories
├── components/
│   ├── ui/                 # Atomic reusable UI components
│   └── <feature>/          # Feature-specific composed components
├── features/               # Feature modules (logic, hooks, utils)
│   └── <feature>/
│       ├── actions/        # Server actions
│       ├── hooks/          # Feature-specific hooks
│       ├── utils/          # Feature-specific utilities
│       └── types/          # Feature-specific types
├── repositories/           # Database abstraction layer (classes)
├── schemas/                # Shared Zod validation schemas
├── types/                  # Shared cross-feature types
└── utils/                  # Global utility functions
```

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

**Version**: 1.1.1 | **Ratified**: 2026-07-20 | **Last Amended**: 2026-07-20