# Advanced tools: architecture and implementation

This document describes **advanced color and tonal tools** in Frescava: how they are modeled in state, how the UI edits them, and how the **GPU adjustment pass** applies them. It is the living reference for present behavior and intended direction for future work.

For overall app architecture, see `Docs/ARCHITECTURE.md`. For product direction, see `Docs/PRODUCT.md`.

---

## Where advanced tools live

| Layer | Role |
|--------|------|
| **`src/shared/types.ts`** | `EditState` fields: `curves`, `splitToning`, `colorBalance`, `hslMixer`, `dehaze`, plus basic adjustments. |
| **`src/renderer/store/editStore.ts`** | Defaults, undo/history, `setParam`, deep clones so defaults are not mutated. |
| **`src/renderer/components/editor/`** | `ToneCurveEditor`, `AdvancedAdjustmentsSection` (wheels, balance, HSL, dehaze). |
| **`src/renderer/lib/RenderPipeline.ts`** | Builds WebGL programs, uploads **curve LUT texture**, sets uniforms for split toning / balance / HSL / dehaze, runs passes. |
| **`src/renderer/lib/shaders.ts`** | `ADJUSTMENTS_FRAG`: single fragment shader that runs the ordered adjustment pipeline per pixel. |

Preview flow: **Zustand params → `ImageCanvas` → `RenderPipeline.render()` → fragment shader**. Export may use a different path (Sharp vs canvas capture); parity is a known Milestone A topic in `PRODUCT.md`.

---

## Adjustment pass order (inside `ADJUSTMENTS_FRAG`)

Order matters. Roughly:

1. **Linear exposure / contrast** (then back to sRGB for most tonal UI math).
2. **HSL luminance tools**: highlights, shadows, whites, blacks (on HSL lightness).
3. **Temperature / tint** (RGB offsets).
4. **Saturation / vibrance**.
5. **Detail**: noise reduction, sharpness, texture, clarity (some sample **original** `u_image` neighbors).
6. **HSL color mixer** + **dehaze**.
7. **Tone curves**: master on **luma**, then **per-channel R/G/B** in RGB.
8. **Split toning** (wheels) + **color balance** (masked RGB offsets).

Later passes (LUT, grain, halation, etc.) are outside this document but run in `RenderPipeline` after adjustments.

---

## Tone curves

### Concept

A **tone curve** maps input luminance or channel value \(x \in [0,1]\) to output \(y \in [0,1]\). Identity is the diagonal \(y = x\). Pulling the curve **up** brightens that tonal region; **down** darkens it. RGB curves bias individual channels (color cast or crossover).

### State (`CurvesState`)

- Channels: **`master`**, **`red`**, **`green`**, **`blue`**.
- Each channel is an array of **`CurvePoint { x, y }`** sorted by `x`. Endpoints are fixed at `x = 0` and `x = 1`.

### UI (`ToneCurveEditor.tsx`)

- **d3-shape** (`line` + `curveMonotoneX`, `area`) draws the interactive curve and fill.
- Pointer coordinates are converted using **SVG viewBox vs bounding rect** so clicks stay accurate when the control is scaled.
- Default identity includes **several interior points** on the diagonal so the user always sees draggable handles, not only invisible corners.

### CPU → GPU (`RenderPipeline.ts`)

- Control points are **not** sent as a long uniform array to the shader.
- JavaScript samples each channel with a **Catmull–Rom spline** (smooth, passes through knots; aligned with the monotone curve the UI draws).
- Samples are written to a **`256 × 1` RGBA texture**: R = master curve output, G/B/A = red/green/blue curve outputs for that input abscissa.
- The fragment shader uses **`texelFetch`** + linear interpolation between texels for `sampleCurve`.

### Shader application

After HSL mixer and dehaze:

1. Convert RGB → HSL, replace **lightness** with `sampleCurve(L, master)`, convert back.
2. Replace **R, G, B** with `sampleCurve(channel, channelIndex)`.

So master shapes **overall tone**; RGB curves shape **color vs tone** in display‑referred space (as today).

### Future improvements (curves)

- Higher bit-depth LUT or **analytic curve eval in shader** for even smoother extremes.
- Optional **log / scene-linear** working space for the curve stage only.
- Stricter **preview vs export** parity when export uses non-WebGL paths.

---

## Split toning (color grading wheels)

Wheels set **per-zone hue (0–360°)** and **saturation (0–100)** for **shadows**, **midtones**, and **highlights**. The renderer must turn that into **per-pixel RGB changes** keyed off **how bright** the pixel is.

### Version 1 — HSL “hue spin” (replaced)

**Idea:** For each zone, compute a **luminance mask** \(m(L)\) from the pixel’s Rec.709 luma \(L = dot(rgb, (0.2126, 0.7152, 0.0722))\). Then, for that zone:

1. Convert pixel RGB → **HSL**.
2. Find shortest angular path from current **hue** to wheel **hue**.
3. Nudge hue along that path by an amount proportional to **`saturation × mask`**.
4. Bump saturation slightly.
5. Convert back to RGB.

**Zones ran sequentially:** shadows, then midtones, then highlights — each step read the **already modified** color.

**Why it felt wrong**

- **Near-gray pixels:** HSL **hue is numerically unstable** when saturation is near zero. A tiny RGB noise becomes a huge hue jump, so “push shadows to blue” could become **red / magenta / green patches**.
- **Sequential stacking:** Mid and highlight wheels still ran on shadow regions with their own masks, **re-rotating hue** in a way professional apps usually avoid.
- **Mask shape:** The old shadow mask included a factor that **suppressed** the effect at very low \(L\), then ramped up — harsh transitions and odd behavior in the deepest shadows.
- **Narrow masks:** Neighboring luminances could get very different strengths → **banding / jagged** transitions on walls and skies.

### Version 2 — Chroma offset (current)

**Idea:** Treat the wheel as picking a **direction in color space**, not “rotate whatever hue the pixel thinks it has.”

1. **Reference color** at full saturation, mid lightness:  
   `ref = hslToRgb(vec3(hue01, 1.0, 0.5))`.
2. **Chroma axis:** subtract the **709 luma** of `ref` from `ref` itself (vector orthogonal to “grayscale line” in a simple sense). Normalize → **unit chroma direction** for that hue.
3. For each zone, multiply that axis by **`wheelSaturation × smoothMask(L)`**.
4. **Sum all three zones into one vector** `chr` → **single RGB offset** per pixel (no sequential hue warping).
5. **`chr` magnitude cap** when zones overlap heavily, to avoid blow-ups.
6. Apply **`rgb += chr * strength`**, clamp, then **optional luma preservation** (`rgb *= L_before / L_after` in 709 space, clamped) so grading does not randomly brighten or darken as much.

**Masks:** Wider, overlapping `smoothstep` ranges so shadow ↔ mid ↔ highlight **blend smoothly**.

**Why it behaves better**

- **Blues read as blue** even in dark, low-saturation fabric or concrete, because we are not trusting **inherited hue** of the pixel.
- **One combined offset** avoids three competing hue spins.
- **Softer masks** reduce visible contouring between tonal regions.

### Uniforms (`RenderPipeline` → shader)

- `u_splitShHue`, `u_splitMidHue`, `u_splitHiHue`: **0–1** (`hue / 360`).
- `u_splitShSat`, `u_splitMidSat`, `u_splitHiSat`: **0–1** (`saturation / 100`).

### UI library

- **`@uiw/react-color-wheel`** supplies the HS wheel; saturation slider in `AdvancedAdjustmentsSection` refines strength.

### Future improvements (split toning)

- Optional **log-space** or **ASC CDL–style** offsets for even closer parity with Resolve.
- **Per-zone pivot** or user-tunable mask midpoints.
- **Scopes** (vectorscope / waveform) tied to the same luma definition as the masks.

---

## Color balance

Three zones (shadow / mid / highlight), each three axes (cyan–red, magenta–green, yellow–blue), stored as **-100..100** in state, scaled in the pipeline for uniforms.

Shader: **`rgb += balanceVector * mask(L) * scale`**, with the **same smooth masks** as split toning (after wheels). This is additive RGB, not HSL spin — good for predictable pushes.

---

## HSL color mixer

Eight hue **bands** (red, orange, …, magenta). For each band, shader tests **hue distance** in HSL to a band center, builds a smooth mask, and applies small **hue / saturation / luminance** deltas in HSL space.

**Caveat:** Overlapping wide masks can affect adjacent hues; future work could tighten windows or use a smoother kernel.

---

## Dehaze

Heuristic **contrast + saturation + luma-dependent** adjustment (not a full physical dehaze model). Tuned for creative look; may be revised for more neutral behavior.

---

## Documentation maintenance

When you ship meaningful changes to advanced tools:

- Update this file (`Docs/advancedtools.md`).
- Update `Docs/ARCHITECTURE.md` if pass order, files, or IPC contracts change.
- Follow the documentation rule in `Docs/PRODUCT.md` for cross-doc updates when appropriate.

---

## Related files (quick index)

- `src/renderer/lib/shaders.ts` — `ADJUSTMENTS_FRAG` (curves, split toning, balance, HSL, dehaze).
- `src/renderer/lib/RenderPipeline.ts` — curve texture, uniform packing, draw calls.
- `src/renderer/components/editor/ToneCurveEditor.tsx` — curve UI.
- `src/renderer/components/editor/AdvancedAdjustmentsSection.tsx` — wheels, balance, HSL, dehaze UI.
- `src/shared/types.ts` — type definitions for all of the above.
