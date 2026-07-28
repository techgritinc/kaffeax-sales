# Implementation Conventions (read before writing any code)

This is a **faithful, pixel-perfect reproduction** of `Design/POC_Kaffea-X_Prototype.html`. Match exact px sizes, weights, spacing, radii, and colors. Do NOT redesign or "improve."

Stack: Next.js 16 (App Router) · React 19 · TypeScript 5 (strict) · Tailwind CSS v4.

## Hard rules (CI fails otherwise)

- **No hardcoded colors.** No `#hex`, `rgb()`, `hsl()` anywhere. All colors come from the design tokens registered in `src/app/globals.css`.
- **No inline `style={{ }}`.** Everything via Tailwind utility classes.
- **No `any`. No non-null assertions (`!`).** Use precise types, `unknown` + narrowing, `?.`, `??`.
- **≤150 lines per file. One component per file.** Split into sub-components/hooks if larger.
- **`@/` alias** for all `src/` imports. No `../../`.
- Explicit exported prop `interface` for every component. Import shared types from `@/types/*`.
- Prettier will sort imports and Tailwind classes automatically — don't hand-fight ordering.

## className merging

Every component accepts an optional `className?: string` and merges it LAST:

```tsx
import { cn } from '@/lib/utils/cn';
// ...
<div className={cn('base classes here', variantClass, className)} />
```

## `'use client'`

Add `'use client'` ONLY to files that use React hooks (`useState`/`useEffect`/`useRef`/`useReducer`) or attach browser event listeners. Purely presentational components get NO directive (they render fine inside the client tree).

## Token → utility reference (all defined in globals.css)

**Colors** (use as `bg-*`, `text-*`, `border-*`):
`midnight, midnight-hover, midnight-send-hover, dark-blue, bright-blue, light-blue, pale-blue, green, green-deep, mustard, rust, dark-teal, cream, tan, dark-brown, white, text, muted, border, border-strong, border-warm, page-bg, card-bg, sidebar-bg, sidebar-text, sidebar-muted, sidebar-group-count, transcript-bg, contact-panel-bg, band-tile-bg, chip-bg, compose-bg, rust-tint, input-warn-bg, toast-text-dark`.

- Semi-transparent brand fills (prototype uses `rgba(65,187,147,0.14)` etc.): use **arbitrary opacity** on the token, matching alpha exactly — e.g. `bg-green/[0.14]`, `border-green/[0.35]`, `bg-midnight/[0.06]`, `bg-mustard/[0.14]`, `text-*`. NEVER write the raw rgba.
- White-on-navy translucency (`rgba(255,255,255,0.06)`): `bg-white/[0.06]`, `border-white/[0.12]`, `text-white/70`.

**Fonts:** `font-sans` (Figtree), `font-display` (Playfair Display), `font-mono` (Consolas stack).

**Font sizes:** use arbitrary to match exactly — `text-[13px]`, `text-[12.5px]`, `text-[11px]`, `text-[10.5px]`, `text-[9.5px]`. Weights: `font-medium`(500), `font-semibold`(600), `font-bold`(700), `font-extrabold`(800), `font-black`(900).

**Letter-spacing / line-height:** arbitrary — `tracking-[0.06em]`, `tracking-[0.14em]`, `leading-[1.55]`, `leading-[1.2]`. (Arbitrary non-color values are allowed.)

**Radii:** `rounded-tight`(2px) `rounded-input-sm`(4px) `rounded-input`(6px) `rounded-btn-sm`(6px) `rounded-btn`(8px) `rounded-card-sm`(10px) `rounded-card`(12px) `rounded-pill`(20px) `rounded-full`.

**Shadows:** `shadow-header, shadow-btn, shadow-btn-primary-hover, shadow-tooltip, shadow-drawer, shadow-fab, shadow-fab-hover, shadow-rubric-fab, shadow-rubric-fab-hover, shadow-overlay, shadow-card, shadow-card-hover, shadow-signal-hover, shadow-add-signal, shadow-add-signal-hover, shadow-compose, shadow-commit, shadow-commit-hover, shadow-strip, shadow-narrative, shadow-metric-hover, shadow-attendee-hover, shadow-bcard, shadow-bitem, shadow-heard-col, shadow-evidence, shadow-letter, shadow-proc, shadow-actions-top`.

**Animations:** `animate-spin` (built-in 1s), `animate-spin-slow` (1.4s), `animate-shimmer`, `animate-toast-in`, `animate-fade-in`, `animate-chat-slide-up`.

**Gradients:** use Tailwind gradient utilities with tokens, e.g. chat rail = `bg-linear-to-b from-chat-bg-start to-chat-bg-end`. For prototype off-white gradients (`#FDFBF5→#FFFFFF`) the exact hexes aren't tokens — approximate with the nearest token surface (`bg-card-bg`) OR add a token if truly needed (ask, don't hardcode).

## Icon API (canonical — all consumers use this)

```tsx
import { Icon, type IconName } from '@/components/ui/icon';
<Icon name="Search" size={14} className="text-muted" />
```

`Icon` renders an inline SVG (viewBox 0 0 24 24, stroke `currentColor`, stroke-width 2, round caps/joins), sized `size × size` (default 16). Color comes from a `text-*` class. `IconName` is the union of all 30 prototype icon names: `FileText, Sparkles, UserCheck, UploadCloud, History, SlidersHorizontal, Building2, Mail, Flag, AlertTriangle, CheckCircle2, Check, XCircle, X, Plus, Trash2, Loader2, ChevronDown, ChevronUp, ShieldCheck, User, Users, Send, Search, RefreshCw, ChevronLeft, ChevronRight, MessageSquare, PanelLeft`.

## Band mapping

`hot → green`, `warm → mustard`, `cold → dark-teal`. Labels via `BAND_LABEL` in `@/constants/bands`. Score via `SCORE_BY_BAND`.

## The prototype's CSS

The full `<style>` block is lines 13–2200 of `Design/POC_Kaffea-X_Prototype.html`. Read the exact rules for your component there and translate them 1:1 to Tailwind utilities using the tokens above. Preserve hover/focus/disabled states and responsive `@media` rules (map to `max-bp900:`, `max-bp560:`, etc. using the custom breakpoints `bp400/bp560/bp640/bp720/bp900/bp1100`).
