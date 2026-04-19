# Frescava — Architecture & Technical Specification

> Reference document for building Frescava with Claude Code. Covers stack, rendering pipeline, ML models, shader implementations, effects system, template system, backend, security, and build configuration.

---

## Technology Stack

### Core Framework
- **Electron** (latest stable) — desktop app shell, file system access, native APIs, `setContentProtection`
- **React 18** — UI framework
- **TypeScript** — entire codebase strictly typed
- **Vite** — bundler (fast HMR in dev, optimized production build)
- **electron-vite** — Vite config tailored for Electron (handles main + renderer + preload processes)

### Rendering — Two Parallel Pipelines
- **WebGL 2.0** (raw canvas API) — real-time filter preview, 60fps, GPU-accelerated
- **GLSL shaders** — all effects as fragment shader passes (LUT, grain, vignette, halation, CA, bloom, distortion)
- **Sharp (Node.js)** — full-resolution export pipeline, runs in main process only
- **OffscreenCanvas** — preview rendering without blocking UI thread
- **Konva.js** — 2D canvas layer system for text overlays, graphics, template rendering

### State Management
- **Zustand** — global edit state, preset state, UI state, template state
- **Immer** — immutable state updates for edit history (enables timeline scrubber)

### ML Runtime
- **onnxruntime-node** — runs all local ONNX models
- Execution providers auto-selected: CoreML (Apple Silicon) → CUDA (Nvidia) → DirectML (Windows) → CPU fallback
- Models: RMBG-1.4, Real-ESRGAN x4plus, GFPGAN v1.4, MobileSAM, MediaPipe Segmentation

### Canvas Workspace (v2)
- **React Flow / @xyflow/react** — node graph system, production-grade, fully customizable nodes

### Text & Graphics
- **Konva.js** — text layer rendering, image compositing, template canvas
- **opentype.js** — font parsing and path-based text for curve-text effect

### Styling & Animation
- **Tailwind CSS** — utility styling
- **Framer Motion** — panel reveals, transitions, preset strip animations

### Backend & Auth
- **Supabase** — Auth (email/Google/Apple), PostgreSQL database, Edge Functions (Deno), Storage (S3-compatible CDN)
- **Lemon Squeezy** — payment processing, webhook events, license key management

### APIs (Server-Side Only — Never in Client)
- **Anthropic Claude API** — captions, hashtags (proxied via Supabase Edge Function)
- **Replicate API** — image generation SDXL (proxied via Supabase Edge Function)
- **Instagram Basic Display API** — grid continuity, read-only

### Security & Licensing
- **node-machine-id** — hardware fingerprinting for license binding
- **javascript-obfuscator** — pre-build code obfuscation
- **Rust + napi-rs** — compiled native module for license validation + asset decryption
- **stegjs / custom** — steganographic watermarking in preview renders

### Distribution
- **electron-builder** — packages .dmg (Mac arm64 + x64) and .exe (Windows x64)
- **electron-updater** — auto-updates via GitHub Releases
- **GitHub Releases** — app distribution, no custom file hosting needed
- **Sentry** — crash reporting and error tracking

---

## Project Structure

```
Frescava/
├── electron/
│   ├── main/
│   │   ├── index.ts                    # App entry, BrowserWindow, setContentProtection
│   │   ├── ipc/
│   │   │   ├── export.ts               # Export IPC handlers (Sharp pipeline)
│   │   │   ├── license.ts              # License validation, machine activation
│   │   │   ├── ml.ts                   # ONNX inference handlers
│   │   │   └── assets.ts               # LUT/texture loading + decryption
│   │   ├── license/
│   │   │   ├── validator.ts            # License check, 24h cache, machine fingerprint
│   │   │   └── native/                 # Rust napi-rs module source
│   │   └── updater.ts                  # electron-updater, GitHub Releases
│   └── preload/
│       └── index.ts                    # contextBridge typed API exposure
│
├── src/
│   └── renderer/
│       ├── App.tsx                     # Root, tab routing: Editor / Templates / Canvas
│       ├── pages/
│       │   ├── Editor.tsx              # Main editing page
│       │   ├── Templates.tsx           # Template composer page
│       │   ├── Canvas.tsx              # Canvas workspace (v2)
│       │   └── Preview.tsx             # Post preview (Instagram mockup)
│       ├── components/
│       │   ├── editor/
│       │   │   ├── ImageCanvas.tsx     # WebGL canvas, shader pipeline manager
│       │   │   ├── PresetStrip.tsx     # Horizontal scrolling presets w/ live thumbnails
│       │   │   ├── AdjustmentPanel.tsx # Light/Color/Detail sliders
│       │   │   ├── ProControls.tsx     # Curves, HSL, Color Grading wheels
│       │   │   ├── EffectsPanel.tsx    # Grain, vignette, halation, CA, bloom, distortion
│       │   │   ├── TextLayer.tsx       # Konva text/graphics overlay system
│       │   │   ├── HistoryTimeline.tsx # Visual edit history scrubber
│       │   │   └── BeforeAfter.tsx     # Split view / toggle
│       │   ├── templates/
│       │   │   ├── TemplateGrid.tsx    # Browseable template thumbnail grid
│       │   │   ├── PosterCanvas.tsx    # Konva template renderer + interaction
│       │   │   ├── TextEditor.tsx      # Inline text editing overlay
│       │   │   └── CropHandle.tsx      # Per-strip drag crop repositioning
│       │   ├── preview/
│       │   │   ├── InstagramFeed.tsx
│       │   │   ├── InstagramStory.tsx
│       │   │   └── PlatformTabs.tsx
│       │   ├── ai/
│       │   │   ├── CaptionPanel.tsx
│       │   │   ├── BackgroundRemoval.tsx
│       │   │   └── UpscalePanel.tsx
│       │   └── ui/                     # Design system: Button, Slider, Panel etc
│       ├── hooks/
│       │   ├── useWebGL.ts             # WebGL context + shader pipeline management
│       │   ├── useEditState.ts         # Edit parameters, history, undo/redo
│       │   ├── usePresets.ts           # Preset loading, selection, live thumbnails
│       │   ├── useExport.ts            # Export flow + paywall gate + watermark
│       │   └── useTemplates.ts         # Template loading, state, crop positions
│       └── store/
│           ├── editStore.ts            # Zustand: current edit parameters + history
│           ├── uiStore.ts              # Zustand: panels, mode, active tab
│           ├── presetStore.ts          # Zustand: preset library, favorites
│           └── templateStore.ts        # Zustand: template state, text values, crops
│
├── assets/
│   ├── luts/
│   │   └── free/                       # Plain .cube files — bundled, openly accessible
│   ├── textures/
│   │   ├── grain/                      # Grain overlay PNGs (fine, medium, coarse, film)
│   │   ├── borders/                    # Border/frame PNGs (polaroid, filmstrip, etc)
│   │   └── lightleaks/                 # Light leak overlay PNGs (8-10 variants)
│   └── presets/
│       └── *.json                      # Preset parameter definitions
│
├── templates/
│   └── *.json                          # Poster template definitions
│
├── models/                             # All outside ASAR (asarUnpack)
│   ├── rmbg.onnx                       # 170MB — background removal
│   ├── realesrgan.onnx                 # 65MB — upscaling
│   ├── gfpgan.onnx                     # 350MB — face restoration
│   ├── mobile_sam.onnx                 # 40MB — region selection
│   └── mediapipe_seg.onnx              # 8MB — auto masking (eager loaded)
│
├── native/
│   └── src/lib.rs                      # Rust: license validation + LUT decryption
│
└── scripts/
    ├── build-presets.ts                # Generate preset thumbnails at build time
    ├── inject-integrity-hash.js        # Compute + inject ASAR hash for tamper detection
    └── obfuscate.ts                    # Pre-build JS obfuscation step
```

