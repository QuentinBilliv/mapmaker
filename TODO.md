# MapMaker — TODO

## Questions ouvertes

- [ ] **Layers** — Retirer le concept de Layer pour simplifier l'UX ? (garder dans le code avec un layer par défaut, masquer l'UI)
- [ ] **Dark mode** — À voir l'utilité réelle

## Court terme

- [x] **Suppression** — Pouvoir supprimer une feature et vider la map
- [x] **Duplication** — Dupliquer une feature/groupe avec léger décalage pour distinguer l'original de la copie
- [ ] **Masquer labels** — Possibilité de ne pas afficher le label sur la carte
- [ ] **Persistence locale** — Register via localStorage (limite de features à définir + versionnage du format)

## Moyen terme

- [ ] **Légende** — Ajouter la légende de la carte
- [ ] **Banque GeoJSON** — Bibliothèque de formes prédéfinies (pays, régions, concepts)
- [ ] **Paramètres avancés** — Ajout de coordonnées manuelles et autres paramètres complexes
- [ ] **Import/Export GeoJSON** — Importer un GeoJSON existant, exporter en GeoJSON pur (sans format .mapmaker)
- [ ] **Recherche géo** — Barre de recherche pour centrer la carte sur une adresse/lieu
- [ ] **Raccourcis clavier** — Ctrl+D dupliquer, Suppr supprimer, etc.

## Long terme

- [ ] **Dégrouper** — Pouvoir dégrouper un groupe de features
- [ ] **Mesures** — Afficher distances et surfaces sur la carte
- [ ] **Persistence serveur** — Backend (Convex ou autre) pour la persistence des maps
- [ ] **SVG serveur** — Sanitizer SVG côté serveur si traitement backend ajouté
