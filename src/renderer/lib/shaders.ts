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

// ─── Overlay (Dust & Scratches, Light Leaks, Borders) ───────────────────────────

export const OVERLAY_FRAG = /* glsl */`#version 300 es
precision mediump float;
uniform sampler2D u_image;
uniform sampler2D u_overlay;
in vec2 v_texCoord;
out vec4 fragColor;

uniform float u_opacity;     // 0..1
uniform int   u_blendMode;   // 0=screen, 1=multiply, 2=overlay, 3=add, 4=normal
uniform vec3  u_tintColor;   // RGB
uniform float u_tintStrength;// 0..1
uniform vec2  u_offset;      // UV scroll

// Branchless blending helpers
vec3 blendScreen(vec3 base, vec3 blend) {
  return 1.0 - (1.0 - base) * (1.0 - blend);
}
vec3 blendMultiply(vec3 base, vec3 blend) {
  return base * blend;
}
vec3 blendOverlay(vec3 base, vec3 blend) {
  vec3 res;
  res.r = base.r < 0.5 ? (2.0 * base.r * blend.r) : (1.0 - 2.0 * (1.0 - base.r) * (1.0 - blend.r));
  res.g = base.g < 0.5 ? (2.0 * base.g * blend.g) : (1.0 - 2.0 * (1.0 - base.g) * (1.0 - blend.g));
  res.b = base.b < 0.5 ? (2.0 * base.b * blend.b) : (1.0 - 2.0 * (1.0 - base.b) * (1.0 - blend.b));
  return res;
}
vec3 blendAdd(vec3 base, vec3 blend) {
  return min(base + blend, vec3(1.0));
}

void main() {
  vec4 baseColor = texture(u_image, v_texCoord);
  vec2 uvO = fract(v_texCoord + u_offset);
  vec4 overlayColor = texture(u_overlay, uvO);
  
  if (overlayColor.a < 0.001 || u_opacity < 0.001) {
    fragColor = baseColor;
    return;
  }

  // Tinting
  vec3 oColor = mix(overlayColor.rgb, u_tintColor * overlayColor.rgb, u_tintStrength);

  // Blending
  vec3 blended;
  if (u_blendMode == 0) {
    blended = blendScreen(baseColor.rgb, oColor);
  } else if (u_blendMode == 1) {
    blended = blendMultiply(baseColor.rgb, oColor);
  } else if (u_blendMode == 2) {
    blended = blendOverlay(baseColor.rgb, oColor);
  } else if (u_blendMode == 3) {
    blended = blendAdd(baseColor.rgb, oColor);
  } else {
    blended = mix(baseColor.rgb, oColor, overlayColor.a);
  }

  // Master opacity
  vec3 finalColor = mix(baseColor.rgb, blended, u_opacity * overlayColor.a);
  
  fragColor = vec4(finalColor, baseColor.a);
}
`

// ─── Fade / Matte ──────────────────────────────────────────────────────────────────
// Maps [0,1] pixel range to [blackLift, whiteCeiling] to create a filmic matte.

export const FADE_FRAG = /* glsl */`#version 300 es
precision mediump float;
uniform sampler2D u_image;
in vec2 v_texCoord;
out vec4 fragColor;

uniform float u_blackLift;    // 0..0.3
uniform float u_whiteCeiling; // 0.7..1.0

void main() {
  vec4 color = texture(u_image, v_texCoord);
  // Remap each channel: output = blackLift + input * (whiteCeiling - blackLift)
  vec3 faded = u_blackLift + color.rgb * (u_whiteCeiling - u_blackLift);
  fragColor = vec4(faded, color.a);
}
`

// ─── Adjustments pass ────────────────────────────────────────────────────────
// Exposure, contrast, highlights, shadows, whites, blacks, temp, tint, vibrance, saturation

