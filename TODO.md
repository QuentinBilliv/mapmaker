# idomap — TODO

## High priority — Acquisition & retention

- [x] Landing page with value proposition, map examples, and CTA "Start creating"
- [x] Dynamic OG image per public map (show map thumbnail when sharing /maps/[id])
- [ ] Analytics (Plausible or PostHog)

## Medium priority — Polish

- [x] Custom 404 and 500 error pages
- [x] Dark mode
- [x] Embed support — allow embedding public maps via iframe
- [x] Keyboard shortcuts reference (visible in UI)

## Later — Growth

- [x] Map templates (e.g. Roman Empire, trade routes) for quick start
- [ ] Export map as PNG/SVG image
- [ ] Collaboration — shared editing via link

## Convex bandwidth — reduce DB traffic before hitting free plan cap

Context: we are sitting at ~872 MB / 1 GB on the Convex free plan's
**Database Bandwidth** line, and it's not because we have lots of
data. The culprit is that `getMap` returns the entire map (metadata +
features + groups + legend entries + choropleth) as a single payload,
and because Convex queries are reactive, the full payload is re-sent
to the client on every mutation. Combined with the 2.5s auto-save in
the editor, a single 30-minute editing session on a large map (e.g.
Paris Metro, ~300 KB) can burn ~90 MB of bandwidth. OG image
generation, the landing showcase carousel, and the metadata panel
all re-fetch the full map unnecessarily.

### Hotspots identified
- `convex/maps.ts:44-67` — `getMap` returns the full map document on
  every invalidation
- `src/lib/hooks/use-convex-persistence.ts:19` — editor is permanently
  subscribed to `getMap`, so every mutation triggers a full re-send
- `src/app/(platform)/maps/[id]/opengraph-image.tsx:21` — OG route
  calls `getMap` on every social unfurl, no cache
- `src/components/editor/MapMetadata.tsx:176-180` — metadata panel
  re-fetches the full map just to show title/center/zoom/thumbnail
- `src/components/landing/PreviewMap.tsx:21` — landing carousel
  re-fetches full showcase maps on every rotation
- `src/app/embed/[id]/page.tsx:30-32` — embed page re-fetches the
  full map per viewer

### Plan (ordered by impact × effort)

**Phase 1 — Shipped (2026-04-14)**
- [x] Always persist features via Convex file storage (lower
      `INLINE_THRESHOLD` to 0). Existing inline maps keep working
      via `getMap`'s backward-compat path and migrate lazily on
      next save. *(commit b5d09d6)*
- [x] Editor auto-save: raise debounce from 2.5s → 4s, hash-skip
      when payload is unchanged, flush pending save on
      `beforeunload`. *(commit b5d09d6)*
- [x] Convert viewer (`/maps/[id]`), embed (`/embed/[id]`), and
      landing `PreviewMap` to one-shot `useConvex().query(...)`
      instead of reactive `useQuery` — none of these surfaces
      needed live updates. *(commit 8751c13)*
- [x] Cache OG images for 7 days via `export const revalidate =
      604800`, and bust the cache via `/api/revalidate-og` when
      the editor saves a new title/description or cover image.
      *(commit d904cd4)*

**Phase 2 — Already mostly built, just turn it on fully**
The storage-based feature persistence infra (new `dataFileId`
field on `maps`, file-mode branch in `saveMap`, `dataFileUrl`
fallback in `getMap`) was already in place — Phase 1 flipped the
threshold so every new save uses it. What's left:
- [ ] One-shot migration pass to rewrite existing inline maps
      into file storage (cron or admin script reading all maps
      with `features != null` and resaving through `saveMap`)
- [ ] After migration, drop the inline-mode branches from
      `getMap` / `saveMap` and remove the `features` / `groups`
      fields from the `maps` doc schema entirely

**Phase 3 — Polish**
- [ ] Add a `lastFeaturesUpdatedAt` timestamp on the map doc so
      readers can skip fetching the blob when they already have a
      fresh copy in browser cache (ETag/If-Modified-Since flow)
- [ ] Instrument a lightweight bandwidth monitor: log query payload
      sizes in dev, surface a warning in the editor if a single
      session crosses a threshold
- [ ] Once bandwidth is under control, reconsider whether we still
      need pagination on `getMyMaps` (currently fine but worth
      re-checking)

### What we explicitly do NOT need to do
- Change the public API or `.idomap` export format — features stay
  exactly where they are on the wire to external consumers
- Rewrite the editor state management — `features` already live in
  local state (`editor-context.tsx`), Convex just persists them
