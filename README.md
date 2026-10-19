# Jeux de Mots

Jeu de soirée : une personne lit un texte, les autres devinent si c’est **fidèle** ou **impro**.

**Les points sont validés par le groupe.** Le micro (optionnel) sert seulement à réécouter — la STT ne décide pas du score.

## Sources de textes

- **Wikipédia** — résumés aléatoires FR (API MediaWiki)
- **Actu** — vrais articles **Wikinews** récemment publiés (pas de secours Wikipédia)
- **Citations** — citations officielles entières « … » + auteur, ou invention

## Mode Citations

- **Exacte** : citation officielle **entière** entre guillemets
- **1 mot changé** : un seul mot remplacé
- **Inventée** : maxime de zéro + auteur fictif (prénom + nom)

Votes à 3 options. Anti-suspicion :

- hésiter ne prouve rien
- fausse accusation (exacte prise pour modifiée/inventée) → **-1**
- vote « 1 mot / inventée » sans **nommer** l’écart → **0** sur le vote
- exacte crédible → bonus fort si les autres accusent à tort

## Modes micro

- **Sans micro (recommandé)** — vote + chasse + arbitrage humain
- **Avec micro (aide)** — enregistrement + brouillon STT ; jamais scorée seule

## Déroulement

1. Mission secrète du lecteur  
2. Lecture (± enregistrement)  
3. Trace écrite (ce qui a vraiment été dit)  
4. Votes  
5. Chasse aux mots / écarts  
6. Arbitrage + score  

## Lancer

```bash
cd ~/Desktop/jeuxdesmots
npx serve . -p 3456
```

Ouvre http://localhost:3456 (Chrome si tu actives le micro).

## Stack

HTML / CSS / JavaScript — aucune dépendance.
