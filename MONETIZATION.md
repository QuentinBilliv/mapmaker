# Monetization Strategy

## Positioning

idomaps sits between geojson.io (too basic) and Felt (too expensive/enterprise). The target is individuals, students, teachers, bloggers, and hobbyists who want to make thematic maps without coding or paying $200/month.

No direct competitor at this price point for this use case.

## Cost Analysis

Current infrastructure costs at moderate traffic (~100-500 active users):

| Service | Plan | Cost |
|---|---|---|
| Convex | Free (Database 512MB, File Storage 20GB, Bandwidth 1GB) | 0€ |
| Vercel | Free (100GB bandwidth, serverless) | 0€ |
| Domain | idomaps.app (annual) | ~12€/year (~1€/month) |
| **Total** | | **~1€/month** |

Scaling thresholds:
- **Convex Pro** ($25/month) — needed when Database Bandwidth exceeds 1GB or File Storage exceeds 20GB
- **Vercel Pro** ($20/month) — needed when bandwidth exceeds 100GB (unlikely before thousands of daily visitors)

Costs scale linearly with **active editors** (each editing session = reactive queries + file uploads), not with viewers (one-shot queries, cached). A single 30-min editing session on a large map uses ~5-10 MB of bandwidth after Phase 1 optimizations.

**Conclusion**: at moderate traffic, the site costs ~50-60€/month worst case. Free tier is viable for a long time.

## Launch Strategy

**Phase 0 — Launch 100% free.** All current features available to everyone. No pricing page, no feature gates, no Stripe.

Why:
- Current costs don't justify pricing
- Need users before revenue — pricing too early kills acquisition
- 1-2% conversion rate on a small user base = ~0 revenue anyway
- Better to learn what users actually value before deciding what to charge for

**When to add pricing** — trigger on any of these signals:
- Approaching 80% of a Convex free plan quota
- Enough active users that some are asking for more (more maps, exports, collaboration)
- A clear premium feature emerges from user feedback
- Monthly costs exceed ~100€

When triggered, move to the tier structure below.

## Existing Cost Guardrails

The free tier is sustainable because hard limits prevent abuse:

| Limit | Value | Effect |
|---|---|---|
| `TIER_LIMITS.free` | 5 maps | Max 5 maps per free user |
| `TIER_LIMITS.paid` | 50 maps | Max 50 maps per paid user |
| `MAX_MAP_PAYLOAD` | 5 MB | Max data size per map (file storage) |
| `MAX_FEATURES` | 10,000 | Max features per map |
| `MAX_LAYERS` | 100 | Max layers per map |
| `MAX_GROUPS` | 1,000 | Max groups per map |
| Convex file upload | 20 MB | Hard platform limit per file |

Worst case per user: 5 maps × 5 MB = 25 MB (free), 50 maps × 5 MB = 250 MB (paid).
It would take ~80 maxed-out paid users to fill the 20 GB free File Storage quota.

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
| Features per map | 500 | 10,000 | 10,000 |
| Base maps | OSM, Voyager, Light | All 7 | All 7 |
| Visibility | All (public, unlisted, private) | All | All |
| Export | `.idomaps` only | `.idomaps` + GeoJSON | All |
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
| GeoJSON import | 500 features max | 500 features max | 500 features max |
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
1. Launch fully free (Phase 0) and acquire users
2. Monitor Convex dashboard for cost signals (bandwidth, storage)
3. Add "Upgrade to Pro" buttons in the UI (account page + feature gates)
4. Link to a Typeform or waitlist (collect email + desired feature)
5. Track clicks to measure demand
6. If conversion > 2-3% of active users clicking, proceed with Stripe

Be realistic: 500 active users is itself a big milestone. At 1-2% conversion that's 5-10 paying users. Pricing only makes sense when the user base justifies the implementation effort.
