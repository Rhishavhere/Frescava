import {
  VERT_SHADER,
  FADE_FRAG,
  ADJUSTMENTS_FRAG,
  LUT_FRAG,
  GRAIN_FRAG,
  VIGNETTE_FRAG,
  HALATION_EXTRACT_FRAG,
  BLUR_H_FRAG,
  BLUR_V_FRAG,
  LENS_BLUR_COMPOSITE_FRAG,
  HALATION_COMPOSITE_FRAG,
  CA_FRAG,
  LENS_DIST_FRAG,
  PASSTHROUGH_FRAG,
  OVERLAY_FRAG,
  ZOOM_BLUR_FRAG,
  TEXT_COMPOSITE_FRAG,
} from './shaders'
import type { ColorBalanceState, CurvesState, EditState, HslMixerState, SplitToningState } from '@shared/types'
import { buildCurveLutRGBA8, CURVE_LUT_WIDTH, defaultIdentityCurves } from '@shared/curveMath'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function compileShader(gl: WebGL2RenderingContext, type: number, source: string): WebGLShader {
  const shader = gl.createShader(type)!
  gl.shaderSource(shader, source)
  gl.compileShader(shader)
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const info = gl.getShaderInfoLog(shader)
    gl.deleteShader(shader)
    throw new Error(`Shader compile error:\n${info}`)
  }
  return shader
}

function createProgram(gl: WebGL2RenderingContext, fragSrc: string): WebGLProgram {
  const vert = compileShader(gl, gl.VERTEX_SHADER, VERT_SHADER)
  const frag = compileShader(gl, gl.FRAGMENT_SHADER, fragSrc)
  const prog = gl.createProgram()!
  gl.attachShader(prog, vert)
  gl.attachShader(prog, frag)
  gl.linkProgram(prog)
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
    throw new Error(`Program link error: ${gl.getProgramInfoLog(prog)}`)
  }
  gl.deleteShader(vert)
  gl.deleteShader(frag)
  return prog
}

function createFBOTexture(gl: WebGL2RenderingContext, w: number, h: number): WebGLTexture {
  const tex = gl.createTexture()!
  gl.bindTexture(gl.TEXTURE_2D, tex)
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
  return tex
}

// ─── Fullscreen quad ──────────────────────────────────────────────────────────

function setupQuad(gl: WebGL2RenderingContext, prog: WebGLProgram): WebGLVertexArrayObject {
  const vao = gl.createVertexArray()!
  gl.bindVertexArray(vao)
  const buf = gl.createBuffer()!
  gl.bindBuffer(gl.ARRAY_BUFFER, buf)
  const verts = new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1])
  gl.bufferData(gl.ARRAY_BUFFER, verts, gl.STATIC_DRAW)
  const loc = gl.getAttribLocation(prog, 'a_position')
  gl.enableVertexAttribArray(loc)
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0)
  gl.bindVertexArray(null)
  return vao
}

const DEFAULT_CURVES: CurvesState = defaultIdentityCurves()

const DEFAULT_SPLIT: SplitToningState = {
  shadows: { hue: 0, saturation: 0 },
  midtones: { hue: 0, saturation: 0 },
  highlights: { hue: 0, saturation: 0 },
}

const DEFAULT_BALANCE: ColorBalanceState = {
  shadows: { cyanRed: 0, magentaGreen: 0, yellowBlue: 0 },
  midtones: { cyanRed: 0, magentaGreen: 0, yellowBlue: 0 },
  highlights: { cyanRed: 0, magentaGreen: 0, yellowBlue: 0 },
}

const HSL_BANDS = ['red', 'orange', 'yellow', 'green', 'aqua', 'blue', 'purple', 'magenta'] as const

const DEFAULT_HSL = Object.fromEntries(
  HSL_BANDS.map(b => [b, { hue: 0, saturation: 0, luminance: 0 }])
) as HslMixerState

// ─── RenderPipeline class ─────────────────────────────────────────────────────

export class RenderPipeline {
  private gl: WebGL2RenderingContext
  private width: number
  private height: number

  // Ping-pong FBOs
  private fbos: [WebGLFramebuffer, WebGLFramebuffer]
  private fbTextures: [WebGLTexture, WebGLTexture]
  private pingPong: number = 0

  // Programs
  private progFade: WebGLProgram
  private progAdjust: WebGLProgram
  private progLUT: WebGLProgram
  private progGrain: WebGLProgram
  private progVignette: WebGLProgram
  private progHalExtract: WebGLProgram
  private progBlurH: WebGLProgram
  private progBlurV: WebGLProgram
  private progLensBlurComp: WebGLProgram
  private progHalComposite: WebGLProgram
  private progCA: WebGLProgram
  private progLensDist: WebGLProgram
  private progPassthrough: WebGLProgram
  private progOverlay: WebGLProgram
  private progZoomBlur: WebGLProgram
  private progTextComposite: WebGLProgram

  // VAOs
  private vaos: Map<WebGLProgram, WebGLVertexArrayObject> = new Map()

  // Source image texture
  private sourceTexture: WebGLTexture | null = null

  // LUT 3D texture
  private lutTexture: WebGLTexture | null = null
  private lutSize: number = 33

  // 1×CURVE_LUT_WIDTH RGBA8: master / R / G / B curve lookups.
  private curveTexture: WebGLTexture | null = null

  // Overlay textures
  private overlayTextures: Map<string, WebGLTexture> = new Map()

  // Halation intermediate texture/FBO
  private halFBO: WebGLFramebuffer | null = null
  private halTexture: WebGLTexture | null = null
  private halFBO2: WebGLFramebuffer | null = null
  private halTexture2: WebGLTexture | null = null

  // Output canvas
  private outputCanvas: HTMLCanvasElement

