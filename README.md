# Jeux de Mots

Jeu de soirée : une personne lit un texte, les autres devinent si c’est **fidèle** ou **impro** (mots rajoutés).

**Les points sont validés par le groupe.** Le micro (optionnel) sert seulement à réécouter — la STT ne décide pas du score.

## Sources de textes

- **Wikipédia (conseillé)** — générateur illimité (API MediaWiki FR)
- **Actu (Wikinews)** — articles d’actualité via la même API
- **Mix** — Wikipédia + Wikinews
- **Citations** — vraies citations domaine public avec **auteur affiché**. Mission exacte, ou défi : modifier quelques mots / tout réécrire / inventer de zéro.

## Modes micro

- **Sans micro (recommandé)** — vote + chasse + arbitrage humain
- **Avec micro (aide)** — enregistrement + brouillon STT ; jamais scorée seule

## Déroulement

1. Mission secrète du lecteur  
2. Lecture (± enregistrement)  
3. **Trace écrite** : le lecteur édite l’original pour coller à ce qu’il a vraiment dit  
4. Votes des autres  
5. Chasse aux mots ajoutés  
6. **Arbitrage** : comparer origine ↔ version déclarée, valider la liste, score  

## Lancer

```bash
cd ~/Desktop/jeuxdesmots
npx serve . -p 3456
```

Ouvre http://localhost:3456 (Chrome si tu actives le micro).

## Stack

HTML / CSS / JavaScript — aucune dépendance.
