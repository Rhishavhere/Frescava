# Frescava — Product Vision & Feature Specification

> A modern desktop photo studio for creators. Aesthetic-first editing, pro-level controls, and light AI assistance — without the complexity of traditional tools.

---

## The Big Idea

Most photo editors are built by engineers for photographers. Frescava is built by a creator for creators.

The reference points: what Canva did for design, VSCO did for mobile photo aesthetics, and Figma did for collaborative creative work — Frescava does for desktop photo editing. It targets Gen Z creators, Instagrammers, content creators, and anyone who wants their photos to look intentional and beautiful without spending hours in Lightroom.

The core philosophy: **aesthetic first, controls second, complexity optional.** One-click presets that produce genuinely cinematic results. Pro tools always accessible but never in the way. AI that assists without taking over.

The Prequel reference: a single tap going from a flat photo to a fully graded, grained, glowing cinematic image — with halation, lifted blacks, film grain, vignette, all perfectly balanced. Complex results at ease. That is the standard Frescava presets must meet.

---

## Target Audience

- Gen Z creators and content makers
- Instagram / TikTok / Pinterest power users
- Photographers who want a faster, more aesthetic workflow
- Anyone who uses VSCO or Prequel on mobile and wants a desktop equivalent
- Small creators, bloggers, visual storytellers

---

## The Five Zones

Frescava is organized into five distinct product zones:

- **Zone 1 — The Editor:** Single image editing. Presets, adjustments, effects, text, export. Core of the product.
- **Zone 2 — Text & Graphics:** Layered text system with real effects. Caption templates, style presets, graphic overlays.
- **Zone 3 — AI Assistance:** Smart features that assist — background removal, upscaling, captions, style matching.
- **Zone 4 — Templates:** Pre-designed poster/layout composer. Pick a template, drop in your photo, edit text live. Done.
- **Zone 5 — The Canvas (v2):** Infinite creative workspace. Multiple images, nodes, inspo, AI generation, moodboarding.

---

## Zone 1 — The Editor

### Import & File Handling

- Drag and drop JPEG / PNG onto the app window
- Recent files panel with thumbnail previews
- Batch import — select multiple photos, apply a preset to all in one click
- Before / After toggle (hold spacebar or dedicated button)
- Split view — left half original, right half edited
- Non-destructive editing — all edits stored as parameters, original never modified
- Edit history as a visual timeline scrubber — drag the handle back to any point
- Duplicate & diverge — copy current edit state, try a different direction, compare both
- No RAW support — JPEG and PNG only (intentional scope decision)

---

### The Preset System (Hero Feature)

The preset is the first thing a user interacts with. It must feel premium, fast, and beautiful.

**How presets work technically:**
Each preset is a complete bundle:
- A `.cube` LUT file — captures the full color transformation (designed in Photoshop/Lightroom, exported as .cube)
- A grain texture PNG — film grain type and character
- A JSON parameter file — vignette, halation, lifted blacks, border, temperature offset, everything

This means every preset is a complete cinematic look — not just a color filter, but a full aesthetic treatment including grain, glow, contrast character, and optional border. The LUT is designed manually in Photoshop or Lightroom by the developer, then exported as .cube. No ML needed for presets.

**Live preview on your photo:**
Before clicking a preset, its thumbnail shows a miniature version of your actual photo with that preset applied. Users see exactly what they're getting before committing. This is non-negotiable UX.

**Preset intensity slider:**
Every preset has a master intensity slider. "Kodak Portra" at 40% vs 100% are genuinely different looks. Users blend presets with their original.

**Preset categories:**

| Category | Examples |
|---|---|
| Film Stock | Kodak Portra, Kodak Gold, Fuji Velvia, Ilford HP5, Cinestill 800T |
| Mood | Moody, Clean, Hazy, Dark, Airy, Muted |
| Era | 70s Warm, 90s Faded, Y2K Digital, VHS, 2010s Vintage |
| Cinematic | Teal & Orange, Film Noir, Blade Runner, Summer Blockbuster |
| Editorial | Clean White, Desaturated, High Contrast, Magazine |
| Aesthetic | Dark Academia, Cottagecore, Coastal, Brat, Minimal |

