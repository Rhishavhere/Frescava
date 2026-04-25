# Frescava Documentation Index

Use this as the primary entrypoint for repository documentation.

## Core Docs

- `Docs/CODEBASE_MAP.md` - detailed repository map and ownership
- `Docs/ARCHITECTURE.md` - current implementation architecture (main/preload/renderer)
- `Docs/STATE_AND_DATA_FLOW.md` - store orchestration, edit lifecycle, **edit history (current stack + planned timeline)**, persistence flow
- `Docs/IPC_REFERENCE.md` - complete IPC surface and payload contracts
- `Docs/PRESET_DESIGN_GUIDE.md` - preset authoring and asset format
- `Docs/PRODUCT.md` - product vision and roadmap (planned work)

## Reading Order

For onboarding:
1. `README.md`
2. `Docs/CODEBASE_MAP.md`
3. `Docs/ARCHITECTURE.md`
4. `Docs/STATE_AND_DATA_FLOW.md`
5. `Docs/IPC_REFERENCE.md`

For feature implementation:
1. `Docs/ARCHITECTURE.md`
2. `Docs/STATE_AND_DATA_FLOW.md`
3. `Docs/IPC_REFERENCE.md`
4. related source files referenced in each doc

## Documentation Maintenance Policy

Whenever behavior changes:
- update relevant docs in the same PR
- prefer marking status as "implemented" or "planned" explicitly
- avoid documenting speculative modules as if they already exist
