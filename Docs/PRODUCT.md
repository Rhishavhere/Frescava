# Frescava Product Spec and Roadmap

This document defines product intent and planned direction.
For currently implemented behavior, see `Docs/ARCHITECTURE.md`.

## Product Direction

Frescava is a creator-first desktop editor optimized for:
- fast aesthetic transforms
- cinematic preset workflows
- approachable controls with strong visual feedback
- eventual expansion into template and canvas-driven creation workflows

## Current vs Planned Zones

### Zone 1 - Editor

Status: **implemented (core)**

Implemented:
- image import/open single + multiple
- preset browsing and application
- exposure/color/detail adjustments
- effects controls (fade, grain, vignette, halation, CA, bloom, lens, leaks, dust, borders)
- before/after hold-to-view behavior
- batch strip with per-image adjustments in a session
- project save/load and export

Planned improvements:
- richer history UI
- deeper keyboard shortcut matrix
- more preset packs and quality tooling

### Zone 2 - Text and Graphics

Status: **not implemented yet**

Planned:
- layered text composition
- typography presets
- overlay asset packs
- creator annotation primitives

### Zone 3 - AI Assistance

Status: **not implemented yet in runtime**

Planned:
- local assistance (masking, upscale, cleanup)
- optional online features (captioning/style helpers via proxy backend)
- usage controls and plan limits

### Zone 4 - Templates

Status: **stub tab only**

Planned:
- template browser
- structured poster/social compositions
- editable text and crop slots
- template-based export flows

### Zone 5 - Canvas

Status: **stub tab only**

Planned:
- freeform infinite workspace
- multi-image concept/moodboarding
- reusable content blocks

## Prioritized Roadmap

### Milestone A - Editor Maturity

- stabilize render parity between preview and export
- add robust regressions checks for effect stacks
- improve preset authoring/validation tooling
- add test baseline for stores and IPC handlers

### Milestone B - Templates v1

- implement template runtime model
- template JSON schema + validation
- editing UX for text/crops
- production-ready template export

### Milestone C - Optional Services Layer

- gated account model (if needed for business model)
- backend usage/event telemetry
- optional AI proxy services

### Milestone D - Canvas v1

- workspace data model
- performant multi-item rendering
- import/export and persistence

## Non-Goals (Current Scope)

- raw image pipeline support
- cloud-first image sync
- mandatory account requirement for baseline editing

## Documentation Rule

When roadmap items ship, update in same PR:
- `Docs/PRODUCT.md` (status change)
- `Docs/ARCHITECTURE.md` (implementation details)
- `Docs/IPC_REFERENCE.md` and `Docs/STATE_AND_DATA_FLOW.md` (contract updates)
