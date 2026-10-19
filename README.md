# Jeux de Mots

Jeu de soirée : une personne lit un texte, les autres devinent si c’est **fidèle** ou **impro**.

**Les points sont validés par le groupe.** Le micro (optionnel) sert seulement à réécouter — la STT ne décide pas du score.

## Sources de textes

- **Wikipédia** — résumés aléatoires FR (API MediaWiki)
- **Actu** — vrais articles **Wikinews** récemment publiés (pas de secours Wikipédia)
- **Citations** — citations officielles entières « … » + auteur, ou invention
- **Prix** — deviner le prix d’un produit (Open Prices / Open Food Facts, ODbL) : photo, quantité, enseigne, lieu, pays, date & heure du relevé

## Mode Prix

1. Carte produit (sans le prix) + métadonnées magasin  
2. Chaque joueur propose un prix en privé  
3. Révélation + score : pile poil +5 · ≤10 % +3 · ≤25 % +1  

Crédit obligatoire : Open Prices / Open Food Facts.

## Mode Citations

- **Exacte** : citation officielle **entière** entre guillemets
- **1 mot changé** : un seul mot remplacé
- **Inventée** : maxime de zéro + auteur fictif (prénom + nom)

Votes à 3 options. Anti-suspicion :

- hésiter ne prouve rien
- fausse accusation (exacte prise pour modifiée/inventée) → **-1**
- vote « 1 mot / inventée » sans **nommer** l’écart → **0** sur le vote
- exacte crédible → bonus fort si les autres accusent à tort

## Options de partie

- **Temps mort** (5–12 s, défaut 8) : countdown commun avant de pouvoir lire — même fenêtre de préparation pour tout le monde
- **Mise pour accuser** (option) : voter impro / 1 mot / inventée engage 1 pt → **+3** si vrai, **−1** si faux

## Modes micro

- **Sans micro (recommandé)** — vote + chasse + arbitrage humain
- **Avec micro (aide)** — enregistrement + brouillon STT ; jamais scorée seule

## Déroulement

1. Mission secrète du lecteur  
2. Lecture (± enregistrement)  
3. Trace écrite (ce qui a vraiment été dit)  
4. **Votes privés** (téléphone passé : un joueur à la fois, sans voir les autres)  
5. **Chasse privée** (idem)  
6. Arbitrage + score  

## Lancer

```bash
cd ~/Desktop/jeuxdesmots
npx serve . -p 3456
```

Ouvre http://localhost:3456 (Chrome si tu actives le micro).

## Stack

HTML / CSS / JavaScript — aucune dépendance.