---

## Rendering Architecture

Two completely separate pipelines. Critical architectural decision.

```
USER INTERACTION (slider move, preset click, effect toggle)
        │
        ▼
┌────────────────────────┐
│  Edit State (Zustand)  │  ← all parameters as plain numbers/strings/booleans
└────────────────────────┘
        │
        ├─────────────────────────────────────────────────────┐
        ▼                                                     ▼
┌───────────────────────────┐              ┌──────────────────────────────────┐
│  WebGL Preview Pipeline   │              │  Sharp Export Pipeline            │
│  60fps, GPU-accelerated   │              │  Full-res, triggered on export    │
│  Works on downsized copy  │              │  Runs in Electron main process    │
│  (longest edge 2048px)    │              │  Input: original full-res file    │
│  OffscreenCanvas          │              │  LUT via HALD CLUT + ImageMagick  │
│  Output: canvas display   │              │  Output: JPEG/PNG to disk         │
└───────────────────────────┘              └──────────────────────────────────┘
```

The WebGL pipeline never touches the original file. The Sharp pipeline only runs once at export time and processes the full original resolution.

---

## WebGL Shader Pipeline — Full Implementation

### Pipeline Order

Order matters. Changing it changes the output.

```
1.  Load base image as WebGL texture
2.  LUT pass (3D texture lookup — color transformation)
3.  Adjustments pass (exposure, contrast, highlights, shadows, whites, blacks, temp, tint, vibrance, sat)
4.  Curves pass (1D LUT per RGB channel, generated from user's curve points)
5.  HSL pass (per-hue-range hue/sat/lum shifts)
6.  Color Grading pass (shadow/midtone/highlight color wheels)
7.  Halation — 3 passes: extract highlights → Gaussian blur → screen composite
8.  Bloom — 3 passes: same infrastructure as halation, different params
9.  Chromatic Aberration pass
10. Lens Distortion pass
11. Vignette pass
12. Grain pass (procedural GLSL noise)
13. Overlay pass (light leaks / dust / scratches — PNG textures)
14. Border pass (PNG overlay or programmatic)
15. Output to display canvas
```

### Ping-Pong Framebuffer Setup

Required for multi-pass effects (halation, bloom). Built once, used by all multi-pass effects.

```typescript
class RenderPipeline {
  private gl: WebGL2RenderingContext
  private fbos: [WebGLFramebuffer, WebGLFramebuffer]
  private textures: [WebGLTexture, WebGLTexture]
  private passes: ShaderPass[] = []
  private pingPong = 0

  constructor(gl: WebGL2RenderingContext, width: number, height: number) {
    this.gl = gl
    this.fbos = [gl.createFramebuffer()!, gl.createFramebuffer()!]
    this.textures = [
      this.createTexture(width, height),
      this.createTexture(width, height)
    ]
    this.fbos.forEach((fbo, i) => {
      gl.bindFramebuffer(gl.FRAMEBUFFER, fbo)
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.textures[i], 0)
    })
  }

  render(sourceTexture: WebGLTexture): WebGLTexture {
    let current = sourceTexture
    this.pingPong = 0

    for (const pass of this.passes) {
      if (!pass.enabled) continue
      const targetIdx = this.pingPong % 2
      this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, this.fbos[targetIdx])
      pass.render(current)
      current = this.textures[targetIdx]
      this.pingPong++
    }

    this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, null)
    return current
  }
}
```

### LUT Shader

```glsl
// lut_apply.frag
precision mediump float;
uniform sampler2D u_image;
uniform sampler3D u_lut;
uniform float u_intensity;
varying vec2 v_texCoord;

void main() {
  vec4 original = texture2D(u_image, v_texCoord);
  float lutSize = 33.0;
  float scale = (lutSize - 1.0) / lutSize;
  float offset = 1.0 / (2.0 * lutSize);
  vec3 lutCoord = original.rgb * scale + offset;
  vec4 graded = texture3D(u_lut, lutCoord);
  gl_FragColor = vec4(mix(original.rgb, graded.rgb, u_intensity), original.a);
}
```

### Loading .cube Files