**Additional preset features:**
- Favorites — star any preset to pin it at the top
- Custom preset saving — edit a photo, save the entire look as a named preset
- Import `.cube` files — power users bring their own LUT packs
- Seasonal drops — new curated packs released monthly tied to trending aesthetics
- "Steal this look" — right-click any preset to see exactly what settings it applies, listed plainly
- Comparison grid — apply 6 different presets to the same photo simultaneously in a grid view (unique feature, nobody does this on desktop)

---

### Core Adjustment Panel

Always visible, organized clearly. Every control has a number display and is keyboard-accessible.

```
LIGHT                   COLOR                   DETAIL
─────                   ─────                   ──────
Exposure                Temperature             Sharpness
Contrast                Tint                    Noise Reduction
Highlights              Vibrance                Clarity
Shadows                 Saturation              Texture
Whites
Blacks
```

Keyboard-first: press E to focus Exposure, arrow keys to increment, shift+arrow for large steps. Every slider controllable without mouse.

---

### Pro Controls (Collapsed by Default, One Tap to Expand)

**Curves:** RGB master + individual R/G/B channel curves. Click to add anchor points. Visual histogram overlay.

**HSL (Hue / Saturation / Luminance):** Per-color-range sliders across Red, Orange, Yellow, Green, Aqua, Blue, Purple, Magenta. Click a color in the photo to auto-select that range.

**Color Grading:** Three color wheels — Shadows, Midtones, Highlights — with blending and balance controls. Same system as Lightroom / DaVinci Resolve.

**Tone Mapping:** Point curve editor with white point / black point control.

**Split Toning:** Shadow color + hue + saturation, highlight color + hue + saturation, balance slider.

---

### Effects Layer

Applied on top of the base edit. Non-destructive. Each effect has its own opacity/intensity. Built as a WebGL shader pipeline — each effect is a GLSL shader pass.

| Effect | Controls | Implementation |
|---|---|---|
| Film Grain | Type (fine/medium/coarse/film), intensity, size, luminosity mode | Procedural GLSL noise shader |
| Vignette | Shape (oval/rect), strength, feather, midpoint | Radial distance shader |
| Halation / Glow | Color, radius, threshold, intensity | 3-pass: extract highlights → blur → screen composite |
| Chromatic Aberration | Amount, radial falloff | RGB channel offset shader |
| Bloom | Threshold, intensity, soft vs hard | 3-pass same as halation, wider spread |
| Lens Distortion | Barrel/pincushion amount | Brown-Conrady distortion model shader |
| Light Leaks | Texture selection, color, position, intensity | PNG overlay with screen blend mode |
| Dust & Scratches | Texture selection, density, opacity | PNG overlay with screen/lighten blend |
| Borders & Frames | Polaroid, film strip, thin border, rounded corners | PNG overlay + programmatic shader |

**Shader pipeline order (matters — order affects output):**
LUT → Adjustments → Curves → HSL → Color Grading → Halation → Bloom → Chromatic Aberration → Lens Distortion → Vignette → Grain → Overlays → Border → Output

---

### Local Adjustments (v1.5)

Apply any adjustment to a specific region only. Pattern: generate a grayscale mask → run adjustments on full image → composite using mask.

- **Radial filter** — draw oval/circle, apply adjustments inside or outside, multiple per image
- **Gradient filter** — linear gradient mask, classic sky/foreground separation, drag start/end points
- **AI Brush Masking** — paint rough strokes, MobileSAM refines mask to precise subject edges (debounced 200ms)
- **Subject Mask (auto)** — one-click subject isolation via MobileSAM center-point prompt
- **Sky Mask (auto)** — one-click sky selection via MediaPipe segmentation class

All ML runs locally — no upload, no internet required. SAM image embeddings are cached per image so multiple mask operations on the same photo are fast.

---

## Zone 2 — Text & Graphics

