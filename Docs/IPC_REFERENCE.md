# IPC Reference

Authoritative IPC contract between renderer and main process.

All calls are made through `window.frame` exposed in `electron/preload/index.ts`.

## Channel Groups

## `file`

### `file:open`

- Request: none
- Response: `FileOpenResult | null`
- Behavior: opens native dialog, loads one image preview

### `file:openMultiple`

- Request: none
- Response: `FileOpenResult[]`
- Behavior: opens native dialog with multi-select

### `file:load`

- Request: `(path: string)`
- Response: `FileOpenResult`
- Behavior: loads a known image path as preview

### `file:loadFull`

- Request: `(path: string)`
- Response: `FileOpenResult`
- Behavior: loads full-resolution data URL for higher-fidelity export workflows

## `export`

### `export:save`

- Request: `(opts: ExportOptions)`
- Response: `ExportResult`
- Behavior:
  - prompts save destination
  - exports from `canvasDataURL` if present, otherwise from original image via Sharp

### `export:exportBatch`

- Request: `(opts: { images: ExportOptions[]; outputDir: string })`
- Response: `{ success: boolean; exported?: string[]; count?: number; error?: string }`
- Behavior:
  - prompts destination directory
  - exports each image to `frescava_<name>.jpg`

## `assets`

### `assets:loadLUT`

- Request: `(filename: string)`
- Response: `LUTData`
- Behavior:
  - reads `.cube` from `assets/luts/free`
  - attempts case-insensitive fallback filename match

### `assets:loadTexture`

- Request: `(relativePath: string)`
- Response: `ArrayBuffer`
- Behavior: loads texture bytes relative to `assets` root

### `assets:listPresets`

- Request: none
- Response: `Preset[]`
- Behavior:
  - scans `assets/presets/*/preset.json`
  - normalizes rich preset definitions into runtime-friendly preset objects

## `projects`

### `projects:save`

- Request: `(project: ProjectFile)`
- Response: `{ path: string }`
- Behavior: auto-named `.frex` save under user Documents/Frescava Projects

### `projects:saveAt`

- Request: `(filePath: string, project: ProjectFile)`
- Response: `{ path: string }`
- Behavior: overwrite save to existing path

### `projects:saveAs`

- Request: `(project: ProjectFile)`
- Response: `{ path: string } | null`
- Behavior: save dialog + write `.frex`

### `projects:list`

- Request: none
- Response: `ProjectMeta[]`
- Behavior: scans `.frex` files and returns newest-first metadata

### `projects:load`

- Request: `(path: string)`
- Response: `ProjectFile`
- Behavior: reads and parses project JSON

## `app`

### `app:minimize`

- Request: none
- Response: void

### `app:maximize`

- Request: none
- Response: void
- Behavior: toggles maximize/unmaximize

### `app:close`

- Request: none
- Response: void

### `app:isMaximized`

- Request: none
- Response: `boolean`

## Data Contracts

Primary shared interfaces live in `src/shared/types.ts`:
- `FrescavaAPI`
- `FileOpenResult`
- `ExportOptions`
- `ExportResult`
- `Preset`, `PresetDef`
- `ProjectFile`, `ProjectMeta`
- `EditState`

If any channel request or response changes, update `src/shared/types.ts` and this file in the same change.
