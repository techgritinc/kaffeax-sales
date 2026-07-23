# Research: Transcript Schema & Database Connection Layer

**Date**: 2026-07-22 | **Plan**: [plan.md](./plan.md) | **Spec**: [spec.md](./spec.md)

## R1: Mongoose Version & Compatibility

**Decision**: Use Mongoose 8.x (latest stable)

**Rationale**: Mongoose 8.x ships its own TypeScript types (no separate `@types/mongoose` needed), supports ESM imports, and aligns with Node.js 18+ which Next.js 16 requires. Mongoose 8 also removed deprecated callbacks in favor of promises, which matches the async/await patterns required by the constitution.

**Alternatives considered**:
- Native MongoDB driver (`mongodb`): Lower-level, no schema validation, more boilerplate. The design doc explicitly specifies Mongoose and the constitution mandates a repository layer — Mongoose schemas provide the structural validation layer between repositories and the database.
- Prisma with MongoDB: Adds a heavy ORM abstraction and code generation step. The project already has a specific Mongoose-based design; introducing Prisma would require rearchitecting the connection layer and is not aligned with the existing Kaffea-X platform patterns.

---

## R2: Singleton Connection Pattern for Next.js

**Decision**: Global process-level cache using `globalThis` with promise deduplication

**Rationale**: Next.js in development mode reloads modules on file changes, which would create multiple Mongoose connections if the connection instance is module-scoped. Storing the connection (and in-flight promise) on `globalThis` ensures a true singleton that survives Hot Module Replacement. This is the established pattern in the Next.js + Mongoose ecosystem and is explicitly specified in the design doc.

**Implementation details**:
- Cache both the resolved Mongoose instance and the in-flight connection promise on `globalThis`
- On connection failure, clear the cached promise so subsequent calls retry
- Set `bufferCommands: false` to prevent Mongoose from queuing operations when disconnected
- Set `serverSelectionTimeoutMS: 3000` for fail-fast behavior

**Alternatives considered**:
- Module-scoped singleton (no `globalThis`): Works in production but creates connection leaks in Next.js dev mode due to HMR module re-evaluation.
- Connection-per-request: Unacceptable overhead and resource exhaustion risk. MongoDB connections are expensive to establish.

---

## R3: `@env` Path Alias

**Decision**: Add `"@env": ["./env.mjs"]` to `tsconfig.json` paths

**Rationale**: The design doc specifies this alias so that `mongoose.ts` can import the validated env object with `import { env } from '@env'`. This follows the KX platform convention and keeps the env import clean. The `env.mjs` file lives at the project root (not under `src/`), so the existing `@/*` alias (which maps to `./src/*`) cannot reach it.

**Alternatives considered**:
- Relative import (`../../env.mjs`): Violates the constitution's rule against relative imports beyond one level. Also fragile if the file structure changes.
- Re-export from `src/`: Adds an unnecessary indirection file. The path alias is cleaner and matches existing conventions.

---

## R4: `withDb` Wrapper Design

**Decision**: Higher-order function with two overloaded call signatures

**Rationale**: The design doc specifies two shapes:
1. **Zero-arg task**: `await withDb(() => repo.findDrafts(userId))` — wraps a simple async function that needs a DB connection
2. **Route handler**: `export const POST = withDb(async (req: Request) => { ... })` — wraps a Next.js route handler, passing through the request

This eliminates `await connectDB()` boilerplate at every call site. The wrapper calls `connectDB()` internally and surfaces connection errors immediately.

**Implementation note**: TypeScript function overloads will handle the two shapes. The wrapper must propagate the return type of the wrapped function for type safety.

**Alternatives considered**:
- Middleware-based: Next.js middleware runs on the Edge runtime which doesn't support Mongoose. Not viable.
- Decorator pattern: TypeScript decorators are experimental and add complexity. A plain HOF is simpler and more explicit.

---

## R5: Index Strategy

**Decision**: Define indexes declaratively in Mongoose schemas using `schema.index()`

**Rationale**: Mongoose's `autoIndex` feature creates indexes on application startup in development. In production, `autoIndex` should be disabled (Mongoose 8 defaults to this) and indexes should be created via a migration script or `ensureIndexes()` call. The index definitions from the design doc are:

**Transcripts**:
- `{ userId: 1, status: 1, createdAt: -1 }` — primary list query
- `{ userId: 1, createdAt: -1 }` — chronological user query
- `{ externalMeetingId: 1 }` — sparse unique, webhook dedup
- `{ zohoLeadId: 1 }` — sparse, CRM lookup

**RubricSignals**:
- `{ signalId: 1 }` — unique, upsert key
- `{ weight: 1 }` — filter by band
- `{ isActive: 1 }` — filter active signals

**Alternatives considered**:
- Atlas UI index creation: Requires manual steps outside the codebase. Declarative indexes in schemas are self-documenting and version-controlled.
- Separate migration scripts: Overkill for initial schema creation. Schema-declared indexes are the standard Mongoose approach.

---

## R6: Mongoose Timestamps vs Manual Date Fields

**Decision**: Use Mongoose's built-in `timestamps: true` option

**Rationale**: Setting `timestamps: true` on the schema automatically manages `createdAt` and `updatedAt` fields. This is more reliable than manual date management, handles edge cases (updates via `findOneAndUpdate`, etc.), and produces the same Date fields specified in the design doc.

**Alternatives considered**:
- Manual `createdAt`/`updatedAt` with pre-save hooks: More code, more opportunities for bugs, no benefit. The built-in option is standard practice.

---

## R7: Status Field — String Enum vs Constant

**Decision**: Define status values as a TypeScript `const` array and reference it in both the Mongoose schema enum and the TypeScript type

**Rationale**: The constitution mandates no magic strings (XV) and explicit types (III). A shared `const` array like `TRANSCRIPT_STATUSES = ['processing', 'draft', 'saved', 'failed'] as const` provides:
- A single source of truth for valid values
- TypeScript literal union type via `typeof TRANSCRIPT_STATUSES[number]`
- Mongoose enum validation via the same array

**Alternatives considered**:
- TypeScript `enum`: Generates runtime code and doesn't integrate as cleanly with Mongoose's `enum` option, which expects an array of strings.
- Inline string literals: Violates the no-magic-strings principle and duplicates values across schema and type definitions.
