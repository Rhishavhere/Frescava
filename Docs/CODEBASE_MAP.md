# Frescava Codebase Map

Authoritative structure guide for contributors and agents.

## Repository Root

- `assets/` - shipped LUTs, textures, preset folders
- `Docs/` - documentation set
- `electron/` - main process and preload bridge
- `src/` - renderer app and shared types
- `electron.vite.config.ts` - build configuration
- `package.json` - scripts, dependencies, packaging config
- `index.html` - renderer HTML shell and CSP

## Electron Layer

### `electron/main`

- `index.ts`
  - app startup lifecycle
  - browser window creation and native behaviors
  - `frescava://` protocol registration and temp preview serving
  - base file loading IPC handlers (`file:open`, `file:openMultiple`, `file:openForEditor`, `file:load`, `file:loadFull`) and window routing for the editor (`window:openEditor`, launch payload, `editor:openFiles`, `editor:openProject`)
- `ipc/assets.ts`
  - lists presets from `assets/presets/*/preset.json`
  - parses LUTs from `assets/luts/free`
  - loads texture bytes from relative asset paths
- `ipc/export.ts`
  - single export save dialog + pipeline
  - batch export folder selection + iterative save
- `ipc/projects.ts`
  - `.frex` project save/load/list operations

### `electron/preload`

- `index.ts`
  - exposes `window.frame` API including `file.openForEditor` and `window.onEditorOpenProject`
  - isolates renderer from Node/Electron internals

## Renderer Layer

### `src/renderer`

- `main.tsx` - React bootstrap
- `App.tsx` - top-level tab router and global keyboard handlers

### `src/renderer/pages`

- `Home.tsx` — entry UX; **Open** uses `file.openForEditor()` (images and/or `.frex` projects)
- `Editor.tsx` - main editing layout orchestration

### `src/renderer/components/editor`

- `DropZone.tsx` - import target when no image loaded
- `ImageCanvas.tsx` - WebGL preview; shows active **filename + unsaved dot** on canvas
- `PresetStrip.tsx` - preset browser/selection (active image only; use batch **Apply to all** to propagate)
- `PresetSettingsPanel.tsx` - active preset effect controls
- `AdjustmentPanel.tsx` - light/color/detail controls
- `EffectsPanel.tsx` - user effect controls
- `Toolbar.tsx` - actions (open/save/export etc.)
- `BatchStrip.tsx` - batch thumbnails, **Apply to all**, add images

### `src/renderer/components/ui`

Shared shell and UX controls, including:
- `TitleBar.tsx`
- `ConfirmModal.tsx`

### `src/renderer/store`

- `editStore.ts` - active image + params + history + before/after toggle
- `tabStore.ts` - single session + batch images (`useSessionStore`); per-image `adjustments`; dirty flags
- `presetStore.ts` - preset loading/favorites/selection
- `projectStore.ts` - save/load state and current file tracking
- `uiStore.ts` - tab, panel, modal, and general UI state

### `src/renderer/lib`

- `RenderPipeline.ts` - WebGL2 multi-pass renderer
- `shaders.ts` - GLSL shader source blocks
- `fullResRender.ts` - full-resolution rendering helper path for export workflows
- `hydrateProject.ts` - apply a loaded `ProjectFile` + image into `editStore` / session / `projectStore`

## Shared Contracts

### `src/shared/types.ts`

Defines cross-process types:
- `EditState`
- preset schema (`PresetDef`, `Preset`)
- project schema (`ProjectFile`, `ProjectMeta`)
- preload API surface (`FrescavaAPI`)

## Assets

### `assets/luts/free`

- `.cube` LUT files used by presets and renderer

### `assets/presets/<preset-id>`

- `preset.json` required
- optional assets like `thumbnail.png`, `light_leak.png`, `dust.png`, `border.png`

### `assets/textures`

Repository for shared texture assets (global, non-preset-scoped)

## Build and Distribution

- Dev server: `npm run dev`
- Production build: `npm run build`
- Packaged app: `npm run dist`
- electron-builder config is under `package.json > build`

## Known Generated Artifact

- `electron.vite.config.1776770738189.mjs` appears generated/transpiled and should be reviewed for whether it belongs in source control.
