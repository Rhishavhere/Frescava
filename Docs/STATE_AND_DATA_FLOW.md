# State and Data Flow

This document captures how runtime state moves through Frescava.

## Store Topology

The editor’s domain state is split across the stores below. `editStore` holds the **active** image’s working copy; `useSessionStore` holds the **batch** of images and per-image snapshots when not active.

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
- **one** editor session at a time (`session: EditorSession | null`) — there are no multi-window session tabs
- `activeImageId` within that session
- per-image data: `BatchImage` stores **full** edit parameters (`BatchAdjustments` = the same shape as `editStore.params`, including `presetId`, `presetIntensity`, and `presetFilters`) plus a dirty flag

Important behavior:
- **Switching the active image** in the batch flushes current `editStore.params` into the previous image’s `adjustments`, then hydrates `editStore` (and `presetStore.selectedPresetId`) from the newly selected image.
- **New opens** (Home, DropZone, “Add images”) add to the current batch or create the only session; there is no separate “tab per batch.”
- **Apply to all** (batch strip): copies the current image’s full params to every other image in the batch and marks those others dirty (requires at least two images).
- Presets and sliders affect **only the active image** until the user uses Apply to all.

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

1. User opens image(s) and/or a **`.frex`** from Home (see `file:openForEditor`) or images from DropZone / editor toolbar.
2. Main returns preview metadata via IPC, or a **project** payload is passed to the editor to hydrate (see **Project open from Home** below).
3. Session store creates or extends the **single** session and image entries.
4. Edit store is hydrated with the selected image.
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

The synchronization challenge is preserving unsaved edits when switching images:

- **Before** switching the active image:
  - current `editStore.params` are written into the active `BatchImage.adjustments`
- **After** switching:
  - the selected image’s `adjustments` (full preset + manual stack) are loaded into `editStore` and the preset list selection is synced

**Dirty tracking**

- Edits mark the **active** image as dirty in the session store.
- A small **unsaved** indicator is shown on the **canvas** next to the active filename (not on batch thumbnails).
- Save/export flows can mark the **active** image clean (`markActiveImageClean`); the `.frex` model still serializes the **current** image’s state from `editStore` (see Toolbar `buildProjectFile`) unless extended later for full multi-image projects.
- Removing an image or closing the session can trigger a confirm if any image in the batch is dirty.

## Project open from Home (.frex)

File: `src/renderer/lib/hydrateProject.ts` — `loadProjectIntoEditor(filePath, project)`

- Clears the session, opens the project’s `imagePath` via `file:load`, builds one batch image, merges `ProjectFile.editState` with `DEFAULT_EDIT_STATE` (recursive merge for nested objects), and sets `projectStore.currentFilePath` to the `.frex` path.
- Invoked from the editor bootstrap when the launch payload is `{ type: 'project', ... }` or when the main process sends `editor:openProject` (editor already open).

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