- Upgrade to the paid plan preemptively — Phase 1 alone should buy
  us many months of headroom

## Trust & Safety — before opening the site to the public

Context: the site is free and publishing is one click away. If we ship
without safeguards, people can publish porn, hate content, spam, CSAM,
or trademark/copyright infringement on a `/maps/[id]` URL that we host.
A pricing wall does NOT solve this — it filters casual users but not
malicious ones, who will happily pay. We need real guardrails before
we push idomap publicly.

The plan below is layered: each layer alone is insufficient, together
they give us both legal cover (hosting safe-harbor) and practical
protection against the most common abuse patterns.

### 1. Identity & friction at publish time
- [ ] Require authenticated account to publish a map (OAuth: Google,
      GitHub — no email/password to avoid throwaway accounts)
- [ ] Keep maps private by default; publishing must be an explicit,
      deliberate action with a confirmation dialog that reminds the
      user of the ToS
- [ ] Rate-limit publishing: max N public maps per account per day
      (start around 5), enforced server-side in Convex
- [ ] Rate-limit account creation per IP to cut drive-by spam
- [ ] Track `publishedAt`, `publishedBy`, `lastPublishedFromIp` on each
      public map so we can act on repeat offenders

### 2. Terms of Service & legal posture
- [ ] Write Terms of Service that explicitly forbid: sexual content,
      CSAM, hate speech, incitement to violence, personal data
      exposure, trademark/copyright infringement, illegal content
      under French/EU law
- [ ] Make ToS acceptance mandatory at signup (checkbox, logged)
- [ ] Write a short Privacy Policy (what we store, how long, how to
      request deletion — RGPD)
- [ ] State clearly that we reserve the right to unpublish/delete any
      map without notice, and that we act as a hosting provider under
      the EU e-commerce directive (article 14 — safe harbor requires
      "expeditious removal" upon notice)
- [ ] Add a visible "Report this map" button on every public map page,
      hitting a Convex mutation that writes to a `reports` table with
      reporter IP, map id, reason, timestamp
- [ ] Expose a `abuse@` or `legal@` email in the footer of public map
      pages (legal requirement in several EU countries for hosted
      content)

### 3. Automated checks at publish time
- [ ] Static blocklist of obvious slurs / porn terms in FR + EN
      (and a few more languages). Reject immediately at publish time.
- [ ] Validate any `customSvg` the user sets: strip `<script>`, event
      handlers, external URLs, `<foreignObject>`. We already render
      these — an unsanitized SVG is an XSS vector too. Use a real
      sanitizer (DOMPurify with the SVG profile) rather than regex.
- [ ] Reject base64 image payloads in SVG over a size threshold (users
      could smuggle porn as an inline raster inside a "custom icon")
- [ ] Do NOT index public maps on a public `/discover` or `/gallery`
      page until moderation is in place. Published = URL-shareable,
      but not listed anywhere crawlable from the homepage.

### 4. Moderation queue & takedown — DONE
- [x] `reports` table + `reportMap` mutation
- [x] Report button on every public map (reason: inappropriate,
      spam, copyright, other)
- [x] Admin page at `/admin` to list pending reports, unpublish
      maps, and dismiss reports (protected by tier === "admin")
- [x] Audit logging via console.info on every admin action
- [x] "This map is not available" for unpublished/private maps

### 5. Copyright & DMCA
- [ ] Add a DMCA / copyright takedown form (separate from the general
      report button) that captures the required fields: identification
      of the work, identification of the infringing URL, contact info,
      good-faith statement, signature
- [ ] Document the takedown SLA (e.g. 72h for DMCA, 24h for clearly
      illegal content)

### 6. What we deliberately skip
- Pricing is NOT part of the safety plan. It will come later if/when
  we know what to charge for (private maps, no-watermark embeds,
  collaboration, higher rate limits, exports) — driven by value, not
  by "filtering cons".
- No LLM-based screening. Report button + admin moderation is enough.
- No human pre-moderation of every publish. We rely on blocklist +
  post-hoc reports. Manual review only for flagged items.
- No real-name / KYC requirement. OAuth + ToS is enough friction for
  the target audience.

### Rollout order (minimum viable "safe to open")
1. ~~OAuth login + publish-requires-auth~~ (already in place)
2. ~~ToS / Privacy Policy + Report button~~ (shipped)
3. ~~Moderation queue + unpublish flow~~ (shipped)
4. Static blocklist + SVG sanitizer at publish time
5. DMCA form
