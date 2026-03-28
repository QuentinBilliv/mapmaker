# MapMaker — TODO

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

## Technical debt

- [ ] Rate limiting on GeoBank API route — current in-memory limiter does not work in serverless (Vercel). Use Vercel rate limiting or Upstash Redis when GeoBank is opened to Pro users.
