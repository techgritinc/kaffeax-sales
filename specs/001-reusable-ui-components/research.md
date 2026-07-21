# Phase 0 Research: Reusable UI Components — Kaffea-X Prototype Reproduction

All Next.js findings verified against the bundled docs at `node_modules/next/dist/docs/` for the installed version **16.2.10** (not training data — this version has breaking changes).

## R1 — Client vs Server Components

- **Decision**: The root `layout.tsx` and `page.tsx` stay Server Components; `page.tsx` renders a client `AppShell`. Everything interactive (shell, header, stepper, all feature components, the `WorkflowProvider`) is a Client Component. The `'use client'` directive is placed only on entry-point client files (provider, AppShell); imported child components inherit the client bundle.
- **Rationale**: The entire app is interactive stateful UI; Server Components cannot hold React state/context. `'use client'` is unchanged in Next 16 (`use-client.md`). Context providers must be Client Components (`05-server-and-client-components.md`).
- **Alternatives considered**: Marking every component file `'use client'` — unnecessary; only entry points need it. Server-rendering static sections — rejected; the shared state machine spans all surfaces, so a single client boundary at the shell is simpler and matches the prototype's all-client nature.
- **Constraint noted**: Event-handler functions cannot be passed from a Server Component into a Client Component — irrelevant here since composition happens inside the client boundary.

## R2 — Fonts (`next/font`)

