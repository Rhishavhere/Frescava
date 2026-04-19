// ─── Shared vertex shader (fullscreen quad) ───────────────────────────────────

export const VERT_SHADER = /* glsl */`#version 300 es
in vec2 a_position;
out vec2 v_texCoord;

void main() {
  gl_Position = vec4(a_position, 0.0, 1.0);
  v_texCoord = a_position * 0.5 + 0.5;
}
`

// ─── Identity / pass-through ──────────────────────────────────────────────────

export const PASSTHROUGH_FRAG = /* glsl */`#version 300 es
precision mediump float;
uniform sampler2D u_image;
in vec2 v_texCoord;
out vec4 fragColor;

void main() {
  fragColor = texture(u_image, v_texCoord);
}
`

// ─── Adjustments pass ────────────────────────────────────────────────────────
// Exposure, contrast, highlights, shadows, whites, blacks, temp, tint, vibrance, saturation

export const ADJUSTMENTS_FRAG = /* glsl */`#version 300 es
precision highp float;
uniform sampler2D u_image;
in vec2 v_texCoord;
out vec4 fragColor;

// Adjustment uniforms (-1 to 1 normalized unless specified)
uniform float u_exposure;      // -5..5 stops
uniform float u_contrast;      // -1..1
uniform float u_highlights;    // -1..1
uniform float u_shadows;       // -1..1
uniform float u_whites;        // -1..1
uniform float u_blacks;        // -1..1
uniform float u_temperature;   // -1..1
uniform float u_tint;          // -1..1
uniform float u_vibrance;      // -1..1
uniform float u_saturation;    // -1..1

// sRGB <-> linear helpers
float srgbToLinear(float v) {
  return v <= 0.04045 ? v / 12.92 : pow((v + 0.055) / 1.055, 2.4);
}
float linearToSrgb(float v) {
  return v <= 0.0031308 ? v * 12.92 : 1.055 * pow(v, 1.0 / 2.4) - 0.055;
}
vec3 srgbToLinear3(vec3 c) {
  return vec3(srgbToLinear(c.r), srgbToLinear(c.g), srgbToLinear(c.b));
}
vec3 linearToSrgb3(vec3 c) {
  return vec3(linearToSrgb(c.r), linearToSrgb(c.g), linearToSrgb(c.b));
}

// RGB <-> HSL
vec3 rgbToHsl(vec3 rgb) {
  float maxC = max(rgb.r, max(rgb.g, rgb.b));
  float minC = min(rgb.r, min(rgb.g, rgb.b));
  float delta = maxC - minC;
  float l = (maxC + minC) * 0.5;
  float s = delta < 0.0001 ? 0.0 : delta / (1.0 - abs(2.0 * l - 1.0));
  float h = 0.0;
  if (delta > 0.0001) {
    if (maxC == rgb.r) h = mod((rgb.g - rgb.b) / delta, 6.0);
    else if (maxC == rgb.g) h = (rgb.b - rgb.r) / delta + 2.0;
    else h = (rgb.r - rgb.g) / delta + 4.0;
    h /= 6.0;
    if (h < 0.0) h += 1.0;
  }
  return vec3(h, s, l);
}

float hue2rgb(float p, float q, float t) {
  if (t < 0.0) t += 1.0;
  if (t > 1.0) t -= 1.0;
  if (t < 1.0/6.0) return p + (q - p) * 6.0 * t;
  if (t < 1.0/2.0) return q;
  if (t < 2.0/3.0) return p + (q - p) * (2.0/3.0 - t) * 6.0;
  return p;
}

vec3 hslToRgb(vec3 hsl) {
  float h = hsl.x, s = hsl.y, l = hsl.z;
  if (s < 0.0001) return vec3(l);
  float q = l < 0.5 ? l * (1.0 + s) : l + s - l * s;
  float p = 2.0 * l - q;
  return vec3(hue2rgb(p, q, h + 1.0/3.0), hue2rgb(p, q, h), hue2rgb(p, q, h - 1.0/3.0));
}

// Highlights/shadows compressed S-curve (affects only bright/dark regions)
float applyHighlights(float l, float amount) {
  // amount: -1=reduce, +1=boost. Only affects luminance > 0.5
  float mask = smoothstep(0.4, 1.0, l);
  return l + amount * 0.5 * mask;
}

float applyShadows(float l, float amount) {
  // Only affects luminance < 0.5
  float mask = 1.0 - smoothstep(0.0, 0.6, l);
  return l + amount * 0.5 * mask;
}

float applyWhites(float l, float amount) {
  float mask = smoothstep(0.7, 1.0, l);
  return l + amount * 0.3 * mask;
}

float applyBlacks(float l, float amount) {
  float mask = 1.0 - smoothstep(0.0, 0.3, l);
  return l + amount * 0.3 * mask;
}

void main() {
  vec4 color = texture(u_image, v_texCoord);
  vec3 rgb = color.rgb;

  // Convert to linear for proper exposure math
  vec3 lin = srgbToLinear3(rgb);

  // Exposure (in stops)
  lin *= pow(2.0, u_exposure);

  // Contrast (applied in log space around 0.5)
  lin = clamp(lin, 0.0001, 1.0);
  float contrastMid = 0.18; // photographic mid-tone anchor
  lin = (lin - contrastMid) * (1.0 + u_contrast * 0.7) + contrastMid;
  lin = clamp(lin, 0.0, 1.0);

  // Back to sRGB for tonal operations
  rgb = linearToSrgb3(lin);
  rgb = clamp(rgb, 0.0, 1.0);

  // HSL tonal adjustments
  vec3 hsl = rgbToHsl(rgb);
  hsl.z = applyHighlights(hsl.z, u_highlights);
  hsl.z = applyShadows(hsl.z, u_shadows);
  hsl.z = applyWhites(hsl.z, u_whites);
  hsl.z = applyBlacks(hsl.z, u_blacks);
  hsl.z = clamp(hsl.z, 0.0, 1.0);
  rgb = hslToRgb(hsl);

  // Temperature (warm/cool shift: red+yellow vs blue)
  rgb.r = clamp(rgb.r + u_temperature * 0.12, 0.0, 1.0);
  rgb.g = clamp(rgb.g + u_temperature * 0.03, 0.0, 1.0);
  rgb.b = clamp(rgb.b - u_temperature * 0.12, 0.0, 1.0);

  // Tint (green vs magenta shift)
  rgb.r = clamp(rgb.r + u_tint * 0.05, 0.0, 1.0);
  rgb.g = clamp(rgb.g - u_tint * 0.10, 0.0, 1.0);
  rgb.b = clamp(rgb.b + u_tint * 0.05, 0.0, 1.0);

  // Saturation
  hsl = rgbToHsl(rgb);
  hsl.y = clamp(hsl.y * (1.0 + u_saturation), 0.0, 1.0);
  rgb = hslToRgb(hsl);

  // Vibrance (smart saturation — boost less-saturated colors more)
  hsl = rgbToHsl(rgb);
  float vibranceMask = 1.0 - hsl.y; // more boost on desaturated colors
  hsl.y = clamp(hsl.y + u_vibrance * vibranceMask * 0.8, 0.0, 1.0);
  rgb = hslToRgb(hsl);

  fragColor = vec4(clamp(rgb, 0.0, 1.0), color.a);
}
`

