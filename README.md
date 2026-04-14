# Merci Handy — Analyse Produit

Dashboard eCommerce pour Merci Handy, branche sur un export Funnel.io (donnees Shopify enrichies UTM).

## Stack

- **Nuxt 4** + Vue 3 `<script setup>` + TypeScript
- **Nuxt UI 4** (`@nuxt/ui`) pour les composants dashboard
- **TailwindCSS 4** via `@nuxt/ui`
- **Unovis** (`@unovis/vue`) pour les charts
- **PapaParse** pour le parsing CSV cote serveur
- **date-fns** pour la manipulation de dates
- **zod** pour la validation des query params API

## Demarrage

```bash
pnpm install
pnpm dev
```

Le dashboard sera disponible sur `http://localhost:3000`.

## Remplacer le CSV

1. Placer le nouvel export dans `data/hzn_mh_data_funnel.io.csv`
2. Redemarrer le serveur (`pnpm dev`)
3. Les colonnes attendues sont documentees dans `docs/data-dictionary.md`

## Pages

| Route | Description |
|---|---|
| `/` | Vue d'ensemble — KPIs, graphique CA/commandes, top produits |
| `/acquisition` | Attribution & trafic — breakdown par source/medium/campagne |
| `/products` | Catalogue produits — KPIs par type, table complete, export CSV |
| `/customers` | Clients — KPIs, top villes, cohortes |
| `/geography` | Geographie — repartition CA par pays et ville |

## Mapping KPIs → Colonnes source

Voir `docs/data-dictionary.md` pour le detail complet.

## Hypotheses comptables

- **CA net** = somme des AOV uniques (SALE) − somme des AOV (REFUND)
- **Deduplication** : AOV pris une seule fois par Order ID
- **Refunds** : toute commande avec une ligne REFUND/RETURN est soustraite
- **Compare At Price** : utilise comme proxy du revenu produit

## Verification

```bash
python3 scripts/verify.py
```

Compare les KPIs calcules depuis le CSV brut avec un script independant.

## Ce qui a ete retire du projet de reference

- Couche Supabase (`@nuxtjs/supabase`, `supabase-schema.sql`, middleware auth)
- Pages `fees`, `budget`, `consultants`, `settings/*`
- Composants `customers/AddModal`, `customers/DeleteModal`, `settings/*`
- Composants `UserMenu`, `NotificationsSlideover`
- Aucune section « Analyse Crea » n'etait presente dans le code source de reference

## Deploiement

```bash
vercel deploy
```

## Design System

Le design system Merci Handy est applique via les tokens CSS dans `app/assets/css/main.css` :
- Palette arc-en-ciel pastel (mint, sky, lilac, pink, blush, peach)
- Boutons pill arrondis
- Rainbow border en haut des panels
- Typographie Inter (fallback pour Sofia Pro)

## Limites connues

- ~307 lignes / ~40 commandes — KPIs faibles (dataset de demo)
- COGS souvent a 0 dans le CSV
- Pas de dark mode (v1 light only, conformement a l'identite Merci Handy)
- Sofia Pro non incluse (fallback Inter) — ajouter les fichiers woff2 pour activer
