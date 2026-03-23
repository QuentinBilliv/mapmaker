# Monetization Strategy

## Current State

- Auth + tier system already implemented (`convex/shared.ts`)
- Tiers: free (5 maps), paid (50 maps), admin (unlimited)
- `universityLabel` field exists on users
- Limits: 10K features/map, 100 layers, 1K groups, 1K legend entries, 950KB payload

## Tier Structure

### Free

- 3 maps, 50 features per map
- Export `.mapmaker` only
- 1 base map (default)
- Public maps only
- Basic styles (solid fill, solid lines, no decorations)
- Basic shapes (circle, square, triangle)

### Pro (~5-8 EUR/month)

- Unlimited maps, 10K features per map
- All export formats (GeoJSON, `.mapmaker`)
- 7 base maps
- Private + unlisted maps
- All fill patterns (stripes, crosshatch, dots)
- All line decorations (railway, ticks, arrows, crosses)
- All line styles (dotted, dashed)
- Arrow styles (forward, double)
- All shapes + icon packs (Font Awesome, Game Icons, Ionicons)
- Custom SVG icons
- GeoBank (country/subdivision boundaries import)
- Legend system
- Smoothing controls
- Text border customization
- Font options (serif, monospace)

### Education (-50% on Pro)

- Same as Pro
- Requires `.edu` email or institutional verification
- `universityLabel` displayed on profile

## What to Gate (Feature Flags)

### By category

| Category | Free | Pro |
|----------|------|-----|
| Maps | 3 | Unlimited |
| Features/map | 50 | 10,000 |
| Base maps | 1 | 7 |
| Visibility | Public | Public + Unlisted + Private |
| Export | `.mapmaker` | `.mapmaker` + GeoJSON |
| Fill patterns | Solid only | All (stripes, crosshatch, dots) |
| Line decorations | None | All (railway, ticks, arrows...) |
| Line styles | Solid only | Dotted, dashed |
| Arrow styles | None | Forward, double |
| Icons | Basic shapes | 3 icon packs + custom SVG |
| GeoBank | No | Yes |
| Legend | No | Yes |
| Smoothing | No | Yes |
| Text fonts | Sans-serif | Sans-serif + serif + monospace |
| Text border | No | Yes |
| GeoJSON import | 50 features max | 500 features max |

### Implementation approach

- Add a `canUse(feature, tier)` helper in `convex/shared.ts`
- Gate features in UI: show them but with a lock icon + "Upgrade to Pro" tooltip
- Don't hide pro features — let free users see what they're missing

## Payment Integration

### Stripe (recommended)

- Stripe Checkout for subscription
- Stripe Customer Portal for manage/cancel
- Webhook to update `tier` in Convex on payment events
- Store `stripeCustomerId` on user record

### Flow

1. User clicks "Upgrade to Pro"
2. Redirect to Stripe Checkout (monthly subscription)
3. On success, webhook fires -> update user tier to "paid"
4. On cancellation/failure, webhook fires -> revert to "free"

### Required Convex changes

- Add `stripeCustomerId` field to users table
- Add `subscriptionStatus` field (active, canceled, past_due)
- Add `subscriptionEndDate` for grace period handling
- Create webhook endpoint for Stripe events

## Validation First (Before Building Payment)

Before implementing Stripe:

1. Add an "Upgrade to Pro" button in the UI (account page + feature gates)
2. Link it to a Typeform or waitlist (collect email + what feature they want most)
3. Track clicks to measure demand
4. If conversion > 2-3% of active users clicking, proceed with Stripe

## Education Channel

- Universities buy site licenses (annual, per-department)
- Reach out to geography/GIS/history departments
- Offer free trials for professors
- `universityLabel` already exists — use it for branding ("Made with MapMaker at [University]")

## Pricing Benchmarks

- geojson.io: free (no pro features, basic)
- Felt: free tier + $20/month pro
- Mapbox Studio: free tier + usage-based
- uMap: free (open source, self-hosted)

MapMaker sits between geojson.io (too basic) and Felt (too expensive for hobbyists). 5-8 EUR/month is the sweet spot.

## Priority Order

1. Validate demand (upgrade button + waitlist)
2. Implement feature gating UI (lock icons, tooltips)
3. Stripe integration
4. Education tier
5. Annual billing option (-20%)
