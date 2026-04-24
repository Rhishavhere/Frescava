# State and Data Flow

This document captures how runtime state moves through Frescava.

## Store Topology

## `editStore`

File: `src/renderer/store/editStore.ts`

Owns:
- active image metadata (`imagePath`, dimensions, preview URL)
- current edit parameters (`params`)
- history snapshots for undo/redo
- before/after toggle flag (`showOriginal`)

Important behavior:
- `loadImage()` resets params/history to defaults
- `applyPreset()` writes preset effects into `params.presetFilters`
- root effect params are reserved for manual user effects

## `tabStore` / `useSessionStore`

File: `src/renderer/store/tabStore.ts`

Owns:
- multiple editor sessions
- active session id
- active image id per session
- per-image adjustments and dirty state
- shared preset id/intensity across session

Important behavior:
- switching image/session flushes current `editStore.params` back into session image adjustments
- then hydrates `editStore` from selected image snapshot

## `presetStore`

File: `src/renderer/store/presetStore.ts`

Owns:
- loaded presets array
- selected preset id
- favorites set

Source of truth:
- loads from `window.frame.assets.listPresets()`

## `projectStore`

File: `src/renderer/store/projectStore.ts`

Owns:
- current project file path for save vs save-as behavior
- project list/load interactions

## `uiStore`

File: `src/renderer/store/uiStore.ts`

Owns:
- active app tab
- right panel tab
- modal state (confirm dialogs)
- non-domain UI flags

## Edit Lifecycle

1. User opens image(s) from Home or DropZone.
2. Main returns preview metadata via IPC.
3. Session store creates/updates session and image entries.
4. Edit store is hydrated with selected image.
5. UI controls mutate `editStore.params`.
6. `ImageCanvas` triggers `RenderPipeline.render(params)` on change.
7. Save/export/project actions serialize params as needed.

## Preset Layering Model

Current rendering model in `RenderPipeline` is intentionally layered:

- **Layer 1 (preset base):**
  - LUT and preset-provided effects from `params.presetFilters`
- **Layer 2 (manual adjustments):**
  - slider-based correction pass (exposure, contrast, etc.)
- **Layer 3 (manual effects):**
  - root effect params (`params.vignette`, `params.halation`, etc.)

This lets users apply a preset look, then stack personal modifications predictably.

## Session and Batch Synchronization

The synchronization challenge is preserving unsaved edits when switching:

- Before switch:
  - current `editStore.params` are saved into active `BatchImage.adjustments`
- After switch:
  - selected image adjustments are copied back into `editStore`
  - shared preset id/intensity are also restored into `editStore`

Dirty tracking:
- editing marks active image as dirty
- save/export flows can mark active image clean
- removal/close actions can trigger confirm modal if dirty

## Persistence Formats

### Project File (`.frex`)

Type: `ProjectFile` from `src/shared/types.ts`

Contains:
- file version and project name
- source image path + dimensions
- serialized edit state (excluding duplicated image fields)
- preview data URL
- timestamp

### Preset Definition

Preset source:
- `assets/presets/<id>/preset.json`

Normalization:
- main process converts `PresetDef` into `Preset`
- runtime object includes derived fields like `folderName`, `thumbnailFile`, and normalized defaults

## Renderer/Main Data Boundary

Cross-process DTOs are centralized in `src/shared/types.ts`.
Do not introduce ad-hoc payload objects in component code; add/update shared types first.
