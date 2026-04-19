# Frescava Preset Design Guide

Everything you need to create a preset from scratch and publish it inside Frescava.

---

## Folder Structure

Each preset lives in its **own self-contained folder** inside `assets/presets/`:

```
assets/
  presets/
    kodak-portra-400/          ← one folder per preset (use the preset id)
      preset.json              ← required — the preset definition
      thumbnail.png            ← optional — shown in the preset sidebar (any size, ~200×200px)
      light_leak.png           ← optional — texture for the Light Leak effect
      dust.png                 ← optional — texture for the Dust & Scratches effect
      border.png               ← optional — texture for a custom border frame
    cinestill-800t/
      preset.json
      thumbnail.png
      ...
```

> **Rule:** all texture filenames in `preset.json` are **relative to the preset's own folder**.
> `"textureFile": "dust.png"` → resolved as `assets/presets/your-preset-id/dust.png`

---

## Full `preset.json` Reference

```jsonc
{
  // ── Identity ────────────────────────────────────────────────────────────────
  "id": "kodak-portra-400",           // must match the folder name
  "name": "Kodak Portra 400",         // display name in the UI
  "category": "film-stock",           // see Categories below
  "pack": "free",                     // "free" | "pro" | "community"
  "tags": ["film", "warm", "analog"], // used in search / pairing

  // ── LUT ─────────────────────────────────────────────────────────────────────
  // The LUT file is in assets/luts/free/  (NOT inside the preset folder)
  "lut": {
    "file": "kodak_portra.cube",   // filename in assets/luts/free/, or null
    "intensity": 0.9               // 0–1, how strongly to blend the LUT
  },

  // ── Fade / Matte ─────────────────────────────────────────────────────────────
  // Lifts the blacks and/or clips the whites for a filmic faded look.
  "fade": {
    "enabled": true,
    "blackLift": 0.05,    // 0–0.3   0=deep blacks, 0.05=faded film, 0.15=heavy matte
    "whiteCeiling": 0.97  // 0.7–1   1=full whites, 0.95=mild roll-off, 0.85=heavy compression
  },

  // ── Grain ───────────────────────────────────────────────────────────────────
  "grain": {
    "enabled": true,
    "type": "film",              // "fine" | "medium" | "coarse" | "film"
    "intensity": 0.28,           // 0–1
    "size": 1.1,                 // 0.5–2.0  pixel size multiplier
    "roughness": 0.6,            // 0–1  spatially uneven amplitude (more organic at higher values)
    "luminosityMode": true,      // true=grain only affects luminosity (no color noise), false=RGB
    "highlightReduction": 0.4   // 0–1  how much to pull grain back in bright areas
  },

  // ── Vignette ─────────────────────────────────────────────────────────────────
  "vignette": {
    "enabled": true,
    "shape": "oval",     // "oval" | "rect"
    "strength": 0.22,    // 0–1
    "feather": 0.88,     // 0–1   how gradual the edge is
    "midpoint": 0.65,    // 0.3–1  how far from center the vignette starts
    "exposure": -0.15    // -1–0  extra exposure darkening at corners (0=none)
  },

  // ── Halation ─────────────────────────────────────────────────────────────────
  // Simulates light bleeding past the film emulsion onto the base layer.
  "halation": {
    "enabled": true,
    "color": "#FF6B35",       // hex, warm reds / oranges are most film-accurate
    "radius": 22,             // 0–80  blur radius (preview resolution units)
    "threshold": 0.78,        // 0.5–1.0  only highlights above this get halation
    "intensity": 0.18,        // 0–1
    "blendMode": "screen"     // "screen" | "add" | "overlay"
  },

  // ── Chromatic Aberration ──────────────────────────────────────────────────────
  "chromaticAberration": {
    "enabled": false,
    "amount": 0.0,          // 0–20
    "radialFalloff": true   // true=stronger at corners (realistic lens), false=uniform
  },

  // ── Bloom ────────────────────────────────────────────────────────────────────
  "bloom": {
    "enabled": false,
    "threshold": 0.85,   // 0.5–1.0  only pixels brighter than this contribute to bloom
    "intensity": 0.0,    // 0–1
    "radius": 15,        // 5–50  blur radius of the bloom glow
    "character": "soft"  // "soft" | "hard"
  },

  // ── Lens Distortion ─────────────────────────────────────────────────────────
  "lensDistortion": {
    "enabled": false,
    "amount": 0.0   // -1 (barrel / fisheye) .. 0 .. +1 (pincushion / telephoto)
  },

  // ── Light Leak ───────────────────────────────────────────────────────────────
  // Place a PNG texture (RGBA) named e.g. "light_leak.png" in your preset folder.
  // Make the image on a black background; the lighter areas are where the leak shows.
  "lightLeak": {
    "enabled": false,
    "textureFile": "light_leak.png",  // null if no texture
    "color": "#FF8C00",               // tint color blended with the texture
    "colorStrength": 0.5,             // 0–1  how much the tint overrides raw texture color
    "position": [0.0, 0.0],           // [x, y] UV scroll offset for positioning
    "opacity": 0.0,                   // 0–1  master opacity
    "blendMode": "screen"             // "screen" | "add" | "overlay"
  },

  // ── Dust & Scratches ─────────────────────────────────────────────────────────
  // Place a PNG texture named e.g. "dust.png" in your preset folder.
  // White = dust/scratches visible, black = transparent areas.
  "dustScratches": {
    "enabled": false,
    "textureFile": "dust.png",   // null if no texture
    "opacity": 0.0,              // 0–1
    "blendMode": "screen"        // "screen" | "multiply" | "overlay"
  },

  // ── Border ──────────────────────────────────────────────────────────────────
  "border": {
    "enabled": false,
    "type": null,            // "solid" | "polaroid" | "filmstrip" | null (texture)
    "textureFile": null,     // only used when type=null, e.g. "border.png"
    "color": "#F5F0E8",      // used in solid / polaroid modes
    "width": 0.04,           // 0–0.15  fraction of image width
    "bottomWeight": 2.2,     // 1–3  how much heavier the bottom is vs sides (Polaroid=2.2)
    "cornerRadius": 0.0,     // 0–1
    "expandCanvas": true     // true=canvas grows to include border, false=image shrinks
  },

  // ── UI Metadata ─────────────────────────────────────────────────────────────
  // These are cosmetic / UX hints only. None affect rendering.
  "ui": {
    "accentColor": "#D4956A",         // used for toggle highlights in Settings panel
    "thumbnailCropHint": 0.4,         // 0–1, vertical crop offset for thumbnail display
    "intensityDefault": 1.0,          // starting intensity when preset is applied
    "intensityMin": 0.3,              // minimum the user can drag the intensity slider to
    "intensityMax": 1.0,              // maximum
    "pairsWith": ["cinestill-800t"],  // IDs of related presets shown in "Pairs with" section
    "moodTags": ["warm", "analog"],   // mood keywords
    "bestFor": ["portraits", "outdoor", "golden-hour"]  // use-case hints shown in Settings panel
  }
}
```

