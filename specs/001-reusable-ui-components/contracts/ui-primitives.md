# Contract: Atomic UI Primitives (`src/components/ui/`)

These are the reusable, prop-configurable design-system primitives (Principle VI). Every primitive is styled exclusively with token-driven Tailwind utilities (Principle II) and is self-contained (usable by any feature without modification). Prop shapes below are the contract; exact internals belong to implementation.

**Conventions**: all primitives accept `className?: string` (merged last) and forward relevant native attributes; interactive primitives forward `ref` where useful. No component contains hardcoded colours or inline styles.

## Icon (`ui/icon/`)

- `IconName` — union of the 30 prototype icons (`FileText, Sparkles, UserCheck, UploadCloud, History, SlidersHorizontal, Building2, Mail, Flag, AlertTriangle, CheckCircle2, Check, XCircle, X, Plus, Trash2, Loader2, ChevronDown, ChevronUp, ShieldCheck, User, Users, Send, Search, RefreshCw, ChevronLeft, ChevronRight, MessageSquare, PanelLeft`).
- `<Icon name: IconName; size?: number = 24; className?: string />` — renders an inline SVG (24×24 viewBox, stroke-width 2, `currentColor`). Colour is set by the consumer's text-colour utility.

## Button (`ui/button/`)

- `<Button variant: 'primary'|'approve'|'reject'|'send'|'ghost'|'link'|'mini'; size?: 'md'|'sm'; wide?: boolean; disabled?: boolean; iconStart?: IconName; iconEnd?: IconName; onClick?; type?; children />`
- Variants map to the prototype's `kx-btn-*`. `disabled` reproduces the exact opacity per variant (primary 0.55, approve 0.5). `mini` supports `tone: 'ghost'|'primary'`.

## Badge / BandPill (`ui/badge/`)

- `<Badge band: Band; children? />` → uppercase pill (hot green / warm mustard / cold dark-teal). Default label from band when no children.
- `<BandDot band: Band; number?: number />` → numbered circle used in sidebar/score.

## Chip & Tags (`ui/chip/`)

- `<Chip selected?: boolean; onClick?; children />` — suggested-prompt / generic chip.
- `<SignalChip band: Band; children />`, `<MetricChip band: Band; withDot?: boolean; children />`.
- `<Tag tone: 'kaffea'|'prospect'|'saved'|'draft'|'due'|'owner'|'confirm'; children />` — covers side tags, status chips, due/owner pills.

## Input family (`ui/input/`)

- `<Input value; onChange; warn?: boolean; placeholder?; type?; icon?: IconName />` — `warn` shows rust border (required-field state).
- `<InlineInput value; onChange; warn?; onCommit?; />` — dashed-underline inline editable (contact/email/signal-label).
- `<SearchInput value; onChange; placeholder? />` — dark sidebar search with inline search icon.

## Textarea (`ui/textarea/`)

- `<Textarea value; onChange; mono?: boolean; placeholder?; rows? />` — `mono` uses the monospace token stack (transcript). Focus turns background white (transcript variant).

## Card & section primitives (`ui/card/`)

- `<Card navy?: boolean; className?; children />` — base surface (radius + soft shadow tokens).
- `<SectionTitle icon?: IconName; children />`, `<Eyebrow inline?: boolean; children />`, `<Heading level: 1|2; display?: boolean; sm?: boolean; children />`, `<Divider/>`, `<AccentBar variant?: 'h1'|'h2' />`.

## Avatar (`ui/avatar/`)

- `<Avatar variant: 'initials'|'image'; initials?: string; src?: string; tone?: 'green'|'midnight'|'green-deep'; size? />` — header avatar (initials "MR"), chat AI avatar (image), attendee avatars (kaffea/prospect tones).

## SegmentedControl (`ui/segmented-control/`)

- `<WeightSegmentedControl value: Weight; onChange: (w: Weight) => void />` — HOT/WARM/COLD radiogroup; active segment coloured per band. Reproduces `kx-weight-seg`.

## Breadcrumb (`ui/breadcrumb/`)

- `<Breadcrumb items: { key: string; label: string; active: boolean; disabled: boolean; onClick?: () => void }[] />` — separator `›`; disabled crumbs non-interactive. (The workflow `Stepper` in `common/` composes this with gating logic.)

## Tooltip (`ui/tooltip/`)

- `<Tooltip content: ReactNode; children />` — hover popover (midnight bg, Playfair italic, arrow). Used for signal evidence.

## Modal (`ui/modal/`)

- `<Modal open: boolean; onClose: () => void; children; labelledBy? />` — full-screen backdrop + centered panel; backdrop click closes, panel `stopPropagation`; Escape closes. Used by Rubric and (as a variant) Processing overlay.

## Toast (`ui/toast/`)

- `<Toast message: string; tone: ToastTone />` — top-center banner; entrance animation token; caller controls the 3200ms auto-dismiss via the provider.

## Spinner & Shimmer (`ui/spinner/`, `ui/shimmer/`)

- `<Spinner size? />` — `Loader2` with `animate-spin` token.
- `<Shimmer className? />` — animated gradient bar (processing modal).

## ConfidenceDot / Conf (`ui/confidence-dot/`)

- `<Conf level: Confidence />` — high/medium/low label; low shows `AlertTriangle`. `<ConfDot level: Confidence />` — coloured dot only.

## Contract acceptance

- Each primitive renders with **no hardcoded hex/rgb/hsl** and **no inline `style`** (grep-verifiable).
- Each primitive is imported and reused by at least the feature components that need it, with no duplicated one-off copies (SC-005).
- Visual output of each primitive matches the corresponding `kx-*` element in the prototype at every documented state/variant (SC-001).
