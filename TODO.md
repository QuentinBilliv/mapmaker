# MapMaker — TODO

## Questions ouvertes

- [x] **Layers** — Retirer le concept de Layer pour simplifier l'UX ? (garder dans le code avec un layer par défaut, masquer l'UI)
- [ ] **Dark mode** — À voir l'utilité réelle

## Court terme

- [x] **Suppression** — Pouvoir supprimer une feature et vider la map
- [x] **Duplication** — Dupliquer une feature/groupe avec léger décalage pour distinguer l'original de la copie
- [x] **Masquer labels** — Possibilité de ne pas afficher le label sur la carte
- [x] **Persistence locale** — Register via localStorage (limite de features à définir + versionnage du format)

## Moyen terme

- [x] **Légende** — Ajouter la légende de la carte
- [x] **Banque GeoJSON** — Bibliothèque de formes prédéfinies (pays, régions, concepts)
- [ ] **Paramètres avancés** — Ajout de coordonnées manuelles et autres paramètres complexes
- [x] **Import GeoJSON** — Importer un GeoJSON existant via paste dans le CodePanel
- [ ] **Recherche géo** — Barre de recherche pour centrer la carte sur une adresse/lieu
- [x] **Raccourcis clavier** — Ctrl+D dupliquer, Suppr supprimer, etc.

## Long terme

- [x] **Dégrouper** — Pouvoir dégrouper un groupe de features
- [ ] **Mesures** — Afficher distances et surfaces sur la carte
- [ ] **Persistence serveur** — Backend (Convex ou autre) pour la persistence des maps
- [ ] **SVG serveur** — Sanitizer SVG côté serveur si traitement backend ajouté
