# MapMaker — Conventions

## Code style

- No duplicate code. Extract shared logic into reusable functions or components.
- No comments unless absolutely necessary. Readable code is self-documenting — if you need a comment, refactor the code first.
- Keep components under ~50 lines of JSX. If a component is getting long, split it into smaller sub-components in the same file or extract shared UI into `/src/components/ui/`.
- No blank lines between sibling JSX elements. Spacing is handled by CSS (e.g. `space-y-3`), not by empty lines in the markup.
- Avoid props drilling. Use context or composition patterns when props pass through multiple levels.

## Stack

- Next.js 14 (App Router), TypeScript, Tailwind CSS
- MapLibre GL JS for map rendering (client-side only)

## Project structure

- `/src/app` — editor is the home page (`/`)
- `/src/components/editor/` — MapCanvas, DrawingToolbar, LayerPanel, FeatureForm, MapMetadata
- `/src/components/ui/` — shared UI primitives (Field, PanelHeader)
- `/src/lib/` — shared types, map style, draw engine, GeoJSON helpers
- `/src/lib/hooks/` — custom hooks (useMapInit, useDrawing, useFeatureRendering)

## Key principles

- Editor runs entirely client-side
- GeoJSON format must stay clean and exportable independently of the platform
- The `.mapmaker` export format (`mapmaker-format.ts`) must always serialize every field from `FeatureData`. When adding a new property to features, update both the export and import in `mapmaker-format.ts` so no data is lost on round-trip.
- UI is functional over pretty — editor ergonomics matter most
- All user-facing text (labels, placeholders, tooltips) must be in English