export const ADJUSTMENTS_FRAG = /* glsl */`#version 300 es
precision highp float;
uniform sampler2D u_image;
in vec2 v_texCoord;
out vec4 fragColor;

// ── Adjustment uniforms ──
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

// ── Detail uniforms ──
uniform float u_sharpness;     // 0..1
uniform float u_clarity;       // -1..1
uniform float u_texture;       // -1..1
uniform float u_noiseReduction;// 0..1
uniform vec2  u_texelSize;     // 1/width, 1/height

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

  // ── Detail processing (requires texelSize uniforms) ──────────────────────
  
  // 3×3 luminosity-weighted Noise Reduction (simple box blur in shadow regions)
  if (u_noiseReduction > 0.001) {
    vec3 blurred = vec3(0.0);
    float wTotal = 0.0;
    for (int dy = -1; dy <= 1; dy++) {
      for (int dx = -1; dx <= 1; dx++) {
        vec2 offset = vec2(float(dx), float(dy)) * u_texelSize;
        vec3 s = texture(u_image, v_texCoord + offset).rgb;
        float w = 1.0 - float(abs(dx) + abs(dy)) * 0.15;
        blurred += s * w;
        wTotal  += w;
      }
    }
    blurred /= wTotal;
    // Apply NR only in shadowed regions — bright areas stay sharp
    vec3 hslNR = rgbToHsl(rgb);
    float shadowMask = 1.0 - smoothstep(0.0, 0.55, hslNR.z);
    rgb = mix(rgb, blurred, u_noiseReduction * shadowMask * 0.75);
  }

  // Sharpness — Laplacian unsharp mask
  if (u_sharpness > 0.001) {
    vec3 center = rgb;
    vec3 neighbors = vec3(0.0);
    neighbors += texture(u_image, v_texCoord + vec2( u_texelSize.x, 0.0)).rgb;
    neighbors += texture(u_image, v_texCoord + vec2(-u_texelSize.x, 0.0)).rgb;
    neighbors += texture(u_image, v_texCoord + vec2(0.0,  u_texelSize.y)).rgb;
    neighbors += texture(u_image, v_texCoord + vec2(0.0, -u_texelSize.y)).rgb;
    vec3 edge = center - neighbors * 0.25;
    rgb = clamp(rgb + edge * u_sharpness * 1.8, 0.0, 1.0);
  }

  // Texture — fine detail boost (smaller radius than clarity)
  if (abs(u_texture) > 0.001) {
    vec3 fine = vec3(0.0);
    for (int dy = -1; dy <= 1; dy++) {
      for (int dx = -1; dx <= 1; dx++) {
        fine += texture(u_image, v_texCoord + vec2(float(dx), float(dy)) * u_texelSize * 0.8).rgb;
      }
    }
    fine /= 9.0;
    vec3 fineDetail = rgb - fine;
    rgb = clamp(rgb + fineDetail * u_texture * 1.4, 0.0, 1.0);
  }

  // Clarity — local contrast boost via large-radius unsharp mask
  if (abs(u_clarity) > 0.001) {
    vec3 blurC = vec3(0.0);
    float wC = 0.0;
    for (int dy = -2; dy <= 2; dy++) {
      for (int dx = -2; dx <= 2; dx++) {
        vec2 off = vec2(float(dx), float(dy)) * u_texelSize * 3.0;
        float ww = exp(-float(dx*dx + dy*dy) * 0.18);
        blurC += texture(u_image, v_texCoord + off).rgb * ww;
        wC    += ww;
      }
    }
    blurC /= wC;
    vec3 clarityDetail = rgb - blurC;
    // Only boost midtones (mask out highlights to avoid blown-out look)
    vec3 hslC = rgbToHsl(rgb);
    float midMask = smoothstep(0.1, 0.5, hslC.z) * (1.0 - smoothstep(0.5, 0.9, hslC.z));
    rgb = clamp(rgb + clarityDetail * u_clarity * midMask * 2.0, 0.0, 1.0);
  }

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

// ─── Grain shader — smooth value noise with luminosity masking ───────────────

export const GRAIN_FRAG = /* glsl */`#version 300 es
precision highp float;
uniform sampler2D u_image;
in vec2 v_texCoord;
out vec4 fragColor;

uniform float u_intensity;          // 0..1
uniform float u_size;               // 0..2
uniform float u_seed;               // per-frame jitter
uniform int   u_type;               // 0=fine, 1=medium, 2=coarse, 3=film
uniform float u_roughness;          // 0..1  uneven amplitude variation
uniform int   u_luminosityMode;     // 1=luminosity only (preserve chroma)
uniform float u_highlightReduction; // 0..1  reduce grain in bright areas

// Smooth value noise helpers
vec2 hash2(vec2 p) {
  p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)));
  return -1.0 + 2.0 * fract(sin(p) * 43758.5453);
}

float valueNoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  // Smooth quintic interpolation
  vec2 u = f * f * f * (f * (f * 6.0 - 15.0) + 10.0);
  float a = dot(hash2(i + vec2(0.0, 0.0)), f - vec2(0.0, 0.0));
  float b = dot(hash2(i + vec2(1.0, 0.0)), f - vec2(1.0, 0.0));
  float c = dot(hash2(i + vec2(0.0, 1.0)), f - vec2(0.0, 1.0));
  float d = dot(hash2(i + vec2(1.0, 1.0)), f - vec2(1.0, 1.0));
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}

float multiOctaveNoise(vec2 p) {
  float v = 0.0;
  float amp = 0.5;
  for (int i = 0; i < 3; i++) {
    v += valueNoise(p) * amp;
    p  = p * 2.1 + vec2(31.4, 17.3);
    amp *= 0.45;
  }
  return v;
}

