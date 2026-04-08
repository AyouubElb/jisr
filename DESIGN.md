# Design System

## Colors (CSS Variables via shadcn/ui)

| Token | Value | Usage |
|---|---|---|
| `--primary` | Blue `#2563EB` (blue-600) | Buttons, links, active states |
| `--primary-foreground` | White `#FFFFFF` | Text on primary backgrounds |
| `--secondary` | Amber `#F59E0B` | CTAs, highlights, accents |
| `--background` | Slate-50 `#F8FAFC` | Page background |
| `--card` | White `#FFFFFF` | Card/panel backgrounds |
| `--muted` | Slate-100 `#F1F5F9` | Disabled, subtle backgrounds |
| `--muted-foreground` | Slate-500 `#64748B` | Secondary text, placeholders |
| `--border` | Slate-200 `#E2E8F0` | Borders, dividers |
| `--destructive` | Red-500 `#EF4444` | Delete, errors |
| `--success` | Green-500 `#22C55E` | Success states |
| `--warning` | Amber-500 `#F59E0B` | Warnings |

## CEFR Level Badge Colors

| Level | Background | Text |
|---|---|---|
| A1 | `bg-emerald-100` | `text-emerald-700` |
| A2 | `bg-teal-100` | `text-teal-700` |
| B1 | `bg-blue-100` | `text-blue-700` |
| B2 | `bg-indigo-100` | `text-indigo-700` |
| C1 | `bg-purple-100` | `text-purple-700` |
| C2 | `bg-rose-100` | `text-rose-700` |

## Typography

- **Font:** Inter (shadcn/ui default)
- **Body:** `text-base` (16px), weight 400
- **Labels:** `text-sm` (14px), weight 500
- **Headings:** `text-lg`/`text-xl`/`text-2xl`, weight 600
- **Caption/meta:** `text-xs` (12px), `text-muted-foreground`

## Spacing & Layout

- 8px grid: use Tailwind `gap-2` (8px), `gap-4` (16px), `gap-6` (24px)
- Card padding: `p-6`
- Button padding: `px-4 py-2`
- Page padding: `p-6` or `p-8`
- Section gaps: `space-y-6`

## Component Styles

- **Border radius:** `rounded-lg` on cards/modals, `rounded-md` on inputs/buttons
- **Shadows:** `shadow-sm` on cards only
- **Borders:** `border border-border` on cards and inputs
- **Focus ring:** `ring-2 ring-primary/20` (via shadcn/ui defaults)

## Rules

- Never hardcode color values — use semantic tokens (`bg-primary`, `text-muted-foreground`)
- All common elements (Button, Input, Card, Badge, etc.) must come from `components/ui/`
- Pages compose from UI components — no inline styling of buttons, inputs, or cards
- Use `cn()` utility (clsx + tailwind-merge) for conditional classes