// ─── LUT apply ───────────────────────────────────────────────────────────────

export const LUT_FRAG = /* glsl */`#version 300 es
precision mediump float;
precision mediump sampler3D;
uniform sampler2D u_image;
uniform sampler3D u_lut;
uniform float u_intensity;
in vec2 v_texCoord;
out vec4 fragColor;

void main() {
  vec4 original = texture(u_image, v_texCoord);
  float lutSize = 33.0;
  float scale = (lutSize - 1.0) / lutSize;
  float offset = 1.0 / (2.0 * lutSize);
  vec3 lutCoord = original.rgb * scale + offset;
  vec4 graded = texture(u_lut, lutCoord);
  fragColor = vec4(mix(original.rgb, graded.rgb, u_intensity), original.a);
}
`

// ─── Grain shader ────────────────────────────────────────────────────────────

export const GRAIN_FRAG = /* glsl */`#version 300 es
precision highp float;
uniform sampler2D u_image;
in vec2 v_texCoord;
out vec4 fragColor;

uniform float u_intensity;   // 0..1
uniform float u_size;        // 0..1 (maps to pixel size)
uniform float u_seed;        // random seed (changes per frame if animated)
uniform int u_type;          // 0=fine, 1=medium, 2=coarse, 3=film

float hash(vec2 p) {
  p = fract(p * vec2(234.34, 435.345));
  p += dot(p, p + 34.23);
  return fract(p.x * p.y);
}

float grain(vec2 uv, float sz, float seed) {
  vec2 scaled = uv / sz + seed * 7.3;
  return hash(floor(scaled)) * 2.0 - 1.0;
}

vec3 rgbToHsl(vec3 rgb) {
  float maxC = max(rgb.r, max(rgb.g, rgb.b));
  float minC = min(rgb.r, min(rgb.g, rgb.b));
  float delta = maxC - minC;
  float l = (maxC + minC) * 0.5;
  float s = delta < 0.0001 ? 0.0 : delta / (1.0 - abs(2.0 * l - 1.0));
  float h = 0.0;
  if (delta > 0.0001) {
    if (maxC == rgb.r) h = mod((rgb.g - rgb.b) / delta, 6.0);
    else if (maxC == rgb.g) h = (rgb.b - rgb.r) / delta + 2.0;
    else h = (rgb.r - rgb.g) / delta + 4.0;
    h /= 6.0;
  }
  return vec3(h, s, l);
}
float hue2rgb(float p, float q, float t) {
  if (t < 0.0) t += 1.0; if (t > 1.0) t -= 1.0;
  if (t < 1.0/6.0) return p + (q-p)*6.0*t;
  if (t < 1.0/2.0) return q;
  if (t < 2.0/3.0) return p + (q-p)*(2.0/3.0-t)*6.0;
  return p;
}
vec3 hslToRgb(vec3 hsl) {
  float h=hsl.x,s=hsl.y,l=hsl.z;
  if (s < 0.0001) return vec3(l);
  float q = l < 0.5 ? l*(1.0+s) : l+s-l*s;
  float p = 2.0*l-q;
  return vec3(hue2rgb(p,q,h+1.0/3.0), hue2rgb(p,q,h), hue2rgb(p,q,h-1.0/3.0));
}

void main() {
  vec4 color = texture(u_image, v_texCoord);

  // Grain size in uv space
  float grainSize = 0.001 + u_size * 0.008;

  float noise;
  if (u_type == 3) {
    // Film: organic clumping (two overlapping layers)
    vec2 off = vec2(0.0013, 0.0009);
    noise = (grain(v_texCoord, grainSize, u_seed) +
              grain(v_texCoord + off, grainSize * 1.6, u_seed)) * 0.5;
  } else if (u_type == 2) {
    // Coarse: large blobs
    noise = grain(v_texCoord, grainSize * 2.5, u_seed);
  } else if (u_type == 1) {
    // Medium
    noise = grain(v_texCoord, grainSize * 1.5, u_seed);
  } else {
    // Fine
    noise = grain(v_texCoord, grainSize, u_seed);
  }

  // Apply in luminosity mode — affect brightness only, not hue/sat
  vec3 hsl = rgbToHsl(color.rgb);
  hsl.z = clamp(hsl.z + noise * u_intensity * 0.18, 0.0, 1.0);
  vec3 result = hslToRgb(hsl);

  fragColor = vec4(result, color.a);
}
`

