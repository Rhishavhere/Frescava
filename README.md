# Frescava

Desktop photo editor built with Electron, React, TypeScript, WebGL2, and Sharp.

This README is the entrypoint to the documentation set and reflects the current repository state.

## Current Product State

Implemented now:
- Home flow for opening one or multiple images
- Editor with preset strip, adjustment panel, effects panel, and preset settings
- WebGL preview renderer with multi-pass effect pipeline
- Batch/session workflows (multiple editor sessions and multi-image strips)
- Project save/load via `.frex` files
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

- The app currently supports JPEG/PNG/WebP import and JPEG/PNG export.
- There is no formal test suite configured yet in this repository.
- `src/renderer/pages/Editor.tsx` is currently modified in the working tree (local in-progress changes).
