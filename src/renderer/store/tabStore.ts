import { create } from 'zustand'
import { useEditStore, DEFAULT_EDIT_STATE } from './editStore'
import { usePresetStore } from './presetStore'
import type { EditState } from '@shared/types'

// Lazy imports to avoid circular deps
const resetSavePath = () => {
  import('./projectStore').then(({ useProjectStore }) => {
    useProjectStore.getState().setCurrentFilePath(null)
  })
}

const openConfirm = (title: string, message: string, onConfirm: () => void) => {
  import('./uiStore').then(({ useUIStore }) => {
    useUIStore.getState().openConfirm({ title, message, confirmLabel: 'Discard', onConfirm })
  })
}

// ─── Types ────────────────────────────────────────────────────────────────────

/** Full per-image edit state (preset + user adjustments) */
export type BatchAdjustments = Omit<EditState, 'imagePath' | 'imageWidth' | 'imageHeight'>

const deepClone = <T>(o: T): T => JSON.parse(JSON.stringify(o))

const DEFAULT_BATCH_ADJUSTMENTS: BatchAdjustments = deepClone(DEFAULT_EDIT_STATE) as BatchAdjustments

// ─── Types ────────────────────────────────────────────────────────────────────

export interface BatchImage {
  id: string
  label: string
  imagePath: string
  imageDataURL: string
  imageWidth: number
  imageHeight: number
  adjustments: BatchAdjustments
  /** True if the image has been edited since last save */
  isDirty: boolean
}

export interface EditorSession {
  id: string
  /** Display label (first image name or session title) */
  label: string
  activeImageId: string | null
  images: BatchImage[]
}

// ─── Store ────────────────────────────────────────────────────────────────────

interface SessionStore {
  /** At most one editor session (single batch) */
  session: EditorSession | null

  /** Create session or add to the current batch if one exists */
  openSession: (results: Array<{ path: string; dataURL: string; width: number; height: number }>) => void
  addToSession: (results: Array<{ path: string; dataURL: string; width: number; height: number }>) => void
  closeSession: () => void
  forceCloseSession: () => void

  setActiveImage: (imageId: string) => void
  removeImage: (imageId: string) => void
  forceRemoveImage: (imageId: string) => void

  /**
   * Copies the current image's full edit state (preset + all adjustments) to every other
   * image in the batch. Does not change the active image's stored row (it's the source of truth in edit store).
   */
  applyCurrentEditToAll: () => void

  getActiveBatch: () => BatchImage[]
  getActiveSession: () => EditorSession | null

  markActiveImageDirty: () => void
  markActiveImageClean: () => void
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
    adjustments: deepClone(DEFAULT_BATCH_ADJUSTMENTS),
    isDirty: false,
  }
}

function saveCurrentImageAdjustments(): BatchAdjustments {
  const { params } = useEditStore.getState()
  return deepClone(params) as BatchAdjustments
}

function syncEditStore(sess: EditorSession): void {
  const img = sess.images.find(i => i.id === sess.activeImageId)
  if (!img) return
  useEditStore.getState().loadImage(img.imagePath, img.imageWidth, img.imageHeight, img.imageDataURL)
  useEditStore.setState({
    params: deepClone(img.adjustments),
    history: [],
    historyIndex: -1,
  })
  usePresetStore.getState().selectPreset(img.adjustments.presetId)
}