This is where Frescava significantly beats every photo editor for creators. Text effects matching what you see in Adobe Premiere or DaVinci Resolve — accessible without learning a complex app.

### Text System

**Font library:** Google Fonts built in (~1000 fonts, searchable). User font import (.ttf / .otf). Font pairing suggestions.

**Text style presets — each is a complete layered look (defined as JSON, rendered via Konva.js):**

| Style | Description |
|---|---|
| Film Credits | Thin white, wide tracking, soft shadow, serif |
| Y2K Chrome | Metallic gradient fill, thick stroke |
| Handwritten Caption | Script font, slight rotation, drop shadow |
| Editorial Bold | Massive compressed sans-serif |
| Neon Glow | Colored outer glow, semi-transparent pill background |
| Burned In | Looks physically stamped onto the photo surface |
| Subtitle Bar | Semi-transparent pill, small caps sans-serif |
| Grunge Stamp | Distressed texture fill, irregular edges |
| Minimal Line | Ultra-thin serif, single underline, wide tracking |
| Gradient Pop | Bright gradient fill, no stroke, large display |

**Every text property tweakable:**
Fill (solid/gradient/texture/transparent), Stroke (color/width/position), Drop Shadow (angle/distance/blur/spread/color), Inner Shadow, Outer Glow (color/size/blend mode), Inner Glow, Background (pill/rectangle/custom padding/corner radius), Blur, Chromatic Aberration offset, Blend Mode, Opacity, Letter Spacing, Line Height, Rotation, Curve text along a path.

**Text is NOT designed in Photoshop and imported** — it is defined as a JSON parameter system and rendered live in the app via Konva.js. New text style presets are just new JSON configs, no code changes needed.

---

### Graphics & Overlays

- Built-in minimal element library: arrows, lines, shapes, dots, dividers
- Import SVG files
- Film metadata stamps: "ISO 400 · 35mm · f/1.8" style overlays (major aesthetic trend)
- Date stamps (film style and digital style)
- Noise/grain as a graphic element
- Editorial marks and film leader elements

---

## Zone 3 — AI Features

Positioned as a creative assistant, not the main feature. Gen Z creators want to feel in control — AI assists without taking over.

### Local AI (Runs On-Device — No Upload, Works Offline)

All local models run via ONNX Runtime. GPU-accelerated automatically: CoreML on Apple Silicon, CUDA on Nvidia, DirectML on Windows, CPU fallback always available.

**Background Removal:** RMBG-1.4 model. One click → PNG with transparent background. ~170MB, lazy loaded on first use.

**AI Upscale:** Real-ESRGAN x4plus. Small/low-quality JPEG → 4x resolution with recovered detail. Tiled processing for large inputs. ~65MB, lazy loaded.

**Face Enhancement:** GFPGAN v1.4. Restores facial detail, removes compression artifacts. Offered automatically when a face is detected. ~350MB, lazy loaded.

**Subject & Sky Masking:** MediaPipe (~8MB, eager loaded) for automatic person/sky detection. MobileSAM (~40MB, lazy) for user-directed click-to-select.

**Style Match:** Upload a reference photo → app applies matching color grade via Reinhard color transfer algorithm. No ML — pure statistics. Result saveable as a new preset.

**Smart Auto-Enhance:** v1 rule-based (histogram analysis → tasteful corrections). v2 ML regression model trained on user editing patterns post-launch.

### API-Based AI (Requires Internet — Proxied via Supabase Edge Functions)

API keys never ship in the app. All calls go through Supabase Edge Functions which handle auth verification and rate limiting.

**Caption Generator:** Claude API with vision. Analyzes actual photo content. Choose tone (witty/poetic/minimal/descriptive/chaotic), get 5 options. Best-in-class for this use case.

**Hashtag Suggestions:** Based on preset used, edit style, image content. Returns 15-20 hashtags grouped by reach (niche/medium/broad).

**AI Image Generation:** Text prompt → Replicate API (SDXL). Drag result into canvas. Curated prompt gallery with pre-engineered prompts users remix without needing to know prompt engineering.

