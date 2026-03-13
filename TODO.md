# MapMaker — Audit TODO

## Moyen terme

- [ ] **Accessibilité** — Ajouter des aria-labels sur les inputs color, slider et file upload (FeatureForm, DrawingSettingsPanel, IconPickerDialog)
- [x] **Undo/redo** — Implémenter undo/redo ou au minimum une confirmation avant les suppressions destructives (features, layers)
- [x] **Memoisation** — Ajouter useMemo pour featureCounts (LayerPanel). GeoJSON collections dans use-feature-rendering déjà stables via le context.
- [ ] **Virtual scrolling** — Implémenter du virtual scrolling dans IconPickerDialog pour les 6000+ icônes
- [ ] **Sécurité URLs** — Bloquer les URLs javascript: et data: dans schemas.ts et mapmaker-format.ts
- [ ] **Rotation** — Sérialiser le champ rotation dans mapmaker-format.ts (existe dans types.ts mais jamais persisté)

## Long terme

- [ ] **Schema Convex** — Stocker les propriétés de style (color, opacity, shape, icon, etc.) dans la table features
- [ ] **Indexes Convex** — Ajouter un index by_feature_id et vérifier les indexes existants
- [ ] **Type safety** — Discriminated unions pour FeatureData par type (polygon, polyline, point, text)
- [ ] **Offline** — Support IndexedDB en fallback quand Convex n'est pas disponible
- [ ] **Édition concurrente** — Détection et résolution de conflits multi-utilisateur via Convex
- [ ] **SVG serveur** — Sanitizer SVG côté serveur (sans DOMParser) si traitement Convex ajouté