```typescript
async function loadLUT(lutPath: string): Promise<{ data: Float32Array; size: number }> {
  const content = await fs.readFile(lutPath, 'utf-8')
  const values: number[] = []
  let size = 33

  for (const line of content.split('\n')) {
    if (line.startsWith('LUT_3D_SIZE')) size = parseInt(line.split(' ')[1])
    const parts = line.trim().split(/\s+/)
    if (parts.length === 3 && !isNaN(parseFloat(parts[0]))) {
      values.push(parseFloat(parts[0]), parseFloat(parts[1]), parseFloat(parts[2]))
    }
  }
  return { data: new Float32Array(values), size }
}

function uploadLUTToGPU(gl: WebGL2RenderingContext, data: Float32Array, size: number): WebGLTexture {
  const texture = gl.createTexture()!
  gl.bindTexture(gl.TEXTURE_3D, texture)
  gl.texImage3D(gl.TEXTURE_3D, 0, gl.RGB32F, size, size, size, 0, gl.RGB, gl.FLOAT, data)
  gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
  gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
  return texture
}
```

### Grain Shader (Procedural — No Texture File Needed)

```glsl
// grain.frag
uniform float u_intensity;
uniform float u_size;
uniform float u_seed;
uniform int u_type;         // 0=fine, 1=medium, 2=coarse, 3=film

float hash(vec2 p) {
  p = fract(p * vec2(234.34, 435.345));
  p += dot(p, p + 34.23);
  return fract(p.x * p.y);
}

float grain(vec2 uv, float size, float seed) {
  vec2 scaled = uv * (1.0 / size) + seed;
  return hash(floor(scaled)) * 2.0 - 1.0;
}

void main() {
  vec4 color = texture2D(u_image, v_texCoord);
  float grainSize = 0.002 * u_size;
  float noise = grain(v_texCoord, grainSize, u_seed);

  if (u_type == 3) {  // Film: organic clumping
    vec2 offset = vec2(0.001, 0.0007);
    noise = (noise + grain(v_texCoord + offset, grainSize * 1.5, u_seed)) * 0.5;
  }

  // Luminosity mode: affect brightness only, not color
  vec3 hsl = rgbToHSL(color.rgb);
  hsl.z = clamp(hsl.z + noise * u_intensity * 0.15, 0.0, 1.0);
  gl_FragColor = vec4(hslToRGB(hsl), color.a);
}
```

### Halation Shader (3-Pass)

```glsl
// Pass 1: halation_extract.frag
uniform float u_threshold;
uniform vec3 u_color;         // warm red/orange tint, user-adjustable

void main() {
  vec4 color = texture2D(u_image, v_texCoord);
  float luminance = dot(color.rgb, vec3(0.2126, 0.7152, 0.0722));
  float highlight = smoothstep(u_threshold - 0.1, u_threshold + 0.1, luminance);
  gl_FragColor = vec4(color.rgb * u_color * highlight, 1.0);
}

// Pass 2: separable Gaussian blur (horizontal + vertical sub-passes)

// Pass 3: halation_composite.frag
uniform sampler2D u_halation;
uniform float u_intensity;

void main() {
  vec4 base = texture2D(u_image, v_texCoord);
  vec4 glow = texture2D(u_halation, v_texCoord);
  // Screen blend: brightens without clipping
  vec3 screen = 1.0 - (1.0 - base.rgb) * (1.0 - glow.rgb * u_intensity);
  gl_FragColor = vec4(screen, base.a);
}
```

Bloom uses the same 3-pass infrastructure with different threshold, color (neutral white), and blur radius (wider spread).

### Chromatic Aberration Shader

```glsl
// chromatic_aberration.frag
uniform float u_amount;
void main() {
  vec2 uv = v_texCoord;
  vec2 center = vec2(0.5, 0.5);
  vec2 direction = uv - center;
  float dist = length(direction);
  vec2 offset = direction * u_amount * 0.01 * dist;  // radial falloff — zero at center

  float r = texture2D(u_image, uv + offset).r;
  float g = texture2D(u_image, uv).g;
  float b = texture2D(u_image, uv - offset).b;
  gl_FragColor = vec4(r, g, b, texture2D(u_image, uv).a);
}
```

### Vignette Shader

```glsl
// vignette.frag
uniform float u_strength;
uniform float u_feather;
uniform float u_midpoint;
uniform int u_shape;          // 0=circular, 1=rectangular
uniform float u_aspectRatio;

void main() {
  vec4 color = texture2D(u_image, v_texCoord);
  vec2 uv = v_texCoord - vec2(0.5);

  float dist;
  if (u_shape == 0) {
    uv.x *= u_aspectRatio;
    dist = length(uv);
  } else {
    dist = max(abs(uv.x), abs(uv.y)) * 1.4;
  }

  float edge0 = u_midpoint * 0.7;
  float edge1 = edge0 + u_feather * 0.5;
  float vignette = 1.0 - smoothstep(edge0, edge1, dist);
  float exposure = 1.0 - (1.0 - vignette) * u_strength;

  gl_FragColor = vec4(color.rgb * exposure, color.a);
}
```

### Lens Distortion Shader

```glsl
// lens_distortion.frag
uniform float u_amount;       // negative=barrel, positive=pincushion
uniform float u_aspectRatio;

void main() {
  vec2 uv = v_texCoord - 0.5;
  uv.x *= u_aspectRatio;
  float r = length(uv);
  float distortion = 1.0 + u_amount * r * r;  // Brown-Conrady simplified
  vec2 distorted = uv * distortion;
  distorted.x /= u_aspectRatio;
  distorted += 0.5;

  if (distorted.x < 0.0 || distorted.x > 1.0 || distorted.y < 0.0 || distorted.y > 1.0) {
    gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
    return;
  }
  gl_FragColor = texture2D(u_image, distorted);
}
```

### Overlay Shader (Light Leaks, Dust, Borders)