**Usage limits:** Free tier: 3 uses/day per feature. Pro: unlimited. Tracked in Supabase ai_usage table.

---

## Zone 4 — Templates

A dedicated tab alongside the Editor. Pre-designed poster and layout composer. Template handles all design decisions — user brings the photo and text content.

### The Concept

Not photo editing and not freeform canvas — this is **template-first** layout composition. Fast, structured, beautiful output in seconds. Think: the "Eyes" editorial layout — three horizontal strips of the same photo at different crop positions, mixed serif/sans title, multilingual subtitle, justified body text. One click on the template, drop in your photo, edit the text live. Done.

### How Templates Work

Each template is a **JSON definition file** describing every element — its type, position (as % of canvas), size, typography, and which parts are user-editable.

```
Template JSON defines:
  background color
  image slots (position, size, which vertical crop of photo to show)
  text blocks (font, size, color, alignment, default text, editable: true/false)
  graphic elements (lines, shapes, decorations)
```

The rendering engine (Konva.js) is built once and reads any template JSON. New templates are just new JSON files — no code changes ever needed for new templates.

### How Templates Are Created

**Designer workflow (you):**
1. Design the layout in Figma at 1080x1920 (9:16) or 1080x1080 (1:1)
2. Use real Google Fonts (available in the app)
3. Name layers clearly: `strip-top`, `title-text`, `body-text` etc.
4. Export as PNG reference

**Developer workflow (Claude Code):**
1. Read the PNG + Figma file
2. Generate the complete JSON template definition
3. Template is live in the app

Time per template after engine is built: ~15 minutes. Design time is the only ongoing cost.

### Template Interaction

- Image slots: user drops their photo, it fills all image slots
- Crop repositioning: click any image strip, drag up/down to reposition which part of the photo shows through (like Instagram crop)
- Text editing: click any text element → inline editor appears over it, typed changes update live
- Color overrides: change background color, text color per template
- Optional filter: apply a preset to the image strips
- Export: full resolution PNG

### Template Categories (20 at launch)

| Category | Vibe | Count |
|---|---|---|
| Portrait / Editorial | Strips, split panels, overlapping crops | 5 |
| Minimal Text-First | Large typography, small image inset, negative space | 4 |
| Film / Analog | Contact sheet, film strip border, polaroid stack | 4 |
| Bold / Magazine | Full bleed, overlaid text, geometric blocks | 3 |
| Quote Card | Minimal background, styled quote, small attribution | 2 |
| Aesthetic / Mood | Soft vignette, centered portrait, poetic caption | 2 |

### Template Data Structure

```typescript
interface PosterTemplate {
  id: string
  name: string
  category: string
  aspectRatio: '9:16' | '4:5' | '1:1' | 'A4'
  backgroundColor: string
  elements: (ImageElement | TextElement | ShapeElement)[]
}

interface ImageElement {
  type: 'image'
  id: string
  x: number; y: number        // % of canvas
  width: number; height: number
  cropY: number               // vertical slice start (0-1)
  cropHeight: number          // vertical slice height (0-1)
  editable: true
}

interface TextElement {
  type: 'text'
  id: string
  x: number; y: number
  width: number
  defaultText: string
  fontFamily: string
  fontSize: number            // relative units
  fontWeight: number
  letterSpacing: number
  textAlign: 'left' | 'center' | 'right' | 'justify'
  color: string
  editable: true
  placeholder: string
  multiFont?: {               // for mixed serif/sans like "Eyes"
    firstChar: FontConfig
    rest: FontConfig
  }
}
```

---

## Zone 5 — The Canvas (v2)

Everything Frescava gives you, at once. Multiple images, multiple edit versions, AI generation, caption writing, inspo pinning — a full creator workspace.

### Core Concept

An infinite scroll canvas (like Figma / Miro) where creators can pin photos in different edit states, compare versions side by side, build moodboards, write captions, generate AI images, and connect edit effects as nodes.

### Node System

Every element on the canvas is a node. Effects connect as nodes via drag-and-drop — like DaVinci Resolve's node compositor or Blender's shader nodes, but visual and approachable for creators. Built with React Flow.