---

## Categories

| Value | UI Display | Best for |
|---|---|---|
| `film-stock` | Film Stock | Specific emulsion simulations (Portra, Fuji, Kodak Gold…) |
| `mood` | Mood | Aesthetic / feeling-first ("Melancholic", "Summer Haze"…) |
| `era` | Era | Decade-specific looks (70s, 90s, Y2K…) |
| `cinematic` | Cinematic | Movie-inspired grades (Teal & Orange, Anamorphic…) |
| `editorial` | Editorial | Magazine / fashion layouts |
| `aesthetic` | Aesthetic | Internet aesthetics (Lofi, Vaporwave, Moodboard…) |

---

## Texture Guidelines

### Light Leak (`light_leak.png`)
- Format: PNG, RGBA
- Size: any, ~1024×1024 recommended
- Design: Real light leak shapes — corner flares, streaks across the frame, orange/red color bleed near edges
- Background: **pure black (#000000)** — transparent areas will be invisible
- Tip: photograph an actual light leak by opening a film camera in bright light, or use gradient shapes

### Dust & Scratches (`dust.png`)
- Format: PNG, RGBA or grayscale
- Size: ~2048×1024 (landscape orientation looks natural)
- Design: Tiny specks, fine hair-thin scratch lines, a few larger dust blobs
- Background: **black** — white/grey = visible dust
- Blend modes: `screen` (additive, white dust appears bright) or `multiply` (dark scratches on bright areas)

### Border (`border.png`)
- Format: PNG with **alpha channel** (transparent center, border around edges)
- Size: match a standard aspect ratio — the app will stretch/fit as needed
- Design: Camera mask overlays, polaroid frames, filmstrip sprocket edges, rough torn edges

### Thumbnail (`thumbnail.png`)
- Format: PNG or JPG
- Size: ~200×200px minimum, square preferred
- Content: A representative processed photo (ideally one you applied the preset to)

---

## LUT Files

LUT files (`.cube`) go in `assets/luts/free/` — **not** in the preset folder.

Reference them by filename in `preset.json`:
```json
"lut": { "file": "kodak_portra.cube", "intensity": 0.9 }
```

If you don't have a LUT, set `"file": null` and rely entirely on the built-in adjustments.

### Creating a LUT
1. Process a test photo in Lightroom / DaVinci Resolve with your desired grade
2. Export a **33×33×33** or **64×64×64** `.cube` file (Resolve: Color → LUT Export; Lightroom: needs a plugin)
3. Drop it in `assets/luts/free/`

---

## Workflow: Designing a New Preset

1. **Create the folder** — name it `your-preset-id` (lowercase, hyphens, no spaces)
2. **Copy a template** — duplicate `/assets/presets/kodak-portra-400/preset.json` into your folder, rename key fields
3. **Place your LUT** in `assets/luts/free/` if you have one
4. **Restart the dev server** — `npm run dev` — the preset scanner auto-discovers new folders
5. **Apply the preset** in Frescava and use the **Settings tab** to fine-tune effect params in real time
6. **Copy those values back** into your `preset.json` once satisfied
7. **Add textures** — drop `thumbnail.png`, `dust.png`, `light_leak.png` as needed, enable them in Settings
8. **Repeat** for each preset

---

## Quick Tips

- **Halation color** for common film stocks:
  - Kodak Portra: `#FF6B35` (warm orange-red)
  - CineStill 800T: `#FF2200` (deep red)
  - Fuji 400H: `#FF8888` (pinkish)
  - Ilford HP5 (B&W): disabled

- **Grain type guide:**
  - `fine` — ISO 100–200 equivalent
  - `medium` — ISO 400 equivalent
  - `coarse` — ISO 800–1600 equivalent
  - `film` — two-layer organic noise, most analog

- **Fade**:  
  `blackLift: 0` = clean dark blacks (digital)  
  `blackLift: 0.04–0.07` = lightly faded film stock  
  `blackLift: 0.10–0.15` = heavy matte / editorial look

- Set `"pack": "community"` for user-contributed presets, `"pro"` for paid packs

---

*Frescava v0.2 · Preset Design Guide*
