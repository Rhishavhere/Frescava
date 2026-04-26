# Frescava

Desktop photo editor built with Electron, React, TypeScript, WebGL2, and Sharp.

This README is the entrypoint to the documentation set and reflects the current repository state.

## Current Product State

Implemented now:
- Home **Open** for multiple images **or** a Frescava **`.frex`** project (same dialog)
- Editor with preset strip, adjustment panel, effects panel, and preset settings
- WebGL preview renderer with multi-pass effect pipeline
- **Single** editor session with a **batch** strip (per-image full edit state; **Apply to all** copies the active look to other images in the batch)
- Project save/load via `.frex` files; opening a project hydrates the saved edit state
- Export via Sharp (single and batch)
- Electron frameless shell and typed preload bridge

Planned but not implemented in runtime yet:
- Templates tab (stub)
- Canvas tab (stub)
- Explore tab (stub)
- License/paywall/auth/AI backend flows

## Quick Start

Prerequisites:
- Node.js 20+
- npm

Install and run:

```bash
npm install
npm run dev
```

Build and package:

```bash
npm run build
npm run dist
```

Type checking:

```bash
npm run typecheck
```

## Docs Index

- `Docs/CODEBASE_MAP.md` - complete repo map by directory and file responsibility
- `Docs/ARCHITECTURE.md` - renderer/main/preload architecture and rendering pipeline
- `Docs/STATE_AND_DATA_FLOW.md` - Zustand stores, session sync model, and edit lifecycle
- `Docs/IPC_REFERENCE.md` - authoritative IPC channels and request/response contracts
- `Docs/PRESET_DESIGN_GUIDE.md` - preset authoring format and asset conventions
- `Docs/PRODUCT.md` - product vision, roadmap, and planned modules

## Tech Stack

- Electron 28 + `electron-vite`
- React 18 + TypeScript
- Zustand + Immer
- WebGL2 + GLSL shader passes for live preview
- Sharp for export and image loading in main process
- TailwindCSS for styling

## Important Notes

- The app supports JPEG/PNG/WebP import and JPEG/PNG export; the Home open dialog also lists **`.frex`** projects.
- There is no formal test suite configured yet in this repository.