- **Decision**: Load **Figtree** and **Playfair Display** via `next/font/google` in `layout.tsx` with `variable: '--font-figtree'` / `variable: '--font-playfair'`, apply both `.variable` classes to `<html>`, and wire them in `globals.css` via `@theme inline { --font-sans: var(--font-figtree); --font-display: var(--font-playfair); }`. Include the weights the prototype uses (Figtree 300–800; Playfair Display 700/900, plus italic style for the evidence tooltip).
- **Rationale**: This is the documented Next 16 + Tailwind v4 pattern (`font.md`, `13-fonts.md`). It self-hosts fonts (no external Google Fonts `<link>`, avoiding the prototype's CDN dependency), gives `display: swap`, and exposes CSS variables the existing token layer already references.
- **Alternatives considered**: Keeping the prototype's Google Fonts `<link>` — rejected (external network dependency, no optimization, contrary to Next best practice). Hardcoding font-family strings (current `globals.css` state) — replaced by the `next/font` variables.

## R3 — Image component (`next/image`)

- **Decision**: Use `next/image` for the header logo (`/images/KX-Primary-logo.png`), the collapsed mini logo/favicon (`/icons/favicon.png`), and the chat AI avatar, each with explicit `width`/`height` and `alt`. Text avatars ("MR", attendee initials) remain CSS/DOM, not images.
- **Rationale**: Assets already exist in `public/`; `next/image` with explicit dimensions satisfies Principle XV. Required props are `src` + `alt`; `width`/`height` required for non-static-imported public assets (`image.md`, `12-images.md`).
- **Next-16 changes acknowledged**: default `minimumCacheTTL` now 4h; `qualities` defaults to `[75]`; local-IP optimization blocked by default. None affect static same-origin `public/` assets. `next/legacy/image` and `images.domains` are deprecated — not used.

## R4 — App Router layout/page & metadata

- **Decision**: Keep the existing root layout (already valid: `<html>`/`<body>`, `metadata` export). `page.tsx` is a thin route that renders `AppShell`. No dynamic route params/searchParams are used (single route, in-memory step state).
- **Rationale**: Conventions unchanged in Next 16 except that `params`/`searchParams`/`cookies`/`headers` are now **async Promises** (`version-16.md`) — we avoid this class of breakage entirely by not depending on request-time params. Metadata API shape is unchanged.
- **Alternatives considered**: Encoding the workflow step in `searchParams` — rejected (see plan Complexity Tracking; would change URL behaviour vs. the prototype and pull in async searchParams handling).

## R5 — Tailwind CSS v4 integration & CSS-token strategy

- **Decision**: Continue the existing wiring (`@import 'tailwindcss'` in `globals.css`, `@tailwindcss/postcss` in PostCSS). Translate the prototype's `kx-*` stylesheet into Tailwind utility classes that resolve **only** from tokens. Extend `globals.css` `@theme` with the values the prototype needs that aren't yet tokenised:
  - **Radii** → `--radius-*` (button 8px/sm 6px, card 10–12px, pill 20px, input 4–6px, chat-send 2px).
  - **Shadows** → `--shadow-*` (soft card shadow, overlay shadow) using the prototype's midnight-tinted rgba values, defined once as tokens.
  - **Gradients** → chat rail via `bg-linear-to-b from-chat-bg-start to-chat-bg-end` (tokens already exist).
  - **Animations** → `@keyframes` + `--animate-*` for `kx-spin`, `kx-shimmer-slide`, `kx-toast-in`, `kx-fade-in`, `kx-chat-slide-up`; consumed as `animate-*` utilities.
  - **Breakpoints** → `--breakpoint-*` for 1100/900/720/640/560/400 so responsive variants (`max-*`) match the prototype exactly.
- **Rationale**: Principle II forbids hardcoded colours and inline styles and requires token-driven Tailwind utilities; `@theme` is the Tailwind v4 mechanism (`11-css.md`, `font.md`). Defining shadows/radii/animations/breakpoints as tokens keeps every component free of raw values and preserves 1:1 fidelity.
- **Alternatives considered**: Porting the `kx-*` stylesheet verbatim as global CSS classes — rejected (violates Principle II's "every colour via a Tailwind utility class" and the token-only rule; leaves untokenised hex in CSS). CSS Modules per component — rejected (still needs raw values, diverges from the mandated Tailwind-utility approach). Arbitrary Tailwind values with raw hex (`bg-[#41BB93]`) — rejected (hardcoded colour). Arbitrary values are used **only** for non-colour one-off pixel values when tokenising is not warranted.

## R6 — State management for the mocked workflow

- **Decision**: One `WorkflowProvider` (Client Component) using `useReducer` holds all state: `step`, `library`, active `draft`, `rubric`, `crm` records, `audit` log, `toast`, chat messages, sidebar/chat visibility, rubric-modal open. It exposes typed actions (`process`, `patch`, `approve`, `reject`, `goTo`, `openFromLibrary`, `newCapture`, `resetDemo`, rubric add/edit/delete, `sendChat`, `notify`). Pure engine functions live in `engine.ts`; seed data in `seed.ts`.
- **Rationale**: The prototype is a single `KaffeaXPOC` component holding all state and passing it down; a Context+reducer is the faithful, testable, modular equivalent that also satisfies the no-cross-feature-import rule (features read shared state via `useWorkflow()`). Keeps components stateless where practical (Principle XV).
- **Alternatives considered**: A third-party store (Zustand/Redux) — rejected (new dependency, unjustified for a single-page mock, FR-022). Prop-drilling from `page.tsx` — rejected (violates modularity, unwieldy across six surfaces). URL state for step — rejected (fidelity, see Complexity Tracking).

## R7 — Preserving prototype behaviour & quirks

- **Decision**: Reproduce mocked timings and algorithms exactly (processing tick 380ms, ~900–1400ms simulated latency, toast 3200ms auto-dismiss, id formats `DRF-######`/`ZOHO-######`/`REJ-######`, `claude-sonnet-4-6` model id, banding thresholds, `SCORE_BY_BAND` 93/68/34). Preserve known prototype artefacts (hardcoded "June 24, 2026" meeting date; Cascade Ember's duplicated title phrase) rather than "fixing" them.
- **Rationale**: Principle XII and FR-022/SC-007 require reproducing the prototype exactly with no enhancements; quirks are treated as canonical (spec Assumptions).
- **Alternatives considered**: Correcting the quirks — rejected without explicit user instruction.

## R8 — Error handling for browser APIs

- **Decision**: `FileReader` (transcript drop/attach) and `navigator.clipboard` (recap copy) calls handle failure explicitly (no bare `catch {}`), matching the prototype's user-facing behaviour (error banner / no-op with feedback). `mailto:` email uses a plain anchor/navigation.
- **Rationale**: Principle XIV forbids silent catches and unhandled rejections.
- **Alternatives considered**: None — this is a direct constitutional requirement.

## Open questions

None. All Technical Context items are resolved; no `NEEDS CLARIFICATION` markers remain.
