# Monetization Strategy

## Positioning

MapMaker sits between geojson.io (too basic) and Felt (too expensive/enterprise). The target is individuals, students, teachers, bloggers, and hobbyists who want to make thematic maps without coding or paying $200/month.

No direct competitor at this price point for this use case.

## Tier Structure

### Free — Try the tool
- Casual users, bloggers, one-off map makers
- Persona: Lucas, 24, travel blogger — makes 1-2 maps per year for articles

### Pro (29€ one-time) — Pay once, use seriously
- Regular map makers who need advanced styling
- Persona: Marie, 35, independent history teacher — needs 15-20 detailed maps with patterns, icons, GeoBank

### Unlimited (5€/month) — Power users, volume
- People who create maps constantly and need more than 50
- Persona: Prof. Dubois, 52, geography department — 60+ maps accumulated over semesters

## Feature Matrix

| Feature | Free | Pro (29€ one-time) | Unlimited (5€/mois) |
|---|---|---|---|
| Maps | 3 | 50 | Unlimited |
| Features per map | 50 | 10,000 | 10,000 |
| Base maps | OSM, Voyager, Light | All 7 | All 7 |
| Visibility | All (public, unlisted, private) | All | All |
| Export | `.mapmaker` only | `.mapmaker` + GeoJSON | All |
| Point shapes | All 8 | All 8 | All 8 |
| Fill patterns | Solid, Stripes diagonal | All | All |
| Line styles | Solid, Dash | All | All |
| Line decorations | None | All | All |
| Arrows | All | All | All |
| Icon packs (react-icons) | No | 3 packs (FA, GI, Io) | 3 packs |
| Custom SVG | No | Yes | Yes |
| GeoBank | No | Yes | Yes |
| Legend | Yes | Yes | Yes |
| Smoothing | Yes | Yes | Yes |
| Text border | Yes | Yes | Yes |
| GeoJSON import | 50 features max | 500 features max | 500 features max |
| Templates | Yes | Yes | Yes |
| Embed (iframe) | No | Yes | Yes |

## Institutional Badge

Separate from tiers. Attributed manually on request for universities/institutions.
- Displayed next to the user's name on public maps and profile
- Example: "Prof. Dubois — Université Lyon 2"
- `universityLabel` field already exists on user records
- Can be combined with any tier (typically Pro or Unlimited)

## Implementation Strategy

### Step 1 — `canUse` helper
- Single source of truth in `convex/shared.ts`
- `canUse(feature, tier)` returns boolean
- Used client-side (UI gating) and server-side (validation)

### Step 2 — Feature gating UI
- Don't hide Pro features — show them with a lock icon
- Clicking a locked feature shows "Upgrade to Pro" toast/modal
- Files to gate:
  - `GeoBankDialog` — entire dialog
  - `FeatureForm` — fill patterns, line styles, line decorations, icons, custom SVG
  - `IconPickerDialog` — icon packs
  - `BaseMapSelector` — base maps 4-7
  - `ExportImportButtons` — GeoJSON export
  - `EmbedButton` — embed snippet

### Step 3 — Server-side validation
- `createMap` — verify map count against tier limit
- `saveMap` — verify feature count against tier limit
- Styling checks not needed server-side (no security risk, just UX)

### Step 4 — Pricing page
- Static page at `/pricing` with the 3 tiers
- "Upgrade" button → Typeform/waitlist initially (validate demand)
- Track clicks to measure conversion interest

### Step 5 — Stripe integration (later)
- Stripe Checkout for Pro (one-time payment)
- Stripe Checkout for Unlimited (monthly subscription)
- Stripe Customer Portal for manage/cancel
- Webhook to update `tier` in Convex on payment events
- Required Convex schema changes:
  - `stripeCustomerId` on users
  - `subscriptionStatus` (active, canceled, past_due)
  - `subscriptionEndDate` for grace period

### Step 6 — Institutional badges (later)
- Admin-only mutation to set `universityLabel`
- Badge component displayed on public maps and profile
- Outreach to geography/GIS/history departments

## Validation Before Payment

Before implementing Stripe:
1. Add "Upgrade to Pro" buttons in the UI (account page + feature gates)
2. Link to a Typeform or waitlist (collect email + desired feature)
3. Track clicks to measure demand
4. If conversion > 2-3% of active users clicking, proceed with Stripe