  constructor(canvas: HTMLCanvasElement) {
    this.outputCanvas = canvas
    const gl = canvas.getContext('webgl2', {
      antialias: false,
      preserveDrawingBuffer: true,
      premultipliedAlpha: false,
    })
    if (!gl) throw new Error('WebGL2 not supported')
    this.gl = gl
    this.width = canvas.width
    this.height = canvas.height

    // Create programs
    this.progFade = createProgram(gl, FADE_FRAG)
    this.progAdjust = createProgram(gl, ADJUSTMENTS_FRAG)
    this.progLUT = createProgram(gl, LUT_FRAG)
    this.progGrain = createProgram(gl, GRAIN_FRAG)
    this.progVignette = createProgram(gl, VIGNETTE_FRAG)
    this.progHalExtract = createProgram(gl, HALATION_EXTRACT_FRAG)
    this.progBlurH = createProgram(gl, BLUR_H_FRAG)
    this.progBlurV = createProgram(gl, BLUR_V_FRAG)
    this.progLensBlurComp = createProgram(gl, LENS_BLUR_COMPOSITE_FRAG)
    this.progHalComposite = createProgram(gl, HALATION_COMPOSITE_FRAG)
    this.progCA = createProgram(gl, CA_FRAG)
    this.progLensDist = createProgram(gl, LENS_DIST_FRAG)
    this.progPassthrough = createProgram(gl, PASSTHROUGH_FRAG)
    this.progOverlay = createProgram(gl, OVERLAY_FRAG)
    this.progZoomBlur = createProgram(gl, ZOOM_BLUR_FRAG)
    this.progTextComposite = createProgram(gl, TEXT_COMPOSITE_FRAG)

    // Setup VAOs for each program
    const programs = [
      this.progFade,
      this.progAdjust, this.progLUT, this.progGrain, this.progVignette,
      this.progHalExtract, this.progBlurH, this.progBlurV, this.progLensBlurComp, this.progHalComposite,
      this.progCA, this.progLensDist, this.progPassthrough, this.progOverlay, this.progZoomBlur,
      this.progTextComposite,
    ]
    for (const prog of programs) {
      this.vaos.set(prog, setupQuad(gl, prog))
    }

    // Ping-pong buffers
    const tex0 = createFBOTexture(gl, this.width, this.height)
    const tex1 = createFBOTexture(gl, this.width, this.height)
    const fbo0 = gl.createFramebuffer()!
    const fbo1 = gl.createFramebuffer()!
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo0)
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex0, 0)
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo1)
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex1, 0)
    gl.bindFramebuffer(gl.FRAMEBUFFER, null)
    this.fbos = [fbo0, fbo1]
    this.fbTextures = [tex0, tex1]

    // Halation intermediate buffers
    this.halTexture = createFBOTexture(gl, this.width, this.height)
    this.halFBO = gl.createFramebuffer()!
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.halFBO)
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.halTexture, 0)
    this.halTexture2 = createFBOTexture(gl, this.width, this.height)
    this.halFBO2 = gl.createFramebuffer()!
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.halFBO2)
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.halTexture2, 0)
    gl.bindFramebuffer(gl.FRAMEBUFFER, null)
  }

  // ── Load image ──────────────────────────────────────────────────────────────

  loadImage(imageData: ImageData | HTMLImageElement | ImageBitmap): void {
    const gl = this.gl
    if (this.sourceTexture) gl.deleteTexture(this.sourceTexture)
    const tex = gl.createTexture()!
    gl.bindTexture(gl.TEXTURE_2D, tex)
    
    // WebGL's origin is bottom-left. We flip the image vertically on upload so it matches native WebGL coordinates.
    // This allows ping-pong FBO reading (which also uses bottom-left) to map 1:1 without manual vertex shader flipping.
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true)

    if (imageData instanceof ImageData) {
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, imageData)
    } else {
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, imageData)
    }

    // IMPORTANT: reset the flip flag — it's global WebGL state and will corrupt 3D texture uploads (texImage3D)
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
    this.sourceTexture = tex
  }

  // ── Load LUT ───────────────────────────────────────────────────────────────

  loadLUT(data: Float32Array, size: number): void {
    const gl = this.gl
    if (this.lutTexture) gl.deleteTexture(this.lutTexture)

    // RGB32F requires EXT_color_buffer_float which isn't universally available.
    // Convert float [0,1] values to Uint8 [0,255] — precision is more than enough for a LUT.
    const uint8 = new Uint8Array(data.length)
    for (let i = 0; i < data.length; i++) {
      uint8[i] = Math.round(Math.min(1, Math.max(0, data[i])) * 255)
    }

    const tex = gl.createTexture()!
    gl.bindTexture(gl.TEXTURE_3D, tex)
    gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1) // ← add this before texImage3D
    gl.texImage3D(gl.TEXTURE_3D, 0, gl.RGB, size, size, size, 0, gl.RGB, gl.UNSIGNED_BYTE, uint8)
    gl.pixelStorei(gl.UNPACK_ALIGNMENT, 4) // ← reset to default after
    gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_WRAP_R, gl.CLAMP_TO_EDGE)
    this.lutTexture = tex
    this.lutSize = size
  }

  clearLUT(): void {
    if (this.lutTexture) {
      this.gl.deleteTexture(this.lutTexture)
      this.lutTexture = null
    }
  }

  private updateCurveTexture(curves: CurvesState | undefined): void {
    const gl = this.gl
    const data = buildCurveLutRGBA8(curves)
    const w = CURVE_LUT_WIDTH
    gl.activeTexture(gl.TEXTURE2)
    if (!this.curveTexture) {
      this.curveTexture = gl.createTexture()
      gl.bindTexture(gl.TEXTURE_2D, this.curveTexture)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
    } else {
      gl.bindTexture(gl.TEXTURE_2D, this.curveTexture)
    }
    gl.pixelStorei(gl.UNPACK_ALIGNMENT, 4)
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, data)
    gl.activeTexture(gl.TEXTURE0)
  }

  // ── Load Overlay Texture ───────────────────────────────────────────────────

  loadOverlayTexture(id: string, image: HTMLImageElement): void {
    const gl = this.gl
    if (this.overlayTextures.has(id)) {
      gl.deleteTexture(this.overlayTextures.get(id)!)
    }
    
    const tex = gl.createTexture()!
    gl.bindTexture(gl.TEXTURE_2D, tex)
    // gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true)
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image)
    // gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false)
    
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT)
    
    this.overlayTextures.set(id, tex)
  }

  clearOverlayTextures(): void {
    const gl = this.gl
    for (const tex of this.overlayTextures.values()) {
      gl.deleteTexture(tex)
    }
    this.overlayTextures.clear()
  }

  // ── Text overlay texture management ────────────────────────────────────────
  private textTexture: WebGLTexture | null = null

  uploadTextTexture(canvas: HTMLCanvasElement): WebGLTexture {
    const gl = this.gl
    if (!this.textTexture) {
      this.textTexture = gl.createTexture()!
    }
    gl.bindTexture(gl.TEXTURE_2D, this.textTexture)

    // Text is rasterized with Canvas2D's top-left origin, while the WebGL pass
    // samples in bottom-left texture space. Flip on upload so text coordinates
    // match the interactive overlay and dragging direction.
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true)
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, canvas)
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false)

    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
    return this.textTexture
  }

  clearTextTexture(): void {
    if (this.textTexture) {
      this.gl.deleteTexture(this.textTexture)
      this.textTexture = null
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  render(state: EditState, textTexture?: WebGLTexture | null): void {
    if (!this.sourceTexture) return
    const gl = this.gl

    gl.viewport(0, 0, this.width, this.height)
    this.pingPong = 0

    let current = this.sourceTexture

    // ─────────────────────────────────────────────────────────────────────────────
    // LAYER 1: PRESET BASE
    // ─────────────────────────────────────────────────────────────────────────────
    const pf = state.presetFilters

    if (state.presetId) {
      // 1. LUT
      if (this.lutTexture && state.presetIntensity > 0) {
        const lutIntensity = (state as any).presetLutIntensity ?? 1.0
        current = this.runLUT(current, state.presetIntensity * lutIntensity)
      }

      // 2. Preset Fade
      if (pf.fade?.enabled && ((pf.fade.blackLift ?? 0) > 0 || (pf.fade.whiteCeiling ?? 1) < 1)) {
        current = this.runFade(current, { fade: pf.fade } as EditState)
      }

      // 3. Preset Halation
      if (pf.halation?.enabled && (pf.halation.intensity ?? 0) > 0) {
        current = this.runHalation(current, { halation: pf.halation } as EditState)
      }

      // 4. Preset Bloom
      if (pf.bloom?.enabled && (pf.bloom.intensity ?? 0) > 0) {
        current = this.runBloom(current, pf.bloom as EditState['bloom'])
      }

      // 5. Preset Chromatic Aberration
      if (pf.chromaticAberration?.enabled && (pf.chromaticAberration.amount ?? 0) > 0) {
        // runCA takes the object directly
        current = this.runCA(current, pf.chromaticAberration as EditState['chromaticAberration'])
      }

      // 6. Preset Lens Distortion
      if (pf.lensDistortion?.enabled && (pf.lensDistortion.amount ?? 0) !== 0) {
        current = this.runLensDist(current, { lensDistortion: pf.lensDistortion } as EditState)
      }

      // 7. Preset Light Leaks
      if (pf.lightLeak?.enabled && (pf.lightLeak.opacity ?? 0) > 0 && this.overlayTextures.has('lightLeak')) {
        current = this.runOverlay(current, this.overlayTextures.get('lightLeak')!, {
          opacity: pf.lightLeak.opacity ?? 1,
          blendMode: pf.lightLeak.blendMode ?? 'screen',
          tintColor: pf.lightLeak.color ?? '#FFFFFF',
          tintStrength: pf.lightLeak.colorStrength ?? 0,
          offset: pf.lightLeak.position ?? [0, 0]
        })
      }

      // 8. Preset Vignette
      if (pf.vignette?.enabled && (pf.vignette.strength ?? 0) > 0) {
        current = this.runVignette(current, { vignette: pf.vignette } as EditState)
      }

      // 9. Preset Dust & Scratches
      if (pf.dustScratches?.enabled && (pf.dustScratches.opacity ?? 0) > 0 && this.overlayTextures.has('dustScratches')) {
        current = this.runOverlay(current, this.overlayTextures.get('dustScratches')!, {
          opacity: pf.dustScratches.opacity ?? 0.3,
          blendMode: pf.dustScratches.blendMode ?? 'screen',
          tintColor: '#FFFFFF',
          tintStrength: 0,
          offset: [0, 0]
        })
      }

      // 10. Preset Grain (TEXTURE OVERLAY or PROCEDURAL)
      if (pf.grain?.enabled) {
        if (!pf.grain.textureFile && (pf.grain.intensity ?? 0) > 0) {
          current = this.runGrain(current, { grain: pf.grain } as EditState)
        } else if (pf.grain.textureFile && (pf.grain.opacity ?? 0) > 0 && this.overlayTextures.has('presetGrain')) {
          current = this.runOverlay(current, this.overlayTextures.get('presetGrain')!, {
            opacity: pf.grain.opacity ?? 0.5,
            blendMode: pf.grain.blendMode ?? 'overlay',
            tintColor: '#FFFFFF',
            tintStrength: 0,
            offset: [0, 0]
          })
        }
      }

      // Preset Blur
      if (pf.blur?.enabled && (pf.blur.radius ?? 0) > 0) {
        const radius01 = pf.blur.radius / 100
        if (pf.blur.type === 'gaussian') {
          current = this.runGaussianBlur(current, radius01)
        } else if (pf.blur.type === 'lens') {
          current = this.runLensBlur(current, radius01)
        } else if (pf.blur.type === 'zoom') {
          current = this.runZoomBlur(current, radius01, [0.5, 0.5])
        }
      }

      // 11. Preset Border
      if (pf.border?.enabled && this.overlayTextures.has('border')) {
        current = this.runOverlay(current, this.overlayTextures.get('border')!, {
          opacity: 1.0, 
          blendMode: 'normal',
          tintColor: '#FFFFFF',
          tintStrength: 0,
          offset: [0, 0]
        })
      }
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // LAYER 2: USER ADJUSTMENTS (Exposure, Contrast, Temp, Tint)
    // ─────────────────────────────────────────────────────────────────────────────
    current = this.runAdjustments(current, state)
    if ((state.gaussianBlur ?? 0) > 0) {
      current = this.runGaussianBlur(current, state.gaussianBlur / 100)
    }
    if ((state.lensBlur ?? 0) > 0) {
      current = this.runLensBlur(current, state.lensBlur / 100)
    }
    if ((state.zoomBlur ?? 0) > 0) {
      current = this.runZoomBlur(current, state.zoomBlur / 100, [0.5, 0.5])
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // LAYER 3: USER CUSTOM EFFECTS (Mathematical pass on top of everything)
    // ─────────────────────────────────────────────────────────────────────────────
    
    // User Fade
    if (state.fade?.enabled && (state.fade.blackLift > 0 || state.fade.whiteCeiling < 1)) {
      current = this.runFade(current, state)
    }

    // User Halation
    if (state.halation.enabled && state.halation.intensity > 0) {
      current = this.runHalation(current, state)
    }

    // User Bloom
    if (state.bloom.enabled && state.bloom.intensity > 0) {
      current = this.runBloom(current, state.bloom)
    }

    // User Chromatic Aberration
    if (state.chromaticAberration.enabled && state.chromaticAberration.amount > 0) {
      current = this.runCA(current, state.chromaticAberration)
    }

    // User Lens Distortion
    if (state.lensDistortion.enabled && state.lensDistortion.amount !== 0) {
      current = this.runLensDist(current, state)
    }

    // User Blur Effect
    if (state.blur?.enabled && (state.blur.radius ?? 0) > 0) {
      const radius01 = state.blur.radius / 100
      if (state.blur.type === 'gaussian') {
        current = this.runGaussianBlur(current, radius01)
      } else if (state.blur.type === 'lens') {
        current = this.runLensBlur(current, radius01)
      } else if (state.blur.type === 'zoom') {
        current = this.runZoomBlur(current, radius01, [0.5, 0.5])
      }
    }

    // User Vignette
    if (state.vignette.enabled && state.vignette.strength > 0) {
      current = this.runVignette(current, state)
    }

    // User Grain (Mathematical noise algorithm)
    if (state.grain.enabled && state.grain.intensity > 0) {
      current = this.runGrain(current, state)
    }

    // Final text composite pass (Layer 4)
    if (textTexture) {
      current = this.runTextComposite(current, textTexture, 1.0)
    }

    // Final: display to screen
    this.drawToScreen(current)
  }

  // ── Internal pass helpers ──────────────────────────────────────────────────

  private getNextFBO(): { fbo: WebGLFramebuffer; tex: WebGLTexture } {
    const idx = this.pingPong % 2
    this.pingPong++
    return { fbo: this.fbos[idx], tex: this.fbTextures[idx] }
  }

  private bindProgram(prog: WebGLProgram, inputTex: WebGLTexture, targetFBO: WebGLFramebuffer | null): void {
    const gl = this.gl
    gl.bindFramebuffer(gl.FRAMEBUFFER, targetFBO)
    gl.useProgram(prog)
    gl.activeTexture(gl.TEXTURE0)
    gl.bindTexture(gl.TEXTURE_2D, inputTex)
    gl.uniform1i(gl.getUniformLocation(prog, 'u_image'), 0)
    const vao = this.vaos.get(prog)!
    gl.bindVertexArray(vao)
  }

  private draw(): void {
    this.gl.drawArrays(this.gl.TRIANGLE_STRIP, 0, 4)
    this.gl.bindVertexArray(null)
  }

  private runFade(input: WebGLTexture, s: EditState): WebGLTexture {
    const gl = this.gl
    const { fbo, tex } = this.getNextFBO()
    this.bindProgram(this.progFade, input, fbo)
    const u = (n: string) => gl.getUniformLocation(this.progFade, n)
    gl.uniform1f(u('u_blackLift'), s.fade?.blackLift ?? 0.05)
    gl.uniform1f(u('u_whiteCeiling'), s.fade?.whiteCeiling ?? 0.97)
    this.draw()
    return tex
  }

  private runLUT(input: WebGLTexture, intensity: number): WebGLTexture {
    const gl = this.gl
    const { fbo, tex } = this.getNextFBO()
    this.bindProgram(this.progLUT, input, fbo)
    gl.activeTexture(gl.TEXTURE1)
    gl.bindTexture(gl.TEXTURE_3D, this.lutTexture!)
    gl.uniform1i(gl.getUniformLocation(this.progLUT, 'u_lut'), 1)
    gl.uniform1f(gl.getUniformLocation(this.progLUT, 'u_intensity'), intensity)
    this.draw()
    return tex
  }

  private runAdjustments(input: WebGLTexture, s: EditState): WebGLTexture {
    const gl = this.gl
    const { fbo, tex } = this.getNextFBO()
    const prog = this.progAdjust
    this.bindProgram(prog, input, fbo)
    const u = (name: string) => gl.getUniformLocation(prog, name)
    this.updateCurveTexture(s.curves ?? DEFAULT_CURVES)
    gl.activeTexture(gl.TEXTURE2)
    gl.bindTexture(gl.TEXTURE_2D, this.curveTexture)
    gl.uniform1i(u('u_curves'), 2)
    gl.uniform1f(u('u_curveLutWidth'), CURVE_LUT_WIDTH)
    gl.uniform1f(u('u_exposure'), s.exposure)
    gl.uniform1f(u('u_contrast'), s.contrast / 100)
    gl.uniform1f(u('u_highlights'), s.highlights / 100)
    gl.uniform1f(u('u_shadows'), s.shadows / 100)
    gl.uniform1f(u('u_whites'), s.whites / 100)
    gl.uniform1f(u('u_blacks'), s.blacks / 100)
    gl.uniform1f(u('u_temperature'), s.temperature / 100)
    gl.uniform1f(u('u_tint'), s.tint / 100)
    gl.uniform1f(u('u_vibrance'), s.vibrance / 100)
    gl.uniform1f(u('u_saturation'), s.saturation / 100)
    // Detail panel
    gl.uniform1f(u('u_sharpness'), s.sharpness / 100)
    gl.uniform1f(u('u_clarity'), s.clarity / 100)
    gl.uniform1f(u('u_texture'), s.texture / 100)
    gl.uniform1f(u('u_noiseReduction'), s.noiseReduction / 100)
    gl.uniform2f(u('u_texelSize'), 1 / this.width, 1 / this.height)
    const st = s.splitToning ?? DEFAULT_SPLIT
    gl.uniform1f(u('u_splitShHue'), st.shadows.hue / 360)
    gl.uniform1f(u('u_splitShSat'), st.shadows.saturation / 100)
    gl.uniform1f(u('u_splitMidHue'), st.midtones.hue / 360)
    gl.uniform1f(u('u_splitMidSat'), st.midtones.saturation / 100)
    gl.uniform1f(u('u_splitHiHue'), st.highlights.hue / 360)
    gl.uniform1f(u('u_splitHiSat'), st.highlights.saturation / 100)
    const balance = s.colorBalance ?? DEFAULT_BALANCE
    gl.uniform3f(u('u_balanceSh'), balance.shadows.cyanRed / 100, balance.shadows.magentaGreen / 100, balance.shadows.yellowBlue / 100)
    gl.uniform3f(u('u_balanceMid'), balance.midtones.cyanRed / 100, balance.midtones.magentaGreen / 100, balance.midtones.yellowBlue / 100)
    gl.uniform3f(u('u_balanceHi'), balance.highlights.cyanRed / 100, balance.highlights.magentaGreen / 100, balance.highlights.yellowBlue / 100)
    gl.uniform1f(u('u_dehaze'), (s.dehaze ?? 0) / 100)
    const hsl = s.hslMixer ?? DEFAULT_HSL
    gl.uniform1fv(u('u_hslHue'), new Float32Array(HSL_BANDS.map(b => hsl[b].hue / 100)))
    gl.uniform1fv(u('u_hslSat'), new Float32Array(HSL_BANDS.map(b => hsl[b].saturation / 100)))
    gl.uniform1fv(u('u_hslLum'), new Float32Array(HSL_BANDS.map(b => hsl[b].luminance / 100)))
    this.draw()
    gl.activeTexture(gl.TEXTURE2)
    gl.bindTexture(gl.TEXTURE_2D, null)
    gl.activeTexture(gl.TEXTURE0)
    return tex
  }

  /**
   * Shallow-depth defocus: separable Gaussian blur of the adjustment pass, mixed with the sharp result.
   * Preserves the sharp image in `halTexture` while ping-pong buffers are used for blur; safe before
   * user halation/bloom which reuse the same hal FBOs later in the frame.
   */
  private runLensBlur(sharp: WebGLTexture, strength01: number): WebGLTexture {
    if (strength01 <= 0) return sharp
    const gl = this.gl
    const texelW = 1 / this.width
    const texelH = 1 / this.height
    // Gaussian radius in pixels (matches existing blur passes; max 32 in shader)
    const radius = Math.max(1, Math.round(0.5 + strength01 * strength01 * 28))

    // Keep a copy of the sharp image for the final mix (blur overwrites one ping-pong target)
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.halFBO!)
    gl.useProgram(this.progPassthrough)
    gl.activeTexture(gl.TEXTURE0)
    gl.bindTexture(gl.TEXTURE_2D, sharp)
    gl.uniform1i(gl.getUniformLocation(this.progPassthrough, 'u_image'), 0)
    gl.bindVertexArray(this.vaos.get(this.progPassthrough)!)
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
    gl.bindVertexArray(null)

    // Horizontal blur
    const { fbo: fboH, tex: texH } = this.getNextFBO()
    this.bindProgram(this.progBlurH, sharp, fboH)
    gl.uniform1f(gl.getUniformLocation(this.progBlurH, 'u_radius'), radius)
    gl.uniform2f(gl.getUniformLocation(this.progBlurH, 'u_texelSize'), texelW, texelH)
    this.draw()

    // Vertical blur
    const { fbo: fboV, tex: texBlur } = this.getNextFBO()
    this.bindProgram(this.progBlurV, texH, fboV)
    gl.uniform1f(gl.getUniformLocation(this.progBlurV, 'u_radius'), radius)
    gl.uniform2f(gl.getUniformLocation(this.progBlurV, 'u_texelSize'), texelW, texelH)
    this.draw()

    // Composite sharp (halTexture) + blurred (texBlur) → next ping-pong target
    const { fbo: fboOut, tex: texOut } = this.getNextFBO()
    gl.bindFramebuffer(gl.FRAMEBUFFER, fboOut)
    gl.useProgram(this.progLensBlurComp)
    gl.activeTexture(gl.TEXTURE0)
    gl.bindTexture(gl.TEXTURE_2D, this.halTexture!)
    gl.uniform1i(gl.getUniformLocation(this.progLensBlurComp, 'u_sharp'), 0)
    gl.activeTexture(gl.TEXTURE1)
    gl.bindTexture(gl.TEXTURE_2D, texBlur)
    gl.uniform1i(gl.getUniformLocation(this.progLensBlurComp, 'u_blur'), 1)
    gl.uniform1f(gl.getUniformLocation(this.progLensBlurComp, 'u_strength'), strength01)
    gl.bindVertexArray(this.vaos.get(this.progLensBlurComp)!)
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
    gl.bindVertexArray(null)
    gl.activeTexture(gl.TEXTURE1)
    gl.bindTexture(gl.TEXTURE_2D, null)
    gl.activeTexture(gl.TEXTURE0)
    return texOut
  }

  private runGaussianBlur(input: WebGLTexture, strength01: number): WebGLTexture {
    if (strength01 <= 0) return input
    const gl = this.gl
    const texelW = 1 / this.width
    const texelH = 1 / this.height
    const radius = Math.max(1, Math.round(0.5 + strength01 * strength01 * 28))

    // Horizontal blur
    const { fbo: fboH, tex: texH } = this.getNextFBO()
    this.bindProgram(this.progBlurH, input, fboH)
    gl.uniform1f(gl.getUniformLocation(this.progBlurH, 'u_radius'), radius)
    gl.uniform2f(gl.getUniformLocation(this.progBlurH, 'u_texelSize'), texelW, texelH)
    this.draw()

    // Vertical blur
    const { fbo: fboV, tex: texBlur } = this.getNextFBO()
    this.bindProgram(this.progBlurV, texH, fboV)
    gl.uniform1f(gl.getUniformLocation(this.progBlurV, 'u_radius'), radius)
    gl.uniform2f(gl.getUniformLocation(this.progBlurV, 'u_texelSize'), texelW, texelH)
    this.draw()

    return texBlur
  }

  private runZoomBlur(input: WebGLTexture, strength01: number, center: [number, number] = [0.5, 0.5]): WebGLTexture {
    if (strength01 <= 0) return input
    const gl = this.gl
    const { fbo, tex } = this.getNextFBO()
    this.bindProgram(this.progZoomBlur, input, fbo)
    gl.uniform1f(gl.getUniformLocation(this.progZoomBlur, 'u_strength'), strength01)
    gl.uniform2f(gl.getUniformLocation(this.progZoomBlur, 'u_center'), center[0], center[1])
    this.draw()
    return tex
  }

  private runGrain(input: WebGLTexture, s: EditState): WebGLTexture {
    const gl = this.gl
    const grain = s.grain ?? {}
    const intensity = grain.intensity ?? 0.3
    const size = grain.size ?? 1.0
    const grainType = grain.type ?? 'medium'
    const roughness = grain.roughness ?? 0.5
    const luminosityMode = grain.luminosityMode ?? true
    const highlightReduction = grain.highlightReduction ?? 0.4

    const { fbo, tex } = this.getNextFBO()
    const prog = this.progGrain
    this.bindProgram(prog, input, fbo)
    const u = (n: string) => gl.getUniformLocation(prog, n)
    gl.uniform1f(u('u_intensity'), intensity)
    gl.uniform1f(u('u_size'), size)
    gl.uniform1f(u('u_seed'), (Math.random() * 1000) | 0)
    gl.uniform1i(u('u_type'), ['fine','medium','coarse','film'].indexOf(grainType))
    gl.uniform1f(u('u_roughness'), roughness)
    gl.uniform1i(u('u_luminosityMode'), luminosityMode ? 1 : 0)
    gl.uniform1f(u('u_highlightReduction'), highlightReduction)
    this.draw()
    return tex
  }

  private runVignette(input: WebGLTexture, s: EditState): WebGLTexture {
    const gl = this.gl
    const vignette = s.vignette ?? {}
    const strength = vignette.strength ?? 0.5
    const feather = vignette.feather ?? 0.5
    const midpoint = vignette.midpoint ?? 0.7
    const shape = vignette.shape ?? 'oval'
    const exposure = vignette.exposure ?? 0

    const { fbo, tex } = this.getNextFBO()
    const prog = this.progVignette
    this.bindProgram(prog, input, fbo)
    const u = (n: string) => gl.getUniformLocation(prog, n)
    gl.uniform1f(u('u_strength'), strength)
    gl.uniform1f(u('u_feather'), feather)
    gl.uniform1f(u('u_midpoint'), midpoint)
    gl.uniform1i(u('u_shape'), shape === 'oval' ? 0 : 1)
    gl.uniform1f(u('u_aspectRatio'), this.width / this.height)
    gl.uniform1f(u('u_exposureShift'), exposure)
    this.draw()
    return tex
  }

  private runHalation(input: WebGLTexture, s: EditState): WebGLTexture {
    const gl = this.gl
    const halation = s.halation ?? {}
    const color = halation.color ?? '#FF4422'
    const radius = halation.radius ?? 40
    const threshold = halation.threshold ?? 0.75
    const intensity = halation.intensity ?? 0.4

    // Parse color safely
    const c = color.startsWith('#') ? color : '#' + color
    const r = parseInt(c.slice(1, 3), 16) / 255 || 0
    const g = parseInt(c.slice(3, 5), 16) / 255 || 0
    const b = parseInt(c.slice(5, 7), 16) / 255 || 0

    // Pass 1: extract highlights → halFBO
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.halFBO)
    gl.useProgram(this.progHalExtract)
    gl.activeTexture(gl.TEXTURE0)
    gl.bindTexture(gl.TEXTURE_2D, input)
    gl.uniform1i(gl.getUniformLocation(this.progHalExtract, 'u_image'), 0)
    gl.uniform1f(gl.getUniformLocation(this.progHalExtract, 'u_threshold'), threshold)
    gl.uniform3f(gl.getUniformLocation(this.progHalExtract, 'u_color'), r, g, b)
    gl.bindVertexArray(this.vaos.get(this.progHalExtract)!)
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
    gl.bindVertexArray(null)

    // Pass 2a: horizontal blur → halFBO2
    const blurR = Math.max(1, Math.round(radius * 0.2))
    const texelW = 1 / this.width
    const texelH = 1 / this.height
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.halFBO2)
    gl.useProgram(this.progBlurH)
    gl.activeTexture(gl.TEXTURE0)
    gl.bindTexture(gl.TEXTURE_2D, this.halTexture!)
    gl.uniform1i(gl.getUniformLocation(this.progBlurH, 'u_image'), 0)
    gl.uniform1f(gl.getUniformLocation(this.progBlurH, 'u_radius'), blurR)
    gl.uniform2f(gl.getUniformLocation(this.progBlurH, 'u_texelSize'), texelW, texelH)
    gl.bindVertexArray(this.vaos.get(this.progBlurH)!)
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
    gl.bindVertexArray(null)

    // Pass 2b: vertical blur → halFBO
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.halFBO)
    gl.useProgram(this.progBlurV)
    gl.activeTexture(gl.TEXTURE0)
    gl.bindTexture(gl.TEXTURE_2D, this.halTexture2!)
    gl.uniform1i(gl.getUniformLocation(this.progBlurV, 'u_image'), 0)
    gl.uniform1f(gl.getUniformLocation(this.progBlurV, 'u_radius'), blurR)
    gl.uniform2f(gl.getUniformLocation(this.progBlurV, 'u_texelSize'), texelW, texelH)
    gl.bindVertexArray(this.vaos.get(this.progBlurV)!)
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
    gl.bindVertexArray(null)

    // Pass 3: composite halation over original → ping-pong
    const { fbo, tex } = this.getNextFBO()
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo)
    gl.useProgram(this.progHalComposite)
    gl.activeTexture(gl.TEXTURE0)
    gl.bindTexture(gl.TEXTURE_2D, input)
    gl.uniform1i(gl.getUniformLocation(this.progHalComposite, 'u_image'), 0)
    gl.activeTexture(gl.TEXTURE1)
    gl.bindTexture(gl.TEXTURE_2D, this.halTexture!)
    gl.uniform1i(gl.getUniformLocation(this.progHalComposite, 'u_halation'), 1)
    gl.uniform1f(gl.getUniformLocation(this.progHalComposite, 'u_intensity'), intensity)
    gl.bindVertexArray(this.vaos.get(this.progHalComposite)!)
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
    gl.bindVertexArray(null)

    return tex
  }

  private runBloom(input: WebGLTexture, bloom: EditState['bloom']): WebGLTexture {
    const gl = this.gl
    const bParams = bloom ?? {}
    const threshold = bParams.threshold ?? 0.75
    const intensity = bParams.intensity ?? 0.3
    const radius = bParams.radius ?? 15
    const character = bParams.character ?? 'soft'

    // Pass 1: extract bright highlights with neutral white color.
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.halFBO)
    gl.useProgram(this.progHalExtract)
    gl.activeTexture(gl.TEXTURE0)
    gl.bindTexture(gl.TEXTURE_2D, input)
    gl.uniform1i(gl.getUniformLocation(this.progHalExtract, 'u_image'), 0)
    gl.uniform1f(gl.getUniformLocation(this.progHalExtract, 'u_threshold'), threshold)
    gl.uniform3f(gl.getUniformLocation(this.progHalExtract, 'u_color'), 1, 1, 1)
    gl.bindVertexArray(this.vaos.get(this.progHalExtract)!)
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
    gl.bindVertexArray(null)

    const blurR = Math.max(1, Math.round(radius * (character === 'hard' ? 0.16 : 0.28)))
    const texelW = 1 / this.width
    const texelH = 1 / this.height

    // Pass 2a: horizontal blur.
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.halFBO2)
    gl.useProgram(this.progBlurH)
    gl.activeTexture(gl.TEXTURE0)
    gl.bindTexture(gl.TEXTURE_2D, this.halTexture!)
    gl.uniform1i(gl.getUniformLocation(this.progBlurH, 'u_image'), 0)
    gl.uniform1f(gl.getUniformLocation(this.progBlurH, 'u_radius'), blurR)
    gl.uniform2f(gl.getUniformLocation(this.progBlurH, 'u_texelSize'), texelW, texelH)
    gl.bindVertexArray(this.vaos.get(this.progBlurH)!)
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
    gl.bindVertexArray(null)

    // Pass 2b: vertical blur.
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.halFBO)
    gl.useProgram(this.progBlurV)
    gl.activeTexture(gl.TEXTURE0)
    gl.bindTexture(gl.TEXTURE_2D, this.halTexture2!)
    gl.uniform1i(gl.getUniformLocation(this.progBlurV, 'u_image'), 0)
    gl.uniform1f(gl.getUniformLocation(this.progBlurV, 'u_radius'), blurR)
    gl.uniform2f(gl.getUniformLocation(this.progBlurV, 'u_texelSize'), texelW, texelH)
    gl.bindVertexArray(this.vaos.get(this.progBlurV)!)
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
    gl.bindVertexArray(null)

    // Pass 3: screen-composite bloom over the incoming texture.
    const { fbo, tex } = this.getNextFBO()
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo)
    gl.useProgram(this.progHalComposite)
    gl.activeTexture(gl.TEXTURE0)
    gl.bindTexture(gl.TEXTURE_2D, input)
    gl.uniform1i(gl.getUniformLocation(this.progHalComposite, 'u_image'), 0)
    gl.activeTexture(gl.TEXTURE1)
    gl.bindTexture(gl.TEXTURE_2D, this.halTexture!)
    gl.uniform1i(gl.getUniformLocation(this.progHalComposite, 'u_halation'), 1)
    gl.uniform1f(gl.getUniformLocation(this.progHalComposite, 'u_intensity'), intensity)
    gl.bindVertexArray(this.vaos.get(this.progHalComposite)!)
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
    gl.bindVertexArray(null)

    return tex
  }

  private runCA(input: WebGLTexture, ca: EditState['chromaticAberration']): WebGLTexture {
    const gl = this.gl
    const caParams = ca ?? {}
    const amount = caParams.amount ?? 3
    const radialFalloff = caParams.radialFalloff ?? true

    const { fbo, tex } = this.getNextFBO()
    this.bindProgram(this.progCA, input, fbo)
    gl.uniform1f(gl.getUniformLocation(this.progCA, 'u_amount'), amount)
    gl.uniform1i(gl.getUniformLocation(this.progCA, 'u_radialFalloff'), radialFalloff ? 1 : 0)
    this.draw()
    return tex
  }

  private runOverlay(
    input: WebGLTexture,
    overlayTex: WebGLTexture,
    params: { opacity: number; blendMode: string; tintColor: string; tintStrength: number; offset: [number, number] }
  ): WebGLTexture {
    const gl = this.gl
    const { fbo, tex } = this.getNextFBO()
    this.bindProgram(this.progOverlay, input, fbo)
    const prog = this.progOverlay

    // Bind overlay texture to unit 1
    gl.activeTexture(gl.TEXTURE1)
    gl.bindTexture(gl.TEXTURE_2D, overlayTex)
    gl.uniform1i(gl.getUniformLocation(prog, 'u_overlay'), 1)

    const u = (n: string) => gl.getUniformLocation(prog, n)
    gl.uniform1f(u('u_opacity'), params.opacity)
    
    let blendIndex = 0 // screen
    if (params.blendMode === 'multiply') blendIndex = 1
    if (params.blendMode === 'overlay') blendIndex = 2
    if (params.blendMode === 'add') blendIndex = 3
    if (params.blendMode === 'normal') blendIndex = 4
    gl.uniform1i(u('u_blendMode'), blendIndex)

    const c = params.tintColor && params.tintColor.startsWith('#') ? params.tintColor : '#FFFFFF'
    const r = parseInt(c.slice(1,3), 16)/255 || 0
    const g = parseInt(c.slice(3,5), 16)/255 || 0
    const b = parseInt(c.slice(5,7), 16)/255 || 0
    gl.uniform3f(u('u_tintColor'), r, g, b)
    gl.uniform1f(u('u_tintStrength'), params.tintStrength)
    gl.uniform2f(u('u_offset'), params.offset[0] ?? 0, params.offset[1] ?? 0)

    this.draw()

    // reset active texture for sanity
    gl.activeTexture(gl.TEXTURE0)
    return tex
  }

  private runLensDist(input: WebGLTexture, s: EditState): WebGLTexture {
    const gl = this.gl
    const amount = s.lensDistortion?.amount ?? 0
    const { fbo, tex } = this.getNextFBO()
    this.bindProgram(this.progLensDist, input, fbo)
    gl.uniform1f(gl.getUniformLocation(this.progLensDist, 'u_amount'), amount)
    gl.uniform1f(gl.getUniformLocation(this.progLensDist, 'u_aspectRatio'), this.width / this.height)
    this.draw()
    return tex
  }

  private drawToScreen(input: WebGLTexture): void {
    const gl = this.gl
    gl.bindFramebuffer(gl.FRAMEBUFFER, null)
    this.bindProgram(this.progPassthrough, input, null)
    this.draw()
  }

  private runTextComposite(input: WebGLTexture, textTex: WebGLTexture, opacity: number): WebGLTexture {
    const gl = this.gl
    const { fbo, tex } = this.getNextFBO()
    this.bindProgram(this.progTextComposite, input, fbo)
    gl.activeTexture(gl.TEXTURE1)
    gl.bindTexture(gl.TEXTURE_2D, textTex)
    gl.uniform1i(gl.getUniformLocation(this.progTextComposite, 'u_text'), 1)
    gl.uniform1f(gl.getUniformLocation(this.progTextComposite, 'u_opacity'), opacity)
    this.draw()
    gl.activeTexture(gl.TEXTURE0)
    return tex
  }

  // ── Capture the current canvas as a data URL (Option A export parity) ──────
  getCanvasDataURL(type = 'image/jpeg', quality = 0.92): string {
    return this.outputCanvas.toDataURL(type, quality)
  }

  /**
   * Luminance histogram: raw per-bin pixel counts (256 bins), Rec. 709 luma.
   * Unnormalized so the UI can apply perceptual scaling (log, sqrt, etc.).
   * Call after `render()`; uses readPixels on the default framebuffer.
   */
  getLumaHistogram256(): number[] {
    if (!this.width || !this.height) {
      return Array.from({ length: 256 }, () => 0)
    }
    const gl = this.gl
    const w = this.width
    const h = this.height
    const pixels = new Uint8Array(w * h * 4)
    gl.bindFramebuffer(gl.FRAMEBUFFER, null)
    gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, pixels)
    const counts = new Uint32Array(256)
    const n = w * h * 4
    for (let i = 0; i < n; i += 4) {
      const r = pixels[i]!
      const g = pixels[i + 1]!
      const b = pixels[i + 2]!
      const y = (0.2126 * r + 0.7152 * g + 0.0722 * b) | 0
      const bin = y > 255 ? 255 : y < 0 ? 0 : y
      counts[bin]!++
    }
    return Array.from(counts)
  }

  // ── Resize ─────────────────────────────────────────────────────────────────

  resize(w: number, h: number): void {
    if (this.width === w && this.height === h) return
    this.width = w
    this.height = h
    this.outputCanvas.width = w
    this.outputCanvas.height = h
    const gl = this.gl
    gl.viewport(0, 0, w, h)

    // Recreate FBO textures at new size
    for (let i = 0; i < 2; i++) {
      gl.deleteTexture(this.fbTextures[i])
      this.fbTextures[i] = createFBOTexture(gl, w, h)
      gl.bindFramebuffer(gl.FRAMEBUFFER, this.fbos[i])
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.fbTextures[i], 0)
    }
    // Halation textures
    if (this.halTexture) gl.deleteTexture(this.halTexture)
    if (this.halTexture2) gl.deleteTexture(this.halTexture2)
    this.halTexture = createFBOTexture(gl, w, h)
    this.halTexture2 = createFBOTexture(gl, w, h)
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.halFBO)
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.halTexture, 0)
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.halFBO2)
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.halTexture2, 0)
    gl.bindFramebuffer(gl.FRAMEBUFFER, null)
  }

  destroy(): void {
    const gl = this.gl
    if (this.sourceTexture) gl.deleteTexture(this.sourceTexture)
    if (this.lutTexture) gl.deleteTexture(this.lutTexture)
    if (this.curveTexture) gl.deleteTexture(this.curveTexture)
    if (this.halTexture) gl.deleteTexture(this.halTexture)
    if (this.halTexture2) gl.deleteTexture(this.halTexture2)
    this.fbTextures.forEach(t => gl.deleteTexture(t))
    this.fbos.forEach(f => gl.deleteFramebuffer(f))
    if (this.halFBO) gl.deleteFramebuffer(this.halFBO)
    if (this.halFBO2) gl.deleteFramebuffer(this.halFBO2)
    this.clearTextTexture()
  }
}