void main() {
  vec4 color = texture(u_image, v_texCoord);

  // Frequency based on type
  float freq;
  if      (u_type == 0) freq = 800.0 + u_size * 400.0;  // fine
  else if (u_type == 1) freq = 450.0 + u_size * 250.0;  // medium
  else if (u_type == 2) freq = 200.0 + u_size * 150.0;  // coarse
  else                  freq = 600.0 + u_size * 300.0;  // film (fine but layered)

  vec2 noiseUV = v_texCoord * freq + u_seed * 73.1;

  float noise;
  if (u_type == 3) {
    // Film: two slightly offset layers for organic character
    noise = multiOctaveNoise(noiseUV) * 0.65
          + multiOctaveNoise(noiseUV * 0.5 + vec2(13.7, 9.4)) * 0.35;
  } else {
    noise = multiOctaveNoise(noiseUV);
  }

  // ── Luminosity mask ───────────────────────────────────────────────────────
  float lum = dot(color.rgb, vec3(0.2126, 0.7152, 0.0722));
  float lumMask = smoothstep(0.9, 0.5, lum) * 0.6
                + smoothstep(0.0, 0.3, lum) * 0.4;
  // Highlight reduction: scale the mask down sharply in bright areas
  lumMask *= mix(1.0, smoothstep(1.0, 0.5, lum), u_highlightReduction);
  lumMask = clamp(lumMask, 0.1, 1.0);

  // ── Roughness: spatially modulate amplitude via low-freq noise ────────────
  float roughNoise = multiOctaveNoise(v_texCoord * 3.0 + vec2(77.3, 33.1)) * 0.5 + 0.5;
  float amplitudeScale = mix(1.0, roughNoise, u_roughness);

  float grainAmount = noise * u_intensity * 0.22 * lumMask * amplitudeScale;

  // ── Apply ────────────────────────────────────────────────────────────────
  vec3 result;
  if (u_luminosityMode == 1) {
    // Luminosity blend: add grain to the Y channel in YCbCr space,
    // then convert back. Approximated via equal-weight shift then reproject.
    float Y = dot(color.rgb, vec3(0.2126, 0.7152, 0.0722));
    float newY = clamp(Y + grainAmount, 0.0, 1.0);
    float scale = (Y > 0.001) ? newY / Y : 1.0;
    result = clamp(color.rgb * scale, 0.0, 1.0);
  } else {
    vec3 grainColor = vec3(1.0);
    if (u_type == 3) grainColor = vec3(1.02, 0.99, 0.97); // warm Kodak tint
    result = clamp(color.rgb + grainAmount * grainColor, 0.0, 1.0);
  }

  fragColor = vec4(result, color.a);
}
`

// ─── Vignette ────────────────────────────────────────────────────────────────

export const VIGNETTE_FRAG = /* glsl */`#version 300 es
precision mediump float;
uniform sampler2D u_image;
in vec2 v_texCoord;
out vec4 fragColor;

uniform float u_strength;      // 0..1
uniform float u_feather;       // 0..1
uniform float u_midpoint;      // 0.3..1.0
uniform int   u_shape;         // 0=oval, 1=rect
uniform float u_aspectRatio;   // width/height
uniform float u_exposureShift; // -1..0  optional extra darkening at edges

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
  // Exposure-based darkening (more physically accurate than linear multiply)
  float stops = vgn * u_strength * (1.0 + u_exposureShift * (-1.0));
  float exposure = pow(2.0, -stops * 2.0);

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

// ─── Detail — Lens blur: mix sharp (adjustment pass) with separable Gaussian defocus
export const LENS_BLUR_COMPOSITE_FRAG = /* glsl */`#version 300 es
precision mediump float;
uniform sampler2D u_sharp;
uniform sampler2D u_blur;
in vec2 v_texCoord;
out vec4 fragColor;

/** 0 = sharp, 1 = full defocus (already paired with matching blur pass radius in JS) */
uniform float u_strength;

void main() {
  vec4 s = texture(u_sharp, v_texCoord);
  vec4 b = texture(u_blur, v_texCoord);
  vec3 c = mix(s.rgb, b.rgb, clamp(u_strength, 0.0, 1.0));
  fragColor = vec4(c, s.a);
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

uniform float u_amount;       // 0..20
uniform int   u_radialFalloff; // 1=stronger at corners

void main() {
  vec2 uv = v_texCoord;
  vec2 center = vec2(0.5);
  vec2 direction = uv - center;
  float dist = length(direction);
  // With radialFalloff, aberration is proportional to distance^1.5 (more realistic)
  float power = (u_radialFalloff == 1) ? dist * dist : dist;
  vec2 offset = direction * u_amount * 0.008 * power;

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

