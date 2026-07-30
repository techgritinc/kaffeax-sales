# Research: Zoho CRM Integration

**Feature**: TAE-86 | **Date**: 2026-07-28

## R1: HTTP Client Choice — Native fetch vs Axios

**Decision**: Use native `fetch` (Node.js built-in)

**Rationale**: The project has no axios dependency. The existing integrations (Claude, OpenRouter) use native `fetch`. Adding axios for a single integration violates §XV (new dependencies must have clear justification). The Zoho API calls are straightforward GET/PUT with JSON payloads — `fetch` handles this without issue.

**Alternatives considered**:
- **axios**: Used by the reference KX project, but that project already had axios as a dependency. Adding it here would introduce a new dependency just for Zoho. Rejected per constitution §XV.
- **ky/got**: Lighter HTTP clients, but still unnecessary dependencies when native `fetch` suffices.

## R2: Token Refresh Strategy — Expiry Window

**Decision**: Use a 60-second safety buffer (refresh if `expires_at < Date.now() + 60_000`)

**Rationale**: The reference KX project uses this exact pattern. The Zoho access token has a 3600-second (1 hour) lifetime (not 10 minutes as initially described — the prompt's "10 minutes" refers to the user's mental model of checking before calls, but the actual Zoho token lifetime is 1 hour via `expires_in` returned from the token endpoint). The 60-second buffer prevents using a token that is about to expire mid-request. The `expires_at` is computed from `Date.now() + expires_in * 1000` at refresh time and stored in MongoDB.

**Alternatives considered**:
- **No buffer**: Risk of token expiring during a request. Rejected.
- **Larger buffer (5 minutes)**: Unnecessary; 60 seconds is sufficient since Zoho API calls complete in under 10 seconds.

## R3: CRM API Version

**Decision**: Use Zoho CRM API v7 (`/crm/v7/`)

**Rationale**: The reference KX project uses v8, but v7 is the current stable version. The endpoints used (Leads/search, Leads/{id} PUT) are available on both. Using a stable version avoids unexpected breaking changes. The base URL is configurable via env var, so switching to v8 later requires only an env change.

**Alternatives considered**:
- **v8**: Used by KX, but KX uses advanced features (picklists, trades, warehouses) not needed here. v7 suffices for lead search and update.

## R4: Error Handling Pattern

**Decision**: Structured error returns from server actions (never throw to client)

**Rationale**: Per constitution §XIV and §X, server actions must return structured error objects. The server action returns `{ success: boolean; error?: string }`. Internal Zoho errors are logged server-side with context; the user sees only a safe message. This follows the existing pattern in the codebase.

**Alternatives considered**:
- **Throw errors from server actions**: Client would need try/catch. Messier UX, risk of exposing internals. Rejected.
- **Error boundary approach**: Overkill for a single action result. Rejected.

## R5: Singleton vs Instance Pattern for CRM Client

**Decision**: Module-level singleton (instantiated at module scope, exported as const)

**Rationale**: Follows the reference KX project pattern. The CRM client is stateless (all state is in the auth service's token management). A singleton avoids re-instantiation overhead and matches the `zohoAuth` pattern.

**Alternatives considered**:
- **Class with static getInstance()**: More boilerplate for the same result. Used in KX for auth service where it makes sense (credential validation in constructor). The CRM client is simpler.
- **Factory function per call**: Unnecessary; the client holds no per-request state.

## R6: Field Mapping Strategy

**Decision**: Centralized constant map in `src/constants/zoho-field-map.ts` with a pure mapping function

**Rationale**: The prompt explicitly states API names are placeholders for now. Centralizing them in one constants file means the user swaps values in exactly one place when real API names are available. The mapping function is pure (no side effects, independently testable per §VII).

**Alternatives considered**:
- **Inline field names in the update call**: Scattered, hard to update. Rejected.
- **Config file (JSON/YAML)**: Over-engineered for a simple key-value map that rarely changes. Rejected.

## R7: Lead Deduplication on Email Match

**Decision**: Use the first lead returned by Zoho's search endpoint

**Rationale**: The spec assumes email is the unique identifier on the Leads module. Zoho's `/Leads/search?email=X` returns results ordered by most recently modified. Taking the first result is the standard pattern used in the reference KX project (`searchLeadByEmail` returns the first match). If the user later needs multi-match handling, the function signature already returns a single record, so it can be updated to add selection logic without breaking the caller.

**Alternatives considered**:
- **Return all matches and let the server action choose**: Adds complexity with no current use case. Rejected.
- **Throw on multiple matches**: Too strict; Zoho data may have legitimate duplicates. Rejected.

## R8: Toast Position Flicker Root Cause (2026-07-30)

**Decision**: Rewrite `@keyframes kx-toast-in` in `globals.css` to animate the CSS `translate` property instead of `transform`, with the same `-50%` X value on both the `from` and `to` frames.

**Rationale**: `toast.tsx` applies both the Tailwind utility `-translate-x-1/2` and the `animate-toast-in` animation on the same element. Tailwind v4 compiles `-translate-x-1/2` to the CSS `translate` property (a behavior change from v3, which used `transform`). The hand-written `@keyframes kx-toast-in`, however, still uses the legacy `transform: translate(-50%, ...)` syntax. `translate` and `transform` are independent CSS properties that compose (both apply simultaneously) — during the 0.2s animation the two -50% X offsets stack, over-shifting the toast left; when the animation ends (no `animation-fill-mode: forwards`), its `transform` override lapses and only the static `translate: -50%` from the Tailwind class remains, producing the visible rightward snap the user reported ("shows... then shifts slightly rightwards"). Animating the same `translate` property in the keyframes — with matching values at the `to` frame — eliminates the property conflict and guarantees the animated end-state exactly equals the static resting state, so there is nothing left to snap to.

**Alternatives considered**:
- **Add `animation-fill-mode: forwards`**: Would keep the keyframe's `transform` value applied after the animation ends, but doesn't fix the root conflict — the two properties would still stack during the animation itself (visible as an initial over-shift, just without the end-of-animation snap). Rejected as a partial fix.
- **Remove the Tailwind `-translate-x-1/2` class and center via `left: 50%; margin-left: -{width}/2`**: Requires knowing the toast's width up front (it doesn't have a fixed width — message length varies), so this is not viable without JS measurement. Rejected as unnecessarily complex.
- **Drop the animation entirely, keep only the Tailwind utility**: Simplest, but removes the intended fade/slide-in polish. Rejected — the fix above preserves the animation with zero added complexity.
