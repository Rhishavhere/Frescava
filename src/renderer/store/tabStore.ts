import { create } from 'zustand'
import { useEditStore, DEFAULT_EDIT_STATE } from './editStore'
import type { EditState } from '@shared/types'

// ─── Types ────────────────────────────────────────────────────────────────────

export type BatchAdjustments = Omit<EditState,
  'imagePath' | 'imageWidth' | 'imageHeight' | 'presetId' | 'presetIntensity'
>

const DEFAULT_ADJUSTMENTS: BatchAdjustments = {
  exposure: 0, contrast: 0, highlights: 0, shadows: 0, whites: 0, blacks: 0,
  temperature: 0, tint: 0, vibrance: 0, saturation: 0,
  sharpness: 0, noiseReduction: 0, clarity: 0, texture: 0,
  grain: { enabled: false, type: 'fine', intensity: 0.3, size: 1.0 },
  vignette: { enabled: false, shape: 'oval', strength: 0.5, feather: 0.5, midpoint: 0.7 },
  halation: { enabled: false, color: '#FF4422', radius: 40, threshold: 0.75, intensity: 0.4 },
  chromaticAberration: { enabled: false, amount: 3 },
  bloom: { enabled: false, threshold: 0.75, intensity: 0.3, character: 'soft' },
  lensDistortion: { enabled: false, amount: 0 },
  lightLeak: { enabled: false, textureId: null, color: '#FFA050', position: [0, 0], intensity: 0.5 },
  border: { enabled: false, type: null, color: '#FFFFFF', width: 40, cornerRadius: 0 },
}

export interface BatchImage {
  id: string
  label: string
  imagePath: string
  imageDataURL: string
  imageWidth: number
  imageHeight: number
  adjustments: BatchAdjustments
}

export interface EditorSession {
  id: string
  label: string               // first image name or "Session N"
  activeImageId: string | null
  images: BatchImage[]
  sharedPresetId: string | null
  sharedPresetIntensity: number
}

// ─── Store ────────────────────────────────────────────────────────────────────

interface SessionStore {
  sessions: EditorSession[]
  activeSessionId: string | null

  /** Create a brand-new session (from Home) with one or more images */
  openSession: (results: Array<{ path: string; dataURL: string; width: number; height: number }>) => void
  /** Add images to the currently active session batch */
  addToSession: (results: Array<{ path: string; dataURL: string; width: number; height: number }>) => void
  /** Close an entire session */
  closeSession: (id: string) => void
  /** Switch the active session */
  switchSession: (id: string) => void

  /** Switch the active image within the current session */
  setActiveImage: (imageId: string) => void
  /** Remove an image from the current batch */
  removeImage: (imageId: string) => void

  /** Apply a preset to ALL images in the current session */
  applyPresetToAll: (presetId: string | null, intensity: number) => void

  /** Get all images in the active session (for export) */
  getActiveBatch: () => BatchImage[]
  getActiveSession: () => EditorSession | null
}

let uid = 0
const makeId = () => `s-${++uid}`

function makeImage(result: { path: string; dataURL: string; width: number; height: number }): BatchImage {
  return {
    id: makeId(),
    label: result.path.split(/[\\/]/).pop() ?? 'Image',
    imagePath: result.path,
    imageDataURL: result.dataURL,
    imageWidth: result.width,
    imageHeight: result.height,
    adjustments: { ...DEFAULT_ADJUSTMENTS },
  }
}

function syncEditStore(session: EditorSession) {
  const img = session.images.find(i => i.id === session.activeImageId)
  if (!img) return
  const es = useEditStore.getState()
  es.loadImage(img.imagePath, img.imageWidth, img.imageHeight, img.imageDataURL)
  es.resetAll()
  // Restore per-image adjustments
  Object.entries(img.adjustments).forEach(([k, v]) => {
    if (v !== null && typeof v === 'object' && !Array.isArray(v)) {
      Object.entries(v as Record<string, unknown>).forEach(([sk, sv]) => {
        es.setNestedParam(k as any, sk, sv)
      })
    } else {
      es.setParam(k as any, v as any)
    }
  })
  // Restore shared preset
  es.setParam('presetId', session.sharedPresetId)
  es.setParam('presetIntensity', session.sharedPresetIntensity)
}

function saveCurrentImageAdjustments(session: EditorSession): BatchAdjustments {
  const { params } = useEditStore.getState()
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { presetId: _p, presetIntensity: _i, ...adjustments } = params
  return adjustments as BatchAdjustments
}