```glsl
// overlay.frag
uniform sampler2D u_overlay;
uniform float u_opacity;
uniform int u_blendMode;      // 0=screen, 1=multiply, 2=overlay, 3=add
uniform vec3 u_tint;
uniform vec2 u_position;

vec3 blendScreen(vec3 a, vec3 b)    { return 1.0 - (1.0 - a) * (1.0 - b); }
vec3 blendMultiply(vec3 a, vec3 b)  { return a * b; }
vec3 blendOverlay(vec3 a, vec3 b)   { return mix(2.0*a*b, 1.0-2.0*(1.0-a)*(1.0-b), step(0.5, a)); }

void main() {
  vec4 base = texture2D(u_image, v_texCoord);
  vec4 overlay = texture2D(u_overlay, v_texCoord + u_position);
  overlay.rgb *= u_tint;

  vec3 blended;
  if (u_blendMode == 0) blended = blendScreen(base.rgb, overlay.rgb);
  else if (u_blendMode == 1) blended = blendMultiply(base.rgb, overlay.rgb);
  else if (u_blendMode == 2) blended = blendOverlay(base.rgb, overlay.rgb);
  else blended = base.rgb + overlay.rgb;

  gl_FragColor = vec4(mix(base.rgb, blended, overlay.a * u_opacity), base.a);
}
```

---

## Effects System — Local Adjustments

