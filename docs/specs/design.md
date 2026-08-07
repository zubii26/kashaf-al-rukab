# Design.md

Applies to every screen in both the Driver Portal and Admin Panel.
No exceptions — do not introduce new colors, icon styles, button
variants, or layout patterns beyond what is defined here.

## Principles
- No animation or motion effects anywhere: no transitions, no fades,
  no hover scale/lift effects, no animated loading spinners. State
  changes (hover, active, loading) are instant and static.
- One icon set only, one button system only, one color palette only.
- Professional, corporate tone — clean, flat, high-contrast, no
  gradients or shadows beyond a subtle 1px border for separation.
- Minimal DOM structure — see "Layout & Containers" below. Do not
  wrap elements in extra `<div>`s, cards, or panels unless the wrapper
  serves a real visual or functional purpose.

## Color Palette

| Role | Hex | Usage |
|---|---|---|
| Primary (Navy) | `#14213D` | Header bar, nav, sidebar, primary headings |
| Accent (Blue) | `#2B6CB0` | Links, active nav item, primary buttons |
| Success (Green) | `#1E824C` | Confirmations, checklist "pass" items, active status |
| Warning (Amber) | `#B7791F` | Pending items, expiring documents, alerts |
| Danger (Red) | `#C53030` | Delete actions, checklist "fail" items, suspended status |
| Background | `#F7F9FC` | Page background |
| Surface | `#FFFFFF` | Cards, tables, panels, modals |
| Border | `#E2E6EC` | Dividers, table borders, input outlines |
| Text primary | `#1F2430` | Body text, headings |
| Text secondary | `#6B7280` | Labels, timestamps, helper text |

Define these as Tailwind theme colors (e.g. `primary`, `accent`,
`success`, `warning`, `danger`, `surface`, `border`) in
`tailwind.config.ts` rather than using raw hex values in components.

## Icons
- Library: `lucide-react` only. Do not mix in any other icon set,
  emoji-as-icon, or custom SVGs unless no Lucide equivalent exists.
- Stroke width: 1.5–2px, consistent across the app.
- Size: 18px in navigation/toolbars, 16px inline with body text.
  Do not vary size for the same icon role across screens.
- Color: icons always inherit the surrounding text color
  (`currentColor`) — never a separate icon-specific color.

## Buttons

Exactly three variants. No other button styles are permitted.

1. **Primary** — solid `accent` (`#2B6CB0`) background, white text.
   Use for the single main action on a screen (Save, Create Trip,
   Generate Document, Convert Quote).
2. **Secondary** — white background, `accent` border and text.
   Use for supporting actions (Edit, Duplicate, Cancel).
3. **Destructive** — solid `danger` (`#C53030`) background, white text.
   Use only for delete/remove actions.

Shared rules across all three variants:
- Same border-radius (6px) on every button in the app.
- Same height and horizontal padding regardless of context.
- Same font-weight (600 / semibold) for all button labels.
- Hover state: instant flat background-color shift only — no
  transition duration, no scale, no shadow-lift, no animation.
- Loading state: replace label with static text (e.g. "Saving…"),
  no spinner animation.
- Disabled state: reduced opacity (e.g. 50%), no other visual change.

## Typography
- One font family across the app (system UI stack or a single
  imported sans-serif — do not mix multiple typefaces).
- Consistent heading scale: page title, section heading, label —
  three sizes only, reused everywhere.

## Layout & Containers

Keep the DOM as flat as possible. Over-nesting containers is a common
failure mode to avoid explicitly:

- **Do not wrap every field, row, or block in its own `<div>`.** Use
  Tailwind utility classes directly on the element itself (spacing,
  flex/grid, borders) instead of adding a wrapper just to apply a
  class.
- **One card per logical unit, not one card per element.** A form
  section, a trip record, or a KPI stat is one card. Do not put a
  card inside a card, or a bordered box inside another bordered box.
- **Use CSS Grid/Flexbox on the parent instead of nested wrapper
  divs** for spacing between children — a `gap` utility on the parent
  replaces the common pattern of wrapping each child in a spacer div.
- **No decorative-only containers.** Every `<div>` in the markup
  should either hold real content or serve a genuine layout purpose
  (a grid/flex container, a card boundary, a scroll region). If it
  does neither, remove it.
- **Page structure should be shallow**: page wrapper → section →
  content. Avoid deeper nesting than that for typical screens (a
  complex form or table may reasonably need one extra level — no
  more).
- **Tables use native `<table>` markup**, not divs styled to look
  like a table.
- Cards and tables use the `surface` color with a single `border`
  outline — no drop shadows, no nested borders.
- Consistent spacing scale (Tailwind default spacing scale is
  sufficient) — do not introduce arbitrary pixel values.

Before finishing any screen, review the component's JSX and remove
any wrapper element that isn't doing layout or styling work.
