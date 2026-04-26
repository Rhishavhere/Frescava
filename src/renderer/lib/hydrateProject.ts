import type { ProjectFile, EditState } from '@shared/types'
import { useEditStore, DEFAULT_EDIT_STATE } from '../store/editStore'
import { useSessionStore, type BatchAdjustments } from '../store/tabStore'
import { usePresetStore } from '../store/presetStore'
import { useProjectStore } from '../store/projectStore'

type EditParams = Omit<EditState, 'imagePath' | 'imageWidth' | 'imageHeight'>

function isPlainObject(x: unknown): x is Record<string, unknown> {
  return x !== null && typeof x === 'object' && !Array.isArray(x)
}

function mergeEdit(
  defaults: Record<string, unknown>,
  saved: Record<string, unknown>
): Record<string, unknown> {
  const out: Record<string, unknown> = { ...defaults, ...saved }
  for (const k of Object.keys(defaults)) {
    const d = defaults[k]
    const s = saved[k] as unknown
    if (isPlainObject(d) && s !== undefined && isPlainObject(s)) {
      out[k] = mergeEdit(d, s)
    }
  }
  return out
}

/**
 * Replace editor state with a loaded `.frex` project: image from disk, params merged with defaults.
 */
export async function loadProjectIntoEditor(
  filePath: string,
  project: ProjectFile
): Promise<void> {
  const result = await window.frame.file.load(project.imagePath)
  useSessionStore.getState().forceCloseSession()
  useSessionStore.getState().openSession([
    { path: result.path, dataURL: result.dataURL, width: result.width, height: result.height },
  ])

  const merged = mergeEdit(
    DEFAULT_EDIT_STATE as unknown as Record<string, unknown>,
    project.editState as unknown as Record<string, unknown>
  ) as EditParams

  useEditStore.setState({
    params: merged,
    history: [],
    historyIndex: -1,
  })

  useSessionStore.setState(s => {
    if (!s.session) return s
    return {
      session: {
        ...s.session,
        images: s.session.images.map((img, i) =>
          i === 0
            ? { ...img, adjustments: merged as unknown as BatchAdjustments, isDirty: false }
            : img
        ),
      },
    }
  })

  usePresetStore.getState().selectPreset(merged.presetId)
  useProjectStore.getState().setCurrentFilePath(filePath)
}
