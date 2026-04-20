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
  HALATION_COMPOSITE_FRAG,
  CA_FRAG,
  LENS_DIST_FRAG,
  PASSTHROUGH_FRAG,
  OVERLAY_FRAG,
} from './shaders'
import type { EditState } from '@shared/types'

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
  private progHalComposite: WebGLProgram
  private progCA: WebGLProgram
  private progLensDist: WebGLProgram
  private progPassthrough: WebGLProgram
  private progOverlay: WebGLProgram

  // VAOs
  private vaos: Map<WebGLProgram, WebGLVertexArrayObject> = new Map()

  // Source image texture
  private sourceTexture: WebGLTexture | null = null

  // LUT 3D texture
  private lutTexture: WebGLTexture | null = null
  private lutSize: number = 33

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
    this.progHalComposite = createProgram(gl, HALATION_COMPOSITE_FRAG)
    this.progCA = createProgram(gl, CA_FRAG)
    this.progLensDist = createProgram(gl, LENS_DIST_FRAG)
    this.progPassthrough = createProgram(gl, PASSTHROUGH_FRAG)
    this.progOverlay = createProgram(gl, OVERLAY_FRAG)

    // Setup VAOs for each program
    const programs = [
      this.progFade,
      this.progAdjust, this.progLUT, this.progGrain, this.progVignette,
      this.progHalExtract, this.progBlurH, this.progBlurV, this.progHalComposite,
      this.progCA, this.progLensDist, this.progPassthrough, this.progOverlay,
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
    gl.texImage3D(gl.TEXTURE_3D, 0, gl.RGB, size, size, size, 0, gl.RGB, gl.UNSIGNED_BYTE, uint8)
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

  // ── Render ─────────────────────────────────────────────────────────────────

  render(state: EditState): void {
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
        current = this.runLUT(current, state.presetIntensity)
      }

      // 2. Preset Fade
      if (pf.fade?.enabled && ((pf.fade.blackLift ?? 0) > 0 || (pf.fade.whiteCeiling ?? 1) < 1)) {
        current = this.runFade(current, { fade: pf.fade } as EditState)
      }

      // 3. Preset Halation
      if (pf.halation?.enabled && (pf.halation.intensity ?? 0) > 0) {
        current = this.runHalation(current, { halation: pf.halation } as EditState)
      }

      // 4. Preset Chromatic Aberration
      if (pf.chromaticAberration?.enabled && (pf.chromaticAberration.amount ?? 0) > 0) {
        // runCA takes the object directly
        current = this.runCA(current, pf.chromaticAberration as EditState['chromaticAberration'])
      }

      // 5. Preset Lens Distortion
      if (pf.lensDistortion?.enabled && (pf.lensDistortion.amount ?? 0) !== 0) {
        current = this.runLensDist(current, { lensDistortion: pf.lensDistortion } as EditState)
      }

      // 6. Preset Light Leaks
      if (pf.lightLeak?.enabled && (pf.lightLeak.opacity ?? 0) > 0 && this.overlayTextures.has('lightLeak')) {
        current = this.runOverlay(current, this.overlayTextures.get('lightLeak')!, {
          opacity: pf.lightLeak.opacity ?? 1,
          blendMode: pf.lightLeak.blendMode ?? 'screen',
          tintColor: pf.lightLeak.color ?? '#FFFFFF',
          tintStrength: pf.lightLeak.colorStrength ?? 0,
          offset: pf.lightLeak.position ?? [0, 0]
        })
      }

      // 7. Preset Vignette
      if (pf.vignette?.enabled && (pf.vignette.strength ?? 0) > 0) {
        current = this.runVignette(current, { vignette: pf.vignette } as EditState)
      }

      // 8. Preset Dust & Scratches
      if (pf.dustScratches?.enabled && (pf.dustScratches.opacity ?? 0) > 0 && this.overlayTextures.has('dustScratches')) {
        current = this.runOverlay(current, this.overlayTextures.get('dustScratches')!, {
          opacity: pf.dustScratches.opacity ?? 0.3,
          blendMode: pf.dustScratches.blendMode ?? 'screen',
          tintColor: '#FFFFFF',
          tintStrength: 0,
          offset: [0, 0]
        })
      }

      // 9. Preset Grain (TEXTURE OVERLAY)
      if (pf.grain?.enabled && (pf.grain.opacity ?? 0) > 0 && this.overlayTextures.has('presetGrain')) {
        current = this.runOverlay(current, this.overlayTextures.get('presetGrain')!, {
          opacity: pf.grain.opacity ?? 0.5,
          blendMode: pf.grain.blendMode ?? 'overlay',
          tintColor: '#FFFFFF',
          tintStrength: 0,
          offset: [0, 0]
        })
      }

      // 10. Preset Border
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

    // User Chromatic Aberration
    if (state.chromaticAberration.enabled && state.chromaticAberration.amount > 0) {
      current = this.runCA(current, state.chromaticAberration)
    }

    // User Lens Distortion
    if (state.lensDistortion.enabled && state.lensDistortion.amount !== 0) {
      current = this.runLensDist(current, state)
    }

    // User Vignette
    if (state.vignette.enabled && state.vignette.strength > 0) {
      current = this.runVignette(current, state)
    }

    // User Grain (Mathematical noise algorithm)
    if (state.grain.enabled && state.grain.intensity > 0) {
      current = this.runGrain(current, state)
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
    gl.uniform1f(u('u_blackLift'), s.fade.blackLift)
    gl.uniform1f(u('u_whiteCeiling'), s.fade.whiteCeiling)
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
    this.draw()
    return tex
  }

  private runGrain(input: WebGLTexture, s: EditState): WebGLTexture {
    const gl = this.gl
    const { fbo, tex } = this.getNextFBO()
    const prog = this.progGrain
    this.bindProgram(prog, input, fbo)
    const u = (n: string) => gl.getUniformLocation(prog, n)
    gl.uniform1f(u('u_intensity'), s.grain.intensity)
    gl.uniform1f(u('u_size'), s.grain.size)
    gl.uniform1f(u('u_seed'), (Math.random() * 1000) | 0)
    gl.uniform1i(u('u_type'), ['fine','medium','coarse','film'].indexOf(s.grain.type))
    gl.uniform1f(u('u_roughness'), s.grain.roughness ?? 0.5)
    gl.uniform1i(u('u_luminosityMode'), (s.grain.luminosityMode ?? true) ? 1 : 0)
    gl.uniform1f(u('u_highlightReduction'), s.grain.highlightReduction ?? 0.4)
    this.draw()
    return tex
  }

  private runVignette(input: WebGLTexture, s: EditState): WebGLTexture {
    const gl = this.gl
    const { fbo, tex } = this.getNextFBO()
    const prog = this.progVignette
    this.bindProgram(prog, input, fbo)
    const u = (n: string) => gl.getUniformLocation(prog, n)
    gl.uniform1f(u('u_strength'), s.vignette.strength)
    gl.uniform1f(u('u_feather'), s.vignette.feather)
    gl.uniform1f(u('u_midpoint'), s.vignette.midpoint)
    gl.uniform1i(u('u_shape'), s.vignette.shape === 'oval' ? 0 : 1)
    gl.uniform1f(u('u_aspectRatio'), this.width / this.height)
    gl.uniform1f(u('u_exposureShift'), s.vignette.exposure ?? 0)
    this.draw()
    return tex
  }

  private runHalation(input: WebGLTexture, s: EditState): WebGLTexture {
    const gl = this.gl
    const { color, radius, threshold, intensity } = s.halation

    // Parse color
    const r = parseInt(color.slice(1, 3), 16) / 255
    const g = parseInt(color.slice(3, 5), 16) / 255
    const b = parseInt(color.slice(5, 7), 16) / 255

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

  private runCA(input: WebGLTexture, ca: EditState['chromaticAberration']): WebGLTexture {
    const gl = this.gl
    const { fbo, tex } = this.getNextFBO()
    this.bindProgram(this.progCA, input, fbo)
    gl.uniform1f(gl.getUniformLocation(this.progCA, 'u_amount'), ca.amount)
    gl.uniform1i(gl.getUniformLocation(this.progCA, 'u_radialFalloff'), (ca.radialFalloff ?? true) ? 1 : 0)
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

    const r = parseInt(params.tintColor.slice(1,3), 16)/255 || 0
    const g = parseInt(params.tintColor.slice(3,5), 16)/255 || 0
    const b = parseInt(params.tintColor.slice(5,7), 16)/255 || 0
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
    const { fbo, tex } = this.getNextFBO()
    this.bindProgram(this.progLensDist, input, fbo)
    gl.uniform1f(gl.getUniformLocation(this.progLensDist, 'u_amount'), s.lensDistortion.amount)
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

  // ── Capture the current canvas as a data URL (Option A export parity) ──────
  getCanvasDataURL(type = 'image/jpeg', quality = 0.92): string {
    return this.outputCanvas.toDataURL(type, quality)
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
    if (this.halTexture) gl.deleteTexture(this.halTexture)
    if (this.halTexture2) gl.deleteTexture(this.halTexture2)
    this.fbTextures.forEach(t => gl.deleteTexture(t))
    this.fbos.forEach(f => gl.deleteFramebuffer(f))
    if (this.halFBO) gl.deleteFramebuffer(this.halFBO)
    if (this.halFBO2) gl.deleteFramebuffer(this.halFBO2)
  }
}