export const useSessionStore = create<SessionStore>((set, get) => ({
  session: null,

  openSession: (results) => {
    if (!results.length) return
    const { session } = get()

    if (session && session.images.length > 0) {
      get().addToSession(results)
      return
    }

    const images = results.map(makeImage)
    const sessionId = makeId()
    const newSession: EditorSession = {
      id: sessionId,
      label: images[0]?.label ?? 'Session',
      activeImageId: images[0]?.id ?? null,
      images,
    }
    set({ session: newSession })
    syncEditStore(newSession)
    resetSavePath()
  },

  addToSession: (results) => {
    if (!results.length) return
    const { session } = get()
    if (!session) {
      get().openSession(results)
      return
    }

    const adj = saveCurrentImageAdjustments()
    const withFlush: EditorSession = {
      ...session,
      images: session.images.map(img =>
        img.id === session.activeImageId ? { ...img, adjustments: adj } : img
      ),
    }

    const newImages = results.map(makeImage)
    set({
      session: {
        ...withFlush,
        images: [...withFlush.images, ...newImages],
      },
    })
  },

  closeSession: () => {
    const { session } = get()
    if (!session) return
    const hasDirty = session.images.some(img => img.isDirty)
    if (hasDirty) {
      const dirtyCount = session.images.filter(i => i.isDirty).length
      openConfirm(
        'Unsaved Changes',
        `${dirtyCount} image${dirtyCount > 1 ? 's have' : ' has'} unsaved edits. Closing will discard them.`,
        () => get().forceCloseSession()
      )
      return
    }
    get().forceCloseSession()
  },

  forceCloseSession: () => {
    set({ session: null })
    useEditStore.getState().loadImage('', 0, 0, '')
    usePresetStore.getState().selectPreset(null)
  },

  setActiveImage: (imageId) => {
    const { session } = get()
    if (!session || session.activeImageId === imageId) return

    const adj = saveCurrentImageAdjustments()
    set(s => {
      if (!s.session) return s
      return {
        session: {
          ...s.session,
          activeImageId: imageId,
          images: s.session.images.map(img =>
            img.id === s.session!.activeImageId ? { ...img, adjustments: adj } : img
          ),
        },
      }
    })

    const updated = get().session!
    syncEditStore(updated)
  },

  removeImage: (imageId) => {
    const { session } = get()
    if (!session) return
    const img = session.images.find(i => i.id === imageId)
    if (img?.isDirty) {
      openConfirm(
        'Unsaved Changes',
        `"${img.label}" has unsaved edits. Remove it anyway?`,
        () => get().forceRemoveImage(imageId)
      )
      return
    }
    get().forceRemoveImage(imageId)
  },

  forceRemoveImage: (imageId) => {
    const { session } = get()
    if (!session) return

    const newImages = session.images.filter(i => i.id !== imageId)
    const wasActive = session.activeImageId === imageId
    const newActiveId = wasActive ? (newImages[0]?.id ?? null) : session.activeImageId

    if (!newImages.length) {
      get().forceCloseSession()
      return
    }

    set(s => ({
      session: s.session
        ? { ...s.session, images: newImages, activeImageId: newActiveId }
        : null,
    }))

    if (wasActive && newActiveId) {
      const upd = get().session!
      syncEditStore(upd)
    }
  },

  applyCurrentEditToAll: () => {
    const { session } = get()
    if (!session?.activeImageId || session.images.length < 2) return
    const snapshot = saveCurrentImageAdjustments()
    const activeId = session.activeImageId
    set(s => {
      if (!s.session) return s
      return {
        session: {
          ...s.session,
          images: s.session.images.map(img => {
            if (img.id === activeId) {
              return { ...img, adjustments: deepClone(snapshot) }
            }
            return { ...img, adjustments: deepClone(snapshot), isDirty: true }
          }),
        },
      }
    })
  },

  getActiveBatch: () => {
    return get().session?.images ?? []
  },

  getActiveSession: () => {
    return get().session
  },

  markActiveImageDirty: () => {
    const { session } = get()
    if (!session?.activeImageId) return
    const id = session.activeImageId
    set(s => {
      if (!s.session) return s
      return {
        session: {
          ...s.session,
          images: s.session.images.map(img => (img.id === id ? { ...img, isDirty: true } : img)),
        },
      }
    })
  },

  markActiveImageClean: () => {
    const { session } = get()
    if (!session?.activeImageId) return
    const id = session.activeImageId
    set(s => {
      if (!s.session) return s
      return {
        session: {
          ...s.session,
          images: s.session.images.map(img => (img.id === id ? { ...img, isDirty: false } : img)),
        },
      }
    })
  },
}))

// ─── Backward compat export ────────────────────────────────────────────────────
export { useSessionStore as useTabStore }
