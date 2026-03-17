# MapMaker — TODO

## Securite / Backend

- [x] **Route edit protegee** — Ajouter `/maps/*/edit` comme route protegee dans le middleware Clerk (aujourd'hui le JS editeur est envoye meme si l'utilisateur n'est pas proprietaire)
- [x] **Audit admin** — Ajouter un log d'audit dans les mutations admin (`setUserTier`, `setUniversityLabel`)
- [ ] **SVG serveur** — Sanitizer SVG cote serveur si traitement backend ajoute (N/A: pas de traitement backend SVG, DOMParser indisponible dans Convex)

## Qualite de code

- [ ] **Types Convex** — Supprimer les `any` dans `AccountPage` et `MapLibrary` (se resoudra avec `npx convex dev` qui genere les vrais types)
- [x] **ReadOnlyMapView reactif** — Le composant ne reagit pas aux changements de `center`/`zoom` dans les props. Ajouter `map.setCenter()` / `map.setZoom()` dans un `useEffect` separe
- [x] **Tier limits depuis le serveur** — `TIER_LIMITS` est hardcode client + serveur (`convex/shared.ts` + `AccountPage`). Ajouter une query `getTierLimits` ou inclure les limites dans la reponse de `getMe`
- [x] **Filtrage par tag** — `getPublicMaps` filtre par tag en memoire apres `take(100)`, ce qui rate les cartes au-dela du 100e rang. Ajouter un index sur tags ou une pagination par curseur

## Fonctionnalites

- [x] **Recherche geo** — Barre de recherche pour centrer la carte sur une adresse/lieu
- [x] **Mesures** — Afficher distances et surfaces sur la carte
- [ ] **Dark mode** — A voir l'utilite reelle
