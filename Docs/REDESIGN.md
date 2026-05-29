# Redesign 2 — Darkroom

**Design read:** Film darkroom workspace for creators who want tactile, analog-adjacent grading — warm stone panels, void-black canvas, selenium-gold accents. Dense UI, no neon, no decorative glow.

## Dials
| Variance | Motion | Density |
|----------|--------|---------|
| 7 | 4 | 7 |

## Direction
Darkroom feels like working under a safelight: panels are warm stone (`#1a1917` family), the canvas is true black (`#050505`) in dark mode, and every accent is selenium gold (`#C9A962`). Mono uppercase labels, 6px radius (`rounded-md`), edge-to-edge panels — not floating cards. Safelight (light mode) uses warm ivory surfaces with the same amber accent language.

## Tokens
| Role | Value |
|------|-------|
| Accent | `#C9A962` |
| Canvas (dark) | `#050505` |
| Canvas token / stone | `#1a1917` |
| Panel (dark) | `zinc-950` warm stone scale |
| Radius | 6px (`rounded-md`) |

## What changed
- **tailwind.config.js** — warm stone zinc scale, amber accent, canvas `#1a1917`
- **index.css** — `.frescava-editor` scoped buttons/tabs, amber sliders & presets, void-black dark canvas
- **Editor shell** — `bg-zinc-950` (dark) / `bg-surface-50` (light)
- **Panels** — dense edge-to-edge layout, mono tab labels
- **Settings** — theme names **Darkroom** / **Safelight**
- **Auth** — flat `#050505` card, amber CTA, no blobs or serif
- **TitleBar (editor only)** — warm header, amber Editor label, mono nav buttons

## What did NOT change
- `Home.tsx` and home TitleBar tab underline styling (untouched)
- All editor features preserved

## Preview
```bash
git checkout redesign2
npm run dev
```
