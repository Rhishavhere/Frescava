# State and Data Flow

This document captures how runtime state moves through Frescava.

## Store Topology

## `editStore`

File: `src/renderer/store/editStore.ts`

Owns:
- active image metadata (`imagePath`, dimensions, preview URL)
- current edit parameters (`params`)
- history snapshots for undo/redo (see [Edit history](#edit-history-current-implementation-and-roadmap))
- preview-only flags: `showOriginal` (hold “before”) and `compareMode` (side-by-side)

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

## Edit history (current implementation and roadmap)

**Implemented today:** Frescava keeps a **linear stack of parameter snapshots** for the active image. Each `HistoryEntry` stores a deep-copied `params` object (everything under `editStore.params`—preset id, intensity, `presetFilters`, adjustments, and effect toggles/values). It does **not** record UI-only state such as which panel is open, `showOriginal`, or `compareMode`.

**How entries are created**

- **`pushHistory()`** (file: `src/renderer/store/editStore.ts`) appends the **current** `params` after an edit, truncates any redo tail, and moves `historyIndex` to the new tip. The stack is capped (currently 100 entries); oldest entries are dropped when the cap is exceeded.
- **`applyPreset()`** saves the pre-preset `params` snapshot, then applies the preset into `params.presetFilters` (and related fields)—so the user can undo back to the state before that preset was applied.
- **`resetAll()`** saves the current `params` before replacing them with `DEFAULT_EDIT_STATE`, so undo can restore the pre-reset look.

**How undo/redo work**

- **Undo** moves `historyIndex` backward and restores `params` from the previous snapshot (or default edit state when stepping before the first entry).
- **Redo** moves forward and restores from the next snapshot.
- The toolbar exposes these via `canUndo` / `canRedo` and the undo/redo actions.

**Where `pushHistory` is wired**

- Typical pattern: continuous controls (e.g. sliders in adjustment and effects panels) call `pushHistory` on **`onChangeEnd`** (after the user finishes a drag or interaction), not on every pointer move. That keeps the stack small but means one undo step often corresponds to “revert the last completed adjustment gesture,” not every micro-movement.
- Not every code path that mutates `params` necessarily calls `pushHistory`; coverage should be treated as **partial** until audited. Any control that only calls `setParam` / `setNestedParam` / `setPresetFilterParam` without a matching `pushHistory` will **not** create a new history entry for that edit.

**Known gaps (to address in a later pass)**

- There is no **history list**, **labels**, or **jump to arbitrary step**—only sequential undo/redo.
- Snapshot semantics and “what counts as one edit” are not yet uniform across the whole UI (preset settings, toggles, and batch operations may need explicit history rules).
- **Planned product direction:** replace or augment this stack with a **proper edit history timeline** so users can **see discrete versions**, **select any step**, and **return to that full parameter state in one action** (optionally with naming, grouping, and clearer boundaries for slider sessions). That work will include revisiting when snapshots are taken, how history interacts with session/batch image switches, and persistence (e.g. whether history is saved with a project or remains session-scoped).

Until that timeline exists, treat the current system as a **practical but basic** undo/redo layer for `params`, not a full version browser.

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

## Project save vs image export

Two different pipelines exist:

| User action | What it does | Main IPC | Browse dialog? |
|-------------|--------------|----------|------------------|
| **Save** (toolbar) | Serializes the current image’s edit state + preview into a **`.frex` project** | First save: `projects:save` → `Documents/Frescava Projects/<name>_<timestamp>.frex`. Later: `projects:saveAt` to the remembered path. | **No** for normal Save. |
| **Save As…** (hover or Export menu) | Same `.frex` payload, user picks path/filename | `projects:saveAs` | **Yes** |
| **Export** (dropdown) | Renders a **JPEG/PNG** (canvas capture or full-res path) | `export:save` (single) or `export:exportBatch` (folder) | **Yes** (file or folder picker) |

`smartSave` in `src/renderer/store/projectStore.ts` implements the Save button: it uses the default project directory until `currentFilePath` is set, then overwrites in place. Export never writes `.frex` files; it only produces shareable image files.

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