All local adjustments follow the same pattern:
1. Generate a grayscale mask texture (white = apply, black = don't, gray = partial)
2. Run adjustment shaders on full image
3. Composite: `result = mix(original, adjusted, mask)`

### Radial Mask Shader

```glsl
// radial_mask.frag
uniform vec2 u_center;
uniform vec2 u_radii;         // x=inner (feather start), y=outer (feather end)
uniform float u_aspectRatio;
uniform bool u_invert;

void main() {
  vec2 uv = v_texCoord - u_center;
  uv.x *= u_aspectRatio;
  float dist = length(uv);
  float mask = 1.0 - smoothstep(u_radii.x, u_radii.y, dist);
  if (u_invert) mask = 1.0 - mask;
  gl_FragColor = vec4(mask, mask, mask, 1.0);
}
```

### Gradient Mask Shader

```glsl
// gradient_mask.frag
uniform vec2 u_startPoint;
uniform vec2 u_endPoint;

void main() {
  vec2 line = u_endPoint - u_startPoint;
  vec2 toPixel = v_texCoord - u_startPoint;
  float t = dot(toPixel, line) / dot(line, line);
  float mask = 1.0 - clamp(t, 0.0, 1.0);
  gl_FragColor = vec4(mask, mask, mask, 1.0);
}
```

### AI Brush Masking (MobileSAM Integration)

```typescript
class BrushMasking {
  private points: { x: number; y: number; type: 'fg' | 'bg' }[] = []
  private samSession: SAMSession

  addStroke(x: number, y: number, isForeground: boolean) {
    this.points.push({ x, y, type: isForeground ? 'fg' : 'bg' })
    this.scheduleRefinement()
  }

  private scheduleRefinement = debounce(async () => {
    // Show raw strokes immediately, replace with AI mask when ready
    const mask = await this.samSession.getMaskFromPoints(this.points)
    this.updateMaskDisplay(mask)
  }, 200)
}
```

### SAM Session (Cache Embeddings Per Image)

```typescript
class SAMSession {
  private encoderSession: ort.InferenceSession
  private decoderSession: ort.InferenceSession
  private imageEmbedding: ort.Tensor | null = null

  async encodeImage(imageBuffer: Buffer) {
    // Expensive (~1-2s) — cache per image, reuse for brush + subject mask
    const preprocessed = await preprocessForSAM(imageBuffer)
    const result = await this.encoderSession.run({ input: preprocessed })
    this.imageEmbedding = result.image_embeddings
  }

  async getMask(clickX: number, clickY: number, imgW: number, imgH: number) {
    // Fast (<100ms) — runs per click using cached embeddings
    const point = new ort.Tensor('float32', [clickX / imgW, clickY / imgH], [1, 1, 2])
    const label = new ort.Tensor('float32', [1], [1, 1])
    const result = await this.decoderSession.run({
      image_embeddings: this.imageEmbedding!,
      point_coords: point,
      point_labels: label,
    })
    return result.masks.data as Float32Array
  }
}
```

---

## Template System

### Architecture

Templates are JSON definitions rendered by a Konva.js engine built once. New templates require no code — only a new JSON file generated from a Figma design.

**Designer workflow:** Design in Figma at 1080x1920 (9:16) → export PNG → Claude Code reads PNG and generates JSON → template is live.

**Template JSON schema:**

```typescript
interface PosterTemplate {
  id: string
  name: string
  category: 'portrait' | 'minimal' | 'film' | 'bold' | 'quote' | 'aesthetic'
  aspectRatio: '9:16' | '4:5' | '1:1' | 'A4'
  backgroundColor: string
  elements: TemplateElement[]
}

type TemplateElement = ImageSlot | TextBlock | ShapeElement

interface ImageSlot {
  type: 'image'
  id: string
  x: number; y: number          // % of canvas width/height
  width: number; height: number // % of canvas
  cropY: number                 // which vertical slice (0-1, top of source image)
  cropHeight: number            // height of slice (0-1)
  filter?: string               // optional preset ID to apply to this strip
}

interface TextBlock {
  type: 'text'
  id: string
  x: number; y: number
  width: number                 // % of canvas
  defaultText: string
  placeholder: string
  fontFamily: string            // must be Google Fonts
  fontSize: number              // relative (% of canvas height)
  fontWeight: number
  letterSpacing: number
  lineHeight: number
  textAlign: 'left' | 'center' | 'right' | 'justify'
  color: string
  editable: true
  multiFont?: {                 // mixed serif+sans like "Eyes" template
    firstChar: { fontFamily: string; fontWeight: number }
    rest: { fontFamily: string; fontWeight: number }
  }
}
```

### Template Rendering (Konva.js)

```typescript
function renderImageSlot(
  layer: Konva.Layer,
  slot: ImageSlot,
  userImage: HTMLImageElement,
  canvasW: number,
  canvasH: number
) {
  const clipX = (slot.x / 100) * canvasW
  const clipY = (slot.y / 100) * canvasH
  const clipW = (slot.width / 100) * canvasW
  const clipH = (slot.height / 100) * canvasH

  const group = new Konva.Group({ clip: { x: clipX, y: clipY, width: clipW, height: clipH } })

  // Position image so the correct cropY slice shows through the clip
  const imgDisplayH = canvasW * (userImage.height / userImage.width)
  const imgY = clipY - (slot.cropY * imgDisplayH) + (clipH / 2) - (slot.cropHeight * imgDisplayH / 2)

  group.add(new Konva.Image({
    image: userImage,
    x: clipX, y: imgY,
    width: clipW, height: imgDisplayH
  }))

  // Drag to reposition crop
  group.on('mousedown', startCropDrag(slot, imgDisplayH, layer))
  layer.add(group)
}

function renderTextBlock(
  layer: Konva.Layer,
  block: TextBlock,
  value: string,
  canvasW: number,
  canvasH: number,
  onSelect: (id: string) => void
) {
  const text = new Konva.Text({
    x: (block.x / 100) * canvasW,
    y: (block.y / 100) * canvasH,
    width: (block.width / 100) * canvasW,
    text: value || block.defaultText,
    fontFamily: block.fontFamily,
    fontSize: (block.fontSize / 100) * canvasH,
    fontStyle: `${block.fontWeight}`,
    fill: block.color,
    align: block.textAlign,
    lineHeight: block.lineHeight,
    letterSpacing: block.letterSpacing,
  })

  text.on('click', () => {
    onSelect(block.id)
    showInlineEditor(text, block, canvasW, canvasH)
  })

  layer.add(text)
}
```

### Inline Text Editing

```typescript
function showInlineEditor(konvaText: Konva.Text, block: TextBlock, onChange: (v: string) => void) {
  // Position real <textarea> exactly over the Konva text
  // Gives real cursor, selection, mobile keyboard support
  const pos = konvaText.absolutePosition()
  const textarea = document.createElement('textarea')

  Object.assign(textarea.style, {
    position: 'absolute',
    top: pos.y + 'px', left: pos.x + 'px',
    width: konvaText.width() + 'px',
    fontFamily: block.fontFamily,
    fontSize: konvaText.fontSize() + 'px',
    color: block.color,
    background: 'transparent',
    border: '1px solid rgba(255,255,255,0.5)',
    outline: 'none', resize: 'none', overflow: 'hidden'
  })

  textarea.value = konvaText.text()
  textarea.addEventListener('input', () => {
    konvaText.text(textarea.value)
    konvaText.getLayer()?.batchDraw()
    onChange(textarea.value)
  })
  textarea.addEventListener('blur', () => textarea.remove())

  document.getElementById('template-container')!.appendChild(textarea)
  textarea.focus()
}
```

---

## Export Pipeline (Sharp — Main Process)

```typescript
// electron/main/ipc/export.ts
async function exportImage(opts: ExportOptions): Promise<void> {
  await validateLicense()  // throws if invalid

  // Apply LUT via HALD CLUT method (Sharp-compatible)
  const haldClut = await generateHaldClut(opts.editState.presetId, opts.editState.presetIntensity)

  let pipeline = sharp(opts.imagePath)
    .modulate({
      brightness: exposureToBrightness(opts.editState.exposure),
      saturation: saturationToMultiplier(opts.editState.saturation),
    })
    .linear(
      contrastToAlpha(opts.editState.contrast),
      contrastToBeta(opts.editState.contrast)
    )

  // Apply HALD CLUT for LUT transformation
  if (haldClut) {
    pipeline = pipeline.composite([{ input: haldClut, blend: 'color' }])
  }

  // Grain: generate grain texture matching export resolution, composite
  if (opts.editState.grain.intensity > 0) {
    const grainOverlay = await generateGrainTexture(
      opts.imageWidth, opts.imageHeight, opts.editState.grain
    )
    pipeline = pipeline.composite([{ input: grainOverlay, blend: 'overlay' }])
  }

  // Border: composite PNG if set
  if (opts.editState.border.type) {
    const borderImg = await loadBorderTexture(opts.editState.border.type)
    pipeline = pipeline.composite([{ input: borderImg, blend: 'over' }])
  }

  await pipeline
    .jpeg({ quality: opts.quality, mozjpeg: true })
    .toFile(opts.outputPath)
}
```

**LUT in export note:** Sharp doesn't support 3D LUTs natively. Options ranked best-to-worst:
1. HALD CLUT via Sharp composite (recommended — pure Sharp, no extra deps)
2. ImageMagick shell call with `-hald-clut`
3. CPU pixel-loop application (slow but no deps)

---

## Backend — Supabase

### Database Schema

```sql
-- Auth handled by Supabase (auth.users automatic)

create table subscriptions (
  user_id uuid primary key references auth.users,
  plan text default 'free',              -- 'free' | 'pro'
  status text default 'active',          -- 'active' | 'cancelled' | 'expired'
  current_period_end timestamptz,
  lemon_squeezy_id text,
  updated_at timestamptz default now()
);

create table machine_activations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users,
  fingerprint text not null,
  platform text,
  nickname text,
  activated_at timestamptz default now(),
  last_seen_at timestamptz default now(),
  unique(user_id, fingerprint)
);

create table pack_entitlements (
  user_id uuid references auth.users,
  pack_id text,
  purchased_at timestamptz default now(),
  transaction_id text unique,
  primary key (user_id, pack_id)
);

create table ai_usage (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users,
  feature text,                          -- 'caption' | 'background_removal' | 'upscale' | 'generate'
  used_at timestamptz default now()
);

create table announcements (
  id uuid primary key default gen_random_uuid(),
  title text, body text,
  pack_id text,
  target_plan text default 'all',        -- 'all' | 'pro' | 'free'
  created_at timestamptz default now()
);

-- RLS: users read/write their own data only
alter table subscriptions enable row level security;
alter table machine_activations enable row level security;
alter table pack_entitlements enable row level security;
alter table ai_usage enable row level security;

create policy "own data" on subscriptions for all using (auth.uid() = user_id);
create policy "own data" on machine_activations for all using (auth.uid() = user_id);
create policy "own data" on pack_entitlements for all using (auth.uid() = user_id);
create policy "own data" on ai_usage for all using (auth.uid() = user_id);
```

### Edge Functions

**5 functions total. All Deno.**

| Function | Trigger | Does |
|---|---|---|
| `webhook-payment` | Lemon Squeezy POST | Verify HMAC sig → update subscriptions + pack_entitlements |
| `validate-license` | App on export | Check subscription + machine fingerprint → allow/deny |
| `activate-machine` | First launch post-login | Register machine, enforce 2-device limit |
| `download-pack` | Pack purchase/access | Check entitlement → return signed 60s URL from Storage |
| `ai-proxy` | Any AI feature | Auth + rate limit check → proxy to Anthropic/Replicate |

**Webhook signature verification (non-negotiable — without this anyone can fake a payment):**

```typescript
// webhook-payment Edge Function
const signature = req.headers.get('x-signature')
const secret = Deno.env.get('LEMON_SQUEEZY_WEBHOOK_SECRET')!
const body = await req.text()

const key = await crypto.subtle.importKey(
  'raw', new TextEncoder().encode(secret),
  { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
)
const expected = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(body))
const expectedHex = Array.from(new Uint8Array(expected)).map(b => b.toString(16).padStart(2, '0')).join('')

if (signature !== expectedHex) return new Response('Invalid signature', { status: 401 })
// Safe to process payment event
```

**AI proxy with rate limiting:**

```typescript
// ai-proxy Edge Function
const user = await getUser(req)
if (!user) return new Response('Unauthorized', { status: 401 })

const { feature, ...params } = await req.json()
const plan = await getUserPlan(user.id)
const limit = plan === 'pro' ? Infinity : 3

const todayUsage = await supabase
  .from('ai_usage')
  .select('id', { count: 'exact' })
  .eq('user_id', user.id)
  .eq('feature', feature)
  .gte('used_at', new Date().toISOString().split('T')[0])

if ((todayUsage.count ?? 0) >= limit) return new Response('Daily limit reached', { status: 429 })

const result = await proxyToAPI(feature, params)
await supabase.from('ai_usage').insert({ user_id: user.id, feature })
return Response.json(result)
```

---

## License & Security System

### Machine Fingerprint

```typescript
import { machineIdSync } from 'node-machine-id'
import crypto from 'crypto'

function getMachineFingerprint(): string {
  return crypto.createHash('sha256')
    .update(machineIdSync())
    .update(process.platform)
    .digest('hex')
    .substring(0, 32)
}
```

### License Validation (24h Cache)

```typescript
async function validateLicense(): Promise<void> {
  const storedKey = await getStoredLicenseKey()
  if (!storedKey) throw new Error('no_license')

  // Check 24h cache first
  const cached = await getCachedValidation()
  if (cached && Date.now() - cached.timestamp < 86_400_000) return  // valid

  try {
    const res = await fetch('https://[project].supabase.co/functions/v1/validate-license', {
      method: 'POST',
      body: JSON.stringify({ key: storedKey, fingerprint: getMachineFingerprint() })
    })
    if (!res.ok) throw new Error('invalid_license')
    await cacheValidation({ timestamp: Date.now() })
  } catch (err) {
    // Network error: use cache if available (even if >24h, up to 7 days grace)
    if (cached && Date.now() - cached.timestamp < 604_800_000) return
    throw err
  }
}
```

### LUT Decryption (Premium Packs)

```typescript
async function decryptLUT(encryptedPath: string, licenseKey: string): Promise<Buffer> {
  const fingerprint = getMachineFingerprint()
  const key = crypto.createHmac('sha256', fingerprint).update(licenseKey).digest()
  const encrypted = await fs.readFile(encryptedPath)
  const iv = encrypted.subarray(0, 16)
  const ciphertext = encrypted.subarray(16)
  const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv)
  return Buffer.concat([decipher.update(ciphertext), decipher.final()])
  // Returns raw .cube file contents — never written to disk
}
```

### ASAR Integrity Check

```typescript
// Run before anything else in main process
async function verifyIntegrity() {
  if (process.env.NODE_ENV === 'development') return
  const asarPath = path.join(process.resourcesPath, 'app.asar')
  const hash = await hashFileSHA256(asarPath)
  const expected = process.env.EXPECTED_ASAR_HASH  // injected at build time by script
  if (hash !== expected) {
    dialog.showErrorBox('Integrity Error', 'Application files have been modified.')
    app.quit()
  }
}
```

### Steganographic Watermark

```typescript
function embedWatermark(imageData: ImageData, userId: string): ImageData {
  const hash = crypto.createHash('md5').update(userId).digest('hex')
  const bits = hexToBits(hash)  // 128 bits

  for (let i = 0; i < bits.length; i++) {
    const pixelIndex = (i * 97) % (imageData.width * imageData.height)
    const byteIndex = pixelIndex * 4 + 2  // blue channel LSB
    imageData.data[byteIndex] = (imageData.data[byteIndex] & 0xFE) | bits[i]
  }
  return imageData
}
```

---

## ML Models — Full Details

### ONNX Runtime Session Factory

```typescript
async function createSession(modelPath: string): Promise<ort.InferenceSession> {
  const providers: ort.InferenceSession.ExecutionProviderOption[] = []
  if (process.platform === 'darwin') providers.push({ name: 'CoreMLExecutionProvider', coreml_flags: 1 })
  if (await hasCUDA()) providers.push('CUDAExecutionProvider')
  if (process.platform === 'win32') providers.push('DmlExecutionProvider')
  providers.push('CPUExecutionProvider')
  return ort.InferenceSession.create(modelPath, { executionProviders: providers })
}
```

### Model Reference

| Model | File | Size | Load | Purpose |
|---|---|---|---|---|
| RMBG-1.4 | rmbg.onnx | 170MB | Lazy | Background removal |
| Real-ESRGAN x4plus | realesrgan.onnx | 65MB | Lazy | 4x upscaling |
| GFPGAN v1.4 | gfpgan.onnx | 350MB | Lazy | Face restoration |
| MobileSAM encoder | mobile_sam_encoder.onnx | 35MB | Lazy | Region selection (heavy) |
| MobileSAM decoder | mobile_sam_decoder.onnx | 5MB | Lazy | Region selection (fast) |
| MediaPipe Seg | mediapipe_seg.onnx | 8MB | Eager | Auto sky/person mask |
| **Total** | | **633MB** | | All outside ASAR |

All models are pretrained open-source. No model training needed at v1.

### Background Removal (RMBG-1.4)

```typescript
async function removeBackground(imageBuffer: Buffer): Promise<Buffer> {
  const session = await getOrLoadSession('rmbg.onnx')
  const { data, info } = await sharp(imageBuffer).resize(1024, 1024).removeAlpha().raw().toBuffer({ resolveWithObject: true })

  const float32 = new Float32Array(3 * 1024 * 1024)
  const mean = [0.485, 0.456, 0.406]; const std = [0.229, 0.224, 0.225]

  for (let i = 0; i < 1024 * 1024; i++) {
    float32[i]                  = (data[i * 3]     / 255 - mean[0]) / std[0]
    float32[i + 1024 * 1024]   = (data[i * 3 + 1] / 255 - mean[1]) / std[1]
    float32[i + 2*1024*1024]   = (data[i * 3 + 2] / 255 - mean[2]) / std[2]
  }

  const output = await session.run({ input: new ort.Tensor('float32', float32, [1, 3, 1024, 1024]) })
  return applyAlphaMask(imageBuffer, output.output.data as Float32Array)
}
```

### AI Upscaling (Real-ESRGAN — Tiled)

```typescript
async function upscaleImage(imageBuffer: Buffer): Promise<Buffer> {
  const session = await getOrLoadSession('realesrgan.onnx')
  const TILE = 512; const OVERLAP = 16
  const { data, info } = await sharp(imageBuffer).raw().toBuffer({ resolveWithObject: true })
  const outputBuffer = new Uint8Array(info.width * 4 * info.height * 4 * 3)

  for (let y = 0; y < info.height; y += TILE - OVERLAP) {
    for (let x = 0; x < info.width; x += TILE - OVERLAP) {
      const tile = extractTile(data, info, x, y, TILE)
      const upscaled = await runESRGAN(session, tile)
      compositeTile(outputBuffer, upscaled, x * 4, y * 4, info.width * 4)
    }
  }

  return sharp(outputBuffer, { raw: { width: info.width * 4, height: info.height * 4, channels: 3 } })
    .jpeg({ quality: 95 }).toBuffer()
}
```

---

## IPC Interface (Preload → Main)

```typescript
// electron/preload/index.ts
const api = {
  file: {
    open: () => ipcRenderer.invoke('file:open'),
    openMultiple: () => ipcRenderer.invoke('file:openMultiple'),
  },
  export: {
    save: (opts: ExportOptions) => ipcRenderer.invoke('export:save', opts),
    saveTemplate: (opts: TemplateExportOptions) => ipcRenderer.invoke('export:saveTemplate', opts),
  },
  assets: {
    loadLUT: (id: string) => ipcRenderer.invoke('assets:loadLUT', id),
    loadTexture: (id: string) => ipcRenderer.invoke('assets:loadTexture', id),
    loadTemplate: (id: string) => ipcRenderer.invoke('assets:loadTemplate', id),
    listTemplates: () => ipcRenderer.invoke('assets:listTemplates'),
    downloadPack: (packId: string) => ipcRenderer.invoke('assets:downloadPack', packId),
  },
  ml: {
    removeBackground: (buf: ArrayBuffer) => ipcRenderer.invoke('ml:removeBg', buf),
    upscale: (buf: ArrayBuffer) => ipcRenderer.invoke('ml:upscale', buf),
    enhanceFace: (buf: ArrayBuffer) => ipcRenderer.invoke('ml:enhanceFace', buf),
    encodeForSAM: (buf: ArrayBuffer) => ipcRenderer.invoke('ml:samEncode', buf),
    getMask: (x: number, y: number, w: number, h: number) => ipcRenderer.invoke('ml:samMask', x, y, w, h),
    autoMask: (buf: ArrayBuffer, type: 'subject' | 'sky') => ipcRenderer.invoke('ml:autoMask', buf, type),
    matchStyle: (src: ArrayBuffer, ref: ArrayBuffer) => ipcRenderer.invoke('ml:styleMatch', src, ref),
  },
  license: {
    validate: () => ipcRenderer.invoke('license:validate'),
    activate: (key: string) => ipcRenderer.invoke('license:activate', key),
    getStatus: () => ipcRenderer.invoke('license:status'),
  },
  ai: {
    captions: (params: CaptionParams) => ipcRenderer.invoke('ai:captions', params),
    hashtags: (params: HashtagParams) => ipcRenderer.invoke('ai:hashtags', params),
    generate: (prompt: string, style: string) => ipcRenderer.invoke('ai:generate', prompt, style),
  },
}

contextBridge.exposeInMainWorld('frame', api)
declare global { interface Window { frame: typeof api } }
```

---

## Edit State Data Structure

```typescript
interface EditState {
  imagePath: string
  imageWidth: number; imageHeight: number

  // Preset
  presetId: string | null
  presetIntensity: number            // 0-1

  // Light
  exposure: number                   // -5 to 5
  contrast: number                   // -100 to 100
  highlights: number                 // -100 to 100
  shadows: number                    // -100 to 100
  whites: number                     // -100 to 100
  blacks: number                     // -100 to 100

  // Color
  temperature: number                // -100 to 100
  tint: number                       // -100 to 100
  vibrance: number                   // -100 to 100
  saturation: number                 // -100 to 100

  // Detail
  sharpness: number                  // 0-100
  noiseReduction: number             // 0-100
  clarity: number                    // -100 to 100
  texture: number                    // -100 to 100

  // Pro: Curves
  curves: {
    rgb: CurvePoint[]
    red: CurvePoint[]
    green: CurvePoint[]
    blue: CurvePoint[]
  }

  // Pro: HSL
  hsl: Record<HueRange, { hue: number; saturation: number; luminance: number }>

  // Pro: Color Grading
  grading: {
    shadows: { hue: number; saturation: number; luma: number }
    midtones: { hue: number; saturation: number; luma: number }
    highlights: { hue: number; saturation: number; luma: number }
    blending: number; balance: number
  }

  // Effects
  grain: { type: 'fine'|'medium'|'coarse'|'film'; intensity: number; size: number; mono: boolean }
  vignette: { shape: 'oval'|'rect'; strength: number; feather: number; midpoint: number }
  halation: { color: string; radius: number; threshold: number; intensity: number }
  chromaticAberration: { amount: number }
  bloom: { threshold: number; intensity: number; character: 'soft'|'hard' }
  lensDistortion: { amount: number }
  lightLeak: { textureId: string | null; color: string; position: [number,number]; intensity: number }
  dustScratches: { textureId: string | null; opacity: number; blendMode: BlendMode }
  border: { type: string | null; color: string; width: number; cornerRadius: number }

  // Text layers
  textLayers: TextLayer[]

  // History (Immer-managed)
  history: Omit<EditState, 'history' | 'historyIndex'>[]
  historyIndex: number
}

type HueRange = 'red'|'orange'|'yellow'|'green'|'aqua'|'blue'|'purple'|'magenta'
interface CurvePoint { x: number; y: number }  // 0-1 normalized
```

---

## Build Configuration

### electron-vite Config

```typescript
// electron.vite.config.ts
import { defineConfig } from 'electron-vite'
import react from '@vitejs/plugin-react'
import tailwindcss from 'tailwindcss'

export default defineConfig({
  main: {
    build: {
      rollupOptions: { external: ['onnxruntime-node', 'sharp', 'node-machine-id'] }
    }
  },
  preload: { build: { rollupOptions: { output: { format: 'cjs' } } } },
  renderer: {
    plugins: [react()],
    css: { postcss: { plugins: [tailwindcss()] } }
  }
})
```

### electron-builder Config

```json
{
  "appId": "co.frameapp.desktop",
  "productName": "Frescava",
  "directories": { "output": "dist-electron" },
  "files": ["dist/**/*", "models/**/*", "assets/**/*", "templates/**/*", "native/frame_native.node"],
  "asarUnpack": ["models/**/*"],
  "mac": {
    "target": [{ "target": "dmg", "arch": ["arm64", "x64"] }],
    "category": "public.app-category.photography",
    "hardenedRuntime": true,
    "gatekeeperAssess": false
  },
  "win": {
    "target": ["nsis"]
  },
  "publish": {
    "provider": "github",
    "owner": "your-username",
    "repo": "Frescava-releases"
  }
}
```

Note: `asarUnpack` for models is required — ONNX Runtime cannot read files from inside ASAR archives. Build for both `arm64` and `x64` on Mac from day one (zero extra cost, native performance on Apple Silicon).

### Pre-Build Script Order

```bash
# 1. Build Rust native module
cd native && cargo build --release
cp target/release/frame_native.node ../dist/

# 2. Build app
npm run build

# 3. Compute ASAR hash, inject into binary
node scripts/inject-integrity-hash.js

# 4. Obfuscate renderer JS
npx javascript-obfuscator dist/renderer --output dist/renderer-obfuscated \
  --compact true \
  --control-flow-flattening true \
  --string-encryption true \
  --self-defending true

# 5. Package
npm run dist
```

---

## Performance Targets

| Operation | Target | Notes |
|---|---|---|
| Slider move → preview | < 16ms | 60fps, GPU-bound |
| Preset click → preview | < 50ms | LUT already on GPU |
| Template text edit → update | < 16ms | Konva batchDraw |
| Background removal | < 3s CPU / < 1s GPU | RMBG-1.4 at 1024px |
| AI upscale (12MP) | < 15s CPU / < 4s GPU | Tiled processing |
| Face enhancement | < 5s | GFPGAN |
| Export 24MP JPEG | < 4s | Sharp + mozjpeg |
| App cold start | < 3s | Models load lazily |
| License validate (cached) | < 5ms | 24h local cache |

---

## Environment Variables

```bash
# .env — never committed, never shipped in app

# Supabase
SUPABASE_URL=https://[project].supabase.co
SUPABASE_ANON_KEY=eyJ...            # safe to expose (RLS enforces security)
SUPABASE_SERVICE_ROLE_KEY=eyJ...    # server-side only, NEVER in client

# Payment
LEMON_SQUEEZY_API_KEY=...
LEMON_SQUEEZY_WEBHOOK_SECRET=...    # for HMAC verification

# AI (server-side only — in Supabase Edge Function env, never client)
ANTHROPIC_API_KEY=sk-ant-...
REPLICATE_API_KEY=r8_...

# Distribution
GITHUB_TOKEN=...                    # for electron-updater releases

# Social (v1.5)
INSTAGRAM_CLIENT_ID=...
INSTAGRAM_CLIENT_SECRET=...

# Security
EXPECTED_ASAR_HASH=...              # injected at build time, not in .env
```

All AI API keys live only in Supabase Edge Function environment variables — never in the Electron app bundle.

---

## Key Third-Party Licenses

| Library / Model | License | Notes |
|---|---|---|
| Electron | MIT | ✅ |
| React, React Flow | MIT | ✅ |
| Konva.js | MIT | ✅ |
| Sharp | Apache 2.0 | ✅ |
| onnxruntime-node | MIT | ✅ |
| Framer Motion | MIT | ✅ |
| Zustand, Immer | MIT | ✅ |
| RMBG-1.4 model | BRIA AI ToS | ⚠️ Review commercial terms before launch |
| Real-ESRGAN model | BSD 3-Clause | ✅ |
| GFPGAN model | Apache 2.0 | ✅ |
| MobileSAM model | Apache 2.0 | ✅ |
| MediaPipe models | Apache 2.0 | ✅ |
| Google Fonts | SIL OFL (most) | ✅ Review per font used |
| Lemon Squeezy | Commercial ToS | ✅ Standard SaaS |

---

## Development Setup

```bash
# Prerequisites
node >= 20
rust >= 1.75    # for native module
python >= 3.10  # optional, for HALD CLUT scripts

# Install dependencies
npm install

# Build Rust native module
cd native && cargo build --release && cd ..

# Download ML models (first time setup)
npm run download-models

# Start dev server (Electron + HMR)
npm run dev

# Production build
npm run build

# Package for distribution
npm run dist
```
