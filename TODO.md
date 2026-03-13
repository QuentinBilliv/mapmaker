# MapMaker — Audit TODO

## Moyen terme

- [x] **Accessibilité** — Ajouter des aria-labels sur les inputs color, slider et file upload (FeatureForm, DrawingSettingsPanel, IconPickerDialog)
- [x] **Undo/redo** — Implémenter undo/redo ou au minimum une confirmation avant les suppressions destructives (features, layers)
- [x] **Memoisation** — Ajouter useMemo pour featureCounts (LayerPanel). GeoJSON collections dans use-feature-rendering déjà stables via le context.
- [x] **Virtual scrolling** — Virtual scrolling + multi-pack (FA6, Game Icons, Ionicons) avec search cross-pack
- [x] **Sécurité URLs** — Bloquer les URLs javascript: et data: dans schemas.ts et mapmaker-format.ts
- [x] **Rotation** — Sérialiser le champ rotation dans mapmaker-format.ts (existe dans types.ts mais jamais persisté)

## Long terme

- [x] **Type safety** — Discriminated unions pour FeatureData par type (polygon, polyline, point, text)
- [ ] **Persistence** — Intégrer un backend (Convex ou autre) pour la persistence des maps/layers/features
- [ ] **SVG serveur** — Sanitizer SVG côté serveur (sans DOMParser) si traitement backend ajouté
