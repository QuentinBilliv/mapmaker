# idomaps — TODO

## UX bugs found via first public users

- [ ] **Anonymous fallback in `MapCard`** — when `ownerName` is empty,
      show "Anonymous" instead of a blank line. Surfaced by the Walser
      map appearing without an author.
- [ ] **Block publish of "looks empty" maps** — refuse to flip
      `visibility: public` when the map has no visible features (e.g.
      only text features with empty `textContent`).
- [ ] **Force `textContent` on text feature creation** — when a user
      clicks "Add label", initialise `textContent` to the source label
      so we never persist an empty text feature.
- [ ] **Display-name prompt** — first time a user makes a public map
      without a `name` set, show a small modal "Pick a display name
      (will appear on your public maps)". Less friction than enforcing
      at signup.

## Mobile (asked by Reddit commenters)

- [ ] **Mobile viewer (read-only)** — `/maps/[id]` and `/embed/[id]`
      polished for iOS Safari + Android Chrome. Touch zoom, tooltips,
      legend. ~3 days. High SEO impact.
- [ ] **Mobile editor decision** — wait until the viewer ships, then
      see if users still ask for creation. If yes, plan a touch-first
      editor (3-4 weeks). If no, leave as-is.