// ─── Vignette ────────────────────────────────────────────────────────────────

export const VIGNETTE_FRAG = /* glsl */`#version 300 es
precision mediump float;
uniform sampler2D u_image;
in vec2 v_texCoord;
out vec4 fragColor;

uniform float u_strength;    // 0..1
uniform float u_feather;     // 0..1
uniform float u_midpoint;    // 0.3..1.0
uniform int u_shape;         // 0=oval, 1=rect
uniform float u_aspectRatio; // width/height

void main() {
  vec4 color = texture(u_image, v_texCoord);
  vec2 uv = v_texCoord - vec2(0.5);

  float dist;
  if (u_shape == 0) {
    uv.x *= u_aspectRatio;
    dist = length(uv);
  } else {
    dist = max(abs(uv.x * u_aspectRatio), abs(uv.y));
  }

  float edge0 = u_midpoint * 0.5;
  float edge1 = edge0 + u_feather * 0.4 + 0.05;
  float vgn = smoothstep(edge0, edge1, dist);
  float exposure = 1.0 - vgn * u_strength;

  fragColor = vec4(color.rgb * exposure, color.a);
}
`

// ─── Halation — Pass 1: extraction ───────────────────────────────────────────

export const HALATION_EXTRACT_FRAG = /* glsl */`#version 300 es
precision mediump float;
uniform sampler2D u_image;
in vec2 v_texCoord;
out vec4 fragColor;

uniform float u_threshold;   // 0.5..1.0
uniform vec3 u_color;        // warm tint

void main() {
  vec4 color = texture(u_image, v_texCoord);
  float lum = dot(color.rgb, vec3(0.2126, 0.7152, 0.0722));
  float highlight = smoothstep(u_threshold - 0.08, u_threshold + 0.08, lum);
  fragColor = vec4(color.rgb * u_color * highlight, 1.0);
}
`

// ─── Halation — Pass 2: separable Gaussian blur ───────────────────────────────

export const BLUR_H_FRAG = /* glsl */`#version 300 es
precision mediump float;
uniform sampler2D u_image;
in vec2 v_texCoord;
out vec4 fragColor;

uniform float u_radius;
uniform vec2 u_texelSize;

void main() {
  vec4 sum = vec4(0.0);
  float total = 0.0;
  int r = int(clamp(u_radius, 1.0, 32.0));
  for (int i = -r; i <= r; i++) {
    float w = exp(-float(i*i) / (2.0 * u_radius * u_radius * 0.25));
    sum += texture(u_image, v_texCoord + vec2(float(i) * u_texelSize.x, 0.0)) * w;
    total += w;
  }
  fragColor = sum / total;
}
`