```
SOURCE NODES          EFFECT NODES              OUTPUT NODES
────────────          ────────────              ────────────
Image Node            LUT / Preset Node         Export Node
AI Gen Node           Brightness Node           Canvas Pin Node
Text Node             Curves Node               Compare Node
Inspo Node            Vignette Node
                      Grain Node
                      Color Grade Node
                      Mask Node
```

Drag Effect Node from sidebar → connect to Image Node → effect applies live. Parameters appear inline on the node. Disconnect to remove.

### Canvas Features

- Infinite scroll with zoom in/out
- Pin images, text notes, edit versions, AI generations, inspo screenshots
- Pinterest URL import
- Caption nodes — write, store, test multiple caption options per image
- Export board as single image or PDF moodboard
- Share canvas as link (v3)

---

## Post Preview

See exactly how your photo will look posted before you export.

**Instagram Feed Preview:** Pixel-perfect UI chrome, your actual profile photo + username, live caption editing with "more" cutoff rendered correctly, hashtags in blue, 3-post grid view to check aesthetic flow with existing posts.

**Instagram Story Preview:** 9:16 canvas with Stories chrome, progress bar, username, text overlay positioning check.

**Multi-platform tabs:** Instagram Feed, Instagram Story, Twitter/X, LinkedIn, Pinterest — each with correct crop dimensions and UI chrome.

**Grid Continuity (killer feature):** Connect Instagram via read-only API. See your last 9 posts as a live grid. New photo slots into position 1. Creators obsess over grid continuity and no desktop tool solves this.

---

## Unique Differentiating Features

**Comparison Grid:** Apply 6 different presets simultaneously as a grid. Pick the one that feels right. Nobody does this on desktop.

**Recipe Card:** After editing, a shareable summary card — "Preset: Kodak Summer · Grain: 30% · Temp: +200." Free marketing for Frescava.

**Film Simulation Mode:** Choose "shoot this on Kodak Portra 400" instead of using sliders. Full film character applied including grain profile, highlight rolloff, shadow lift.

**Speed Edit Mode:** Minimal UI — just the image, preset strip, intensity slider. Toggle from normal mode.

**Export Card:** Beautiful before/after summary renders at export. Optional to save and share.

**Edit History Timeline:** Visual timeline scrubber, not just undo/redo. Drag to any point.

**Keyboard-First Editing:** Every adjustment has a shortcut key. Serious creators will live here.

**Seasonal Preset Drops:** Monthly new pack tied to aesthetic trends. Push notification. Creates a reason to return.

---

## Monetization

### Model: Try Everything, Pay to Export (Prequel model)

All editing, all presets, all text tools, all templates, all AI (within daily limits) — free to use and experience. Pay only when you want to export. User invests time → emotional attachment to result → paying feels worth it because they've already seen exactly what they're getting.

| Tier | Price | Includes |
|---|---|---|
| Free | Full editing access, watermarked export, 720p preview cap, 3 AI uses/day |
| Pro | Clean full-res export, batch export, unlimited AI, all packs, Canvas |
| Preset Packs | Thematic curated collections, downloaded post-purchase |
| Creator Bundle | Annual deal | Pro + all packs |


---

## App Security

### Export Gate (Primary Monetization Protection)
- Export requires server-verified license via Supabase Edge Function
- 24-hour validation cache in app — first call hits network, subsequent exports within 24h use cache (prevents cold-start latency feeling broken)
- No internet and cache expired = no export

### Screenshot Deterrence
- `setContentProtection(true)` in Electron — blacks out window in macOS screen recordings
- 720p max preview on free tier (screenshots are low quality, not usable for posting)
- Visible subtle watermark on free tier previews
- Invisible steganographic watermark embedded in preview (encodes user ID — if screenshot and posted, traceable back to account)

### Asset Protection
- Premium LUT packs NOT bundled in app — downloaded post-purchase only
- Stored encrypted on device (AES-256-CBC)
- Decryption key derived from machine fingerprint + valid license key via HMAC
- Decrypted LUT exists in memory only, never written to disk unencrypted
- Free LUTs ship openly in the bundle — accepted, they're the top-of-funnel

