# idomaps — TODO

Last cleanup: launch day (PH + Reddit). Filtered to what matters now.

## P0 — UX bugs surfaced by first public users

These were discovered the day after the Reddit posts and need fixing
before the PH wave hits the gallery hard.

- [ ] **Anonymous fallback in `MapCard`** — when `ownerName` is empty,
      show "Anonymous" instead of a blank line. 5-min fix in
      `src/components/maps/MapCard.tsx`.
- [ ] **Block publish of "looks empty" maps** — if a map's only
      features are text features with empty `textContent`, refuse to
      flip `visibility` to `public` (or warn loudly). Surfaced by the
      Walser Valleys map (1 text feature, no text) appearing in the
      gallery as a blank tile.
- [ ] **Force `textContent` on text feature creation** — when a user
      clicks "Add label", initialise `textContent` to the source label
      so we never persist an empty text feature.
- [ ] **Display-name prompt** — first time a user makes a public map
      without a `name` set on their user doc, show a small modal
      "Pick a display name (will appear on your public maps)". Better
      than enforcing at signup; less friction.

## P1 — Mobile experience

Multiple Reddit commenters asked for it. Split the request:

- [ ] **Mobile viewer (read-only)** — `/maps/[id]` and `/embed/[id]`
      should look great on iOS Safari + Android Chrome. Map zoom,
      tooltips, legend should all work touch. ~3 days. High SEO
      impact (Google mobile-first indexing).
- [ ] **Mobile editor decision** — after the viewer ships and we see
      whether mobile users still ask for creation. If yes, plan a
      proper touch-first editor (3-4 weeks). If no, leave as-is.

## P2 — UNESCO map polish

The UNESCO seed map has 128 sites where the image falls back to
`whc.unesco.org/uploads/sites/site_XXX.jpg` because Wikidata didn't
have a Commons match. UNESCO's CDN often 503s.

- [ ] Fetch each missing site's Wikipedia article and pull the
      first inline image (a python/node script, ~30 min runtime,
      one-shot rebuild of `output.idomaps`)
- [ ] Or accept the gap — 90% of sites already have Commons images,
      not blocking anyone

## P3 — Convex bandwidth follow-up

Phase 1 shipped (b5d09d6, 8751c13, d904cd4). Still TODO:

- [ ] One-shot migration to rewrite remaining inline maps into
      file storage (admin script reading all maps where
      `features != null`, resaving via `saveMap`)
- [ ] After migration, drop the inline branches from `getMap` /
      `saveMap` and remove `features` / `groups` columns
- [ ] `lastFeaturesUpdatedAt` timestamp on the map doc so viewers
      can skip re-fetching the blob (ETag flow)
- [ ] Lightweight bandwidth monitor (log payload sizes in dev, warn
      in editor when a single session crosses a threshold)

## P4 — Growth features (not blocking)

- [ ] Export map as **PNG/SVG image** — recurring ask, Pro-tier
      candidate eventually
- [ ] **Collaboration** — shared editing via link. Big infra change
      (presence, conflict resolution). Park until demand is loud.
- [ ] **Map templates** beyond the seeds — let users start from
      e.g. "World countries", "France régions", "US states" with the
      polygons already drawn
- [ ] **AI assist** — "Generate a map of [topic]" using the
      `generate-map` skill behind a Pro feature. Validated demand
      from the Reddit threads ("can it suggest features?").

## P5 — Pre-existing flaky test

- [ ] `idomaps-format.test.ts` — "migrates legacy natgeo base map to
      liberty" is failing on `main` since before this session.
      Investigate and fix or update expectation.

## Done since last cleanup (for memory)

- Domain `idomaps.app` purchased + DNS configured + apex set as primary
- Vercel Analytics + Speed Insights wired in
- Dynamic sitemap pulling all public maps from Convex
- `FEATURE_LIMIT` raised from 150 → 500, soft warning at 250
- Hole punching on polygons (turf.difference + UI button)
- Image URLs on features rendered in tooltips with shimmer + lazy load
- 7 new seed maps: UNESCO, European castles, Animals 2025, 15th-century
  cities, Volcanoes, Ibn Battuta routes
- Public maps gallery scrolling fix
- Tooltip image: `object-fit: contain` + `overflow-wrap: anywhere`
- Description sanitization (no more truncated `...`, no HTML tags)
- Bold/italic + dynamic font size in legend swatches
- Save bug on metadata-only changes (Convex persistence early-return)
- `@auth/core` peer dep installed properly
- Dropped `Arial Unicode MS` from text-font stack (404 noise)