export const useSessionStore = create<SessionStore>((set, get) => ({
  sessions: [],
  activeSessionId: null,

  openSession: (results) => {
    const { sessions, activeSessionId } = get()

    // Flush current image adjustments back into the current session
    if (activeSessionId) {
      const current = sessions.find(s => s.id === activeSessionId)
      if (current?.activeImageId) {
        const adj = saveCurrentImageAdjustments(current)
        set(s => ({
          sessions: s.sessions.map(sess =>
            sess.id === activeSessionId ? {
              ...sess,
              images: sess.images.map(img =>
                img.id === current.activeImageId ? { ...img, adjustments: adj } : img
              ),
            } : sess
          ),
        }))
      }
    }

    const images = results.map(makeImage)
    const sessionId = makeId()
    const newSession: EditorSession = {
      id: sessionId,
      label: images[0]?.label ?? 'New Session',
      activeImageId: images[0]?.id ?? null,
      images,
      sharedPresetId: null,
      sharedPresetIntensity: 1,
    }

    set(s => ({ sessions: [...s.sessions, newSession], activeSessionId: sessionId }))
    syncEditStore(newSession)
  },

  addToSession: (results) => {
    const { sessions, activeSessionId } = get()
    if (!activeSessionId) {
      get().openSession(results)
      return
    }

    const current = sessions.find(s => s.id === activeSessionId)
    if (!current) return

    const newImages = results.map(r => {
      const img = makeImage(r)
      // Inherit shared preset
      return img
    })

    set(s => ({
      sessions: s.sessions.map(sess =>
        sess.id === activeSessionId
          ? { ...sess, images: [...sess.images, ...newImages] }
          : sess
      ),
    }))
    // No auto-switch — user stays on current image
  },

  closeSession: (id) => {
    const { sessions, activeSessionId } = get()
    const idx = sessions.findIndex(s => s.id === id)
    const newSessions = sessions.filter(s => s.id !== id)
    set({ sessions: newSessions })

    if (activeSessionId === id) {
      const next = newSessions[Math.min(idx, newSessions.length - 1)]
      if (next) {
        get().switchSession(next.id)
      } else {
        set({ activeSessionId: null })
        useEditStore.getState().loadImage('', 0, 0, '')
      }
    }
  },

  switchSession: (id) => {
    const { sessions, activeSessionId } = get()
    if (activeSessionId === id) return

    // Save current adjustments
    const current = sessions.find(s => s.id === activeSessionId)
    if (current?.activeImageId) {
      const adj = saveCurrentImageAdjustments(current)
      set(s => ({
        sessions: s.sessions.map(sess =>
          sess.id === activeSessionId ? {
            ...sess,
            images: sess.images.map(img =>
              img.id === current.activeImageId ? { ...img, adjustments: adj } : img
            ),
          } : sess
        ),
      }))
    }

    const next = sessions.find(s => s.id === id)
    if (!next) return
    set({ activeSessionId: id })
    syncEditStore(next)
  },

  setActiveImage: (imageId) => {
    const { sessions, activeSessionId } = get()
    const session = sessions.find(s => s.id === activeSessionId)
    if (!session || session.activeImageId === imageId) return

    // Save current adjustments
    const adj = saveCurrentImageAdjustments(session)
    set(s => ({
      sessions: s.sessions.map(sess =>
        sess.id === activeSessionId ? {
          ...sess,
          activeImageId: imageId,
          images: sess.images.map(img =>
            img.id === session.activeImageId ? { ...img, adjustments: adj } : img
          ),
        } : sess
      ),
    }))

    const updated = get().sessions.find(s => s.id === activeSessionId)!
    syncEditStore(updated)
  },

  removeImage: (imageId) => {
    const { sessions, activeSessionId } = get()
    const session = sessions.find(s => s.id === activeSessionId)
    if (!session) return

    const newImages = session.images.filter(i => i.id !== imageId)
    const wasActive = session.activeImageId === imageId
    const newActiveId = wasActive
      ? (newImages[0]?.id ?? null)
      : session.activeImageId

    set(s => ({
      sessions: s.sessions.map(sess =>
        sess.id === activeSessionId
          ? { ...sess, images: newImages, activeImageId: newActiveId }
          : sess
      ),
    }))

    if (wasActive && newActiveId) {
      const updated = get().sessions.find(s => s.id === activeSessionId)!
      syncEditStore(updated)
    } else if (!newImages.length) {
      useEditStore.getState().loadImage('', 0, 0, '')
    }
  },

  applyPresetToAll: (presetId, intensity) => {
    const { activeSessionId } = get()
    if (!activeSessionId) return
    set(s => ({
      sessions: s.sessions.map(sess =>
        sess.id === activeSessionId
          ? { ...sess, sharedPresetId: presetId, sharedPresetIntensity: intensity }
          : sess
      ),
    }))
    // Also update editStore for the current image
    useEditStore.getState().setParam('presetId', presetId)
    useEditStore.getState().setParam('presetIntensity', intensity)
  },

  getActiveBatch: () => {
    const { sessions, activeSessionId } = get()
    return sessions.find(s => s.id === activeSessionId)?.images ?? []
  },

  getActiveSession: () => {
    const { sessions, activeSessionId } = get()
    return sessions.find(s => s.id === activeSessionId) ?? null
  },
}))

// ─── Keep backward compat: export as useTabStore ──────────────────────────────
export { useSessionStore as useTabStore }