### Code Protection
- JavaScript obfuscation pre-build (control flow flattening, string encryption, dead code injection)
- ASAR integrity check on startup — detects extraction and repacking
- Machine fingerprinting for license binding (CPU ID + MAC address + disk serial hashed)
- Critical validation and decryption logic in compiled Rust native module (napi-rs)
- Webhook signature verification on all Lemon Squeezy webhooks (HMAC-SHA256)

### Distribution (Early Stage — No Code Signing Yet)
- Ship unsigned .dmg and .exe for v0.1-v0.x
- Include bypass instructions in README and onboarding screen
- macOS: right-click > Open, or `xattr -cr /Applications/Frescava.app`
- Windows: More info > Run anyway in SmartScreen dialog
- Apple Developer cert ($99/yr) acquired at ~100-200 paying users
- Windows signing acquired when Windows user base justifies it

---

## Backend Infrastructure

### What Supabase Handles (Everything)
User photos never leave the device. Only auth, license state, and pack entitlements live in the backend.

- **Auth:** Email + password, Google OAuth, Apple Sign In (Supabase Auth)
- **Database:** subscriptions, machine_activations, pack_entitlements, ai_usage, announcements
- **Edge Functions:** validate-license, activate-machine, download-pack, ai-proxy, webhook-payment
- **Storage:** Encrypted .clut premium pack files, served via signed 60-second URLs post-entitlement check

### Payment Flow
Lemon Squeezy handles payments → fires signed webhook → Supabase Edge Function verifies HMAC signature → writes to subscriptions table. Never trust unsigned webhooks.

### Distribution
GitHub Releases + electron-builder. Auto-updates via electron-updater checking GitHub Releases on launch. No file hosting infrastructure needed.

### Crash Reporting
Sentry — one-line Electron setup, free tier sufficient for early stage.

---

## Build Order

```
v0.1 — Proof of Concept
  Electron + Vite + React scaffold
  WebGL shader pipeline working
  One LUT loading and applying in real time
  Basic exposure/contrast sliders
  JPEG export (no paywall yet)

v0.2 — Real Editor
  Full adjustment panel (light/color/detail)
  20 presets with live thumbnails on your photo
  Before/after toggle
  Effects layer (grain, vignette, halation, borders)
  Basic text layer

v0.3 — Solid
  50 presets across 5 aesthetic packs
  Full text system with 15 style presets
  All effects (CA, bloom, lens distortion, light leaks, dust)
  Templates tab with 20 templates
  AI: background removal + captions + upscale
  Post preview (Instagram feed + story)
  

v0.4
  Pro controls (curves, HSL, color grading wheels)
  Local adjustments (radial, gradient, brush, subject mask, sky mask)
  Style match
  Face enhancement
  Grid continuity (Instagram API)
  Comparison grid feature

v0.5
  Canvas workspace + React Flow node system
  Pinterest integration + moodboard export
  Figma plugin for template generation

v0.6 - Launch
  Supabase auth + Lemon Squeezy payments
  Export gate + watermark + 720p cap
  App protection layer
  GitHub Releases distribution

---

## Competitive Positioning

| App | Platform | Presets | Pro Controls | Text Effects | Templates | Canvas | AI |
|---|---|---|---|---|---|---|---|
| Lightroom | Desktop | Limited | Excellent | None | None | None | Basic |
| VSCO | Mobile | Excellent | Good | None | None | None | None |
| Prequel | Mobile | Excellent | Limited | None | None | None | None |
| Photoshop | Desktop | None | Excellent | Excellent | None | None | Good |
| Canva | Web | None | None | Good | Excellent | Basic | Basic |
| **Frescava** | **Desktop** | **Excellent** | **Excellent** | **Excellent** | **Good** | **Excellent** | **Good** |

The gap Frescava fills: desktop software with aesthetic-first presets, real pro controls, creator-focused text tools, poster templates, and a canvas workspace. This combination does not exist.