export const BLUR_V_FRAG = /* glsl */`#version 300 es
precision mediump float;
uniform sampler2D u_image;
in vec2 v_texCoord;
out vec4 fragColor;

uniform float u_radius;
uniform vec2 u_texelSize;

void main() {
  vec4 sum = vec4(0.0);
  float total = 0.0;
  int r = int(clamp(u_radius, 1.0, 32.0));
  for (int i = -r; i <= r; i++) {
    float w = exp(-float(i*i) / (2.0 * u_radius * u_radius * 0.25));
    sum += texture(u_image, v_texCoord + vec2(0.0, float(i) * u_texelSize.y)) * w;
    total += w;
  }
  fragColor = sum / total;
}
`

// ─── Halation — Pass 3: screen composite ─────────────────────────────────────

export const HALATION_COMPOSITE_FRAG = /* glsl */`#version 300 es
precision mediump float;
uniform sampler2D u_image;
uniform sampler2D u_halation;
in vec2 v_texCoord;
out vec4 fragColor;

uniform float u_intensity;

void main() {
  vec4 base = texture(u_image, v_texCoord);
  vec4 glow = texture(u_halation, v_texCoord);
  // Screen blend: brightens without clipping
  vec3 screen = 1.0 - (1.0 - base.rgb) * (1.0 - glow.rgb * u_intensity);
  fragColor = vec4(screen, base.a);
}
`

// ─── Chromatic Aberration ────────────────────────────────────────────────────

export const CA_FRAG = /* glsl */`#version 300 es
precision mediump float;
uniform sampler2D u_image;
in vec2 v_texCoord;
out vec4 fragColor;

uniform float u_amount;

void main() {
  vec2 uv = v_texCoord;
  vec2 center = vec2(0.5);
  vec2 direction = uv - center;
  float dist = length(direction);
  vec2 offset = direction * u_amount * 0.008 * dist;

  float r = texture(u_image, uv + offset).r;
  float g = texture(u_image, uv).g;
  float b = texture(u_image, uv - offset).b;
  float a = texture(u_image, uv).a;
  fragColor = vec4(r, g, b, a);
}
`

// ─── Lens Distortion ─────────────────────────────────────────────────────────

export const LENS_DIST_FRAG = /* glsl */`#version 300 es
precision mediump float;
uniform sampler2D u_image;
in vec2 v_texCoord;
out vec4 fragColor;

uniform float u_amount;      // -1 (barrel) .. +1 (pincushion)
uniform float u_aspectRatio;

void main() {
  vec2 uv = v_texCoord - 0.5;
  uv.x *= u_aspectRatio;
  float r = length(uv);
  float distortion = 1.0 + u_amount * r * r;
  vec2 distorted = uv * distortion;
  distorted.x /= u_aspectRatio;
  distorted += 0.5;

  if (distorted.x < 0.0 || distorted.x > 1.0 || distorted.y < 0.0 || distorted.y > 1.0) {
    fragColor = vec4(1.0, 1.0, 1.0, 1.0); // white fill for out-of-bounds
    return;
  }
  fragColor = texture(u_image, distorted);
}
`

// ─── Overlay (light leaks, dust, borders) ────────────────────────────────────

export const OVERLAY_FRAG = /* glsl */`#version 300 es
precision mediump float;
uniform sampler2D u_image;
uniform sampler2D u_overlay;
in vec2 v_texCoord;
out vec4 fragColor;

uniform float u_opacity;
uniform int u_blendMode;  // 0=screen, 1=multiply, 2=overlay, 3=add
uniform vec3 u_tint;
uniform vec2 u_offset;

vec3 blendScreen(vec3 a, vec3 b)    { return 1.0 - (1.0 - a) * (1.0 - b); }
vec3 blendMultiply(vec3 a, vec3 b)  { return a * b; }
vec3 blendOverlay(vec3 a, vec3 b)   { return mix(2.0*a*b, 1.0-2.0*(1.0-a)*(1.0-b), step(0.5, a)); }

void main() {
  vec4 base = texture(u_image, v_texCoord);
  vec4 ov = texture(u_overlay, fract(v_texCoord + u_offset));
  vec3 tinted = ov.rgb * u_tint;

  vec3 blended;
  if (u_blendMode == 0) blended = blendScreen(base.rgb, tinted);
  else if (u_blendMode == 1) blended = blendMultiply(base.rgb, tinted);
  else if (u_blendMode == 2) blended = blendOverlay(base.rgb, tinted);
  else blended = base.rgb + tinted;

  float finalAlpha = ov.a * u_opacity;
  fragColor = vec4(mix(base.rgb, blended, finalAlpha), base.a);
}
`
