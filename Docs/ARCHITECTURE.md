# Frescava Architecture (Current Implementation)

This document describes what is implemented in this repository today.
For roadmap plans and future systems, see `Docs/PRODUCT.md`.

## Runtime Overview

Frescava is an Electron desktop app with three layers:

- **Main process** (`electron/main`) for native OS access, dialogs, file IO, Sharp processing, and IPC handlers.
- **Preload bridge** (`electron/preload`) exposing a constrained `window.frame` API.
- **Renderer app** (`src/renderer`) with React UI, Zustand stores, and WebGL rendering.

## Process Responsibilities

### Main Process

Primary entry: `electron/main/index.ts`

Responsibilities:
- Create frameless BrowserWindow and app lifecycle wiring
- Register app IPC channels (`app:minimize`, `app:maximize`, `app:close`, `app:isMaximized`)
- Handle file open/load channels (`file:open`, `file:openMultiple`, `file:load`, `file:loadFull`)
- Serve temporary preview files via `frescava://` custom protocol
- Register sub-handler modules:
  - `electron/main/ipc/assets.ts`
  - `electron/main/ipc/export.ts`
  - `electron/main/ipc/projects.ts`

### Preload

Entry: `electron/preload/index.ts`

Responsibilities:
- Expose typed channel groups under `window.frame`:
  - `file`
  - `export`
  - `assets`
  - `projects`
  - `app`
- Keep `contextIsolation: true` and `nodeIntegration: false` boundary clean

### Renderer

Entry: `src/renderer/main.tsx`

Responsibilities:
- Route between tabs (`home`, `editor`, `templates`, `canvas`, `explore`) in `src/renderer/App.tsx`
- Render full editor UI in `src/renderer/pages/Editor.tsx`
- Manage app state in Zustand stores under `src/renderer/store`
- Drive GPU preview pipeline through `src/renderer/lib/RenderPipeline.ts`

## UI Architecture

### Tabs

- `home`: real page (`src/renderer/pages/Home.tsx`)
- `editor`: real page (`src/renderer/pages/Editor.tsx`)
- `templates`: stub in `App.tsx`
- `canvas`: stub in `App.tsx`
- `explore`: stub in `App.tsx`

### Editor Layout

`src/renderer/pages/Editor.tsx` composes a three-column workspace:

- **Left**: `PresetStrip`
- **Center**: `Toolbar`, `EditorTabBar`, `ImageCanvas`/`DropZone`, `BatchStrip`
- **Right**: tabbed `AdjustmentPanel`/`EffectsPanel` + `PresetSettingsPanel`

## Data and State Architecture

Core stores:
- `editStore`: image + edit params + history + original toggle
- `tabStore` (`useSessionStore` alias): multi-session and batch image orchestration
- `presetStore`: preset list, selected preset, favorites
- `projectStore`: save/load path and project operations
- `uiStore`: active tab, panel tab, confirm modal, UI states

Notable design choice:
- Preset-applied effects are stored in `params.presetFilters` (layer 1).
- User manual edits are stored in root effect params (layer 2).

This two-layer model is consumed directly by `RenderPipeline.render()`.

## Rendering Architecture

### Input Flow

1. User action updates Zustand params.
2. `ImageCanvas` observes param changes.
3. `RenderPipeline` re-renders to WebGL canvas.

### Pass Order (Implemented)

Inside `src/renderer/lib/RenderPipeline.ts`:

1. Base image texture
2. Preset layer: LUT + preset effect stack (if active)
3. User adjustments pass (exposure/contrast/highlights/etc.)
4. User effects pass (fade/halation/CA/lens/vignette/procedural grain)
5. Present to screen

Current implemented shader families:
- LUT (`LUT_FRAG`)
- Adjustments (`ADJUSTMENTS_FRAG`)
- Fade (`FADE_FRAG`)
- Halation extract/blur/composite
- Chromatic aberration
- Lens distortion
- Vignette
- Procedural grain
- Generic overlay blend pass

## File and Asset Loading Model

### Import

Main process image load behavior:
- `file:open` / `file:openMultiple`: chooses image via dialog then uses `loadImageFile()`
- `loadImageFile()` writes a preview JPEG into temp and returns `frescava://load/<name>` URL
- `file:loadFull` returns base64 full-resolution rotated JPEG

### Assets

`electron/main/ipc/assets.ts` scans and serves:
- LUTs from `assets/luts/free`
- Preset folders from `assets/presets/*/preset.json`
- Textures by relative path under `assets`

## Export Architecture

Channel: `export:save` and `export:exportBatch` in `electron/main/ipc/export.ts`

Two export modes:
- **Canvas parity mode**: when `canvasDataURL` is provided, export from rendered WebGL capture.
- **Sharp re-render mode**: process original file via Sharp transforms (brightness/saturation/contrast/sharpness).

Batch export:
- Chooses output directory once.
- Exports each image to `frescava_<basename>.jpg`.

## Project Persistence

Channel set in `electron/main/ipc/projects.ts`:
- `projects:save`
- `projects:saveAt`
- `projects:saveAs`
- `projects:list`
- `projects:load`

Storage location:
- User documents: `Frescava Projects`
- File extension: `.frex` JSON

## Security Posture (Current)

Implemented:
- `contextIsolation: true`
- `nodeIntegration: false`
- external links opened via `shell.openExternal`
- custom protocol path sanitization with basename + temp-dir guard
- production content protection via `setContentProtection(true)`

Not implemented yet:
- auth/license enforcement
- encrypted premium packs
- backend validation gates

## Settings (Home window) and future persistence

Global app preferences live in the **Home** window (see `FrescavaHomeShell` in `src/renderer/App.tsx` and `SettingsPage`).

- **Entry**: Editor title bar (Library, Settings) and Home title bar; both call `window.frame.openHome({ view })` to focus or create the Home window and show the right tab. Main uses `pendingHomeView` and IPC `home:openView` so a cold start or an already-open Home lands on the correct view.

- **Planned persistence**: `electron-store` in the main process (or a thin preload bridge) to read/write a single source of truth; main broadcasts updates to all renderers (e.g. `webContents.send` to every `BrowserWindow`, or a small channel the shell subscribes to). For **system theme** vs in-app light/dark, align with `nativeTheme` in main and map to CSS variables in the renderer. Cross-window `localStorage` is not a substitute unless both windows share the same storage origin; verify in packaged builds if used.

## Build and Packaging

Configured in `package.json`:
- `dev`: `electron-vite dev`
- `build`: `electron-vite build`
- `preview`: `electron-vite preview`
- `dist`: build + electron-builder

Packaging notes:
- App output directory: `dist-app`
- Bundled files: `out/**/*`, `assets/**/*`
- Targets: mac (`dmg` arm64/x64), windows (`nsis`)

## Drift Guard

If architecture changes, update these docs together:
- `Docs/ARCHITECTURE.md`
- `Docs/IPC_REFERENCE.md`
- `Docs/STATE_AND_DATA_FLOW.md`
- `Docs/CODEBASE_MAP.md`
