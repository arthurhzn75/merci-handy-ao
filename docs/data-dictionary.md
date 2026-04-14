# Data Dictionary — KPIs Merci Handy Dashboard

## Source des donnees

Fichier : `data/hzn_mh_data_funnel.io.csv`
Niveau de granularite : **ligne de transaction produit** (un meme Order ID peut apparaitre sur plusieurs lignes).

---

## KPIs Overview

### Chiffre d'affaires net (EUR)

```
CA_NET = SUM(AOV de chaque Order ID unique en ORDER/ORDER)
       - SUM(AOV des Order ID en REFUND/RETURN)
```

- Colonne AOV : `Average Order Value (EUR)` — deduplique par `Order ID` (on ne prend que la premiere occurrence non nulle).
- Filtre : `Sale Line Type = 'PRODUCT'`
- REFUND : `Order Action Type = 'REFUND'` OU `Sale Action Type = 'RETURN'`

### Commandes nettes

```
COMMANDES_NETTES = COUNT(DISTINCT Order ID en ORDER/ORDER)
                 - COUNT(DISTINCT Order ID en REFUND/RETURN qui ont aussi un ORDER/ORDER)
```

### Panier moyen

```
AOV = CA_NET / COMMANDES_NETTES
```

### Taux nouveaux clients

```
TAUX_NOUVEAUX = COUNT(Order ID uniques ou Customer Sale Type = 'First-time')
              / COUNT(Order ID uniques en ORDER/ORDER)
              * 100
```

---

## KPIs Acquisition

### Breakdown par source / medium / campagne

- **Attribution** : first-touch (`First Visit Source/Medium/Campaign`) ou last-touch (`Last Visit Source/Medium/Campaign`), togglable.
- Revenue = SUM(AOV) des Order ID uniques par groupe source/medium/campaign.
- AOV = Revenue / Commandes par groupe.
- % Nouveaux = COUNT(First-time) / COUNT(total) par groupe.

---

## KPIs Produits

### Quantite vendue

```
QTE = COUNT(lignes PRODUCT en PURCHASE) - COUNT(lignes PRODUCT en RETURN)
```
Par `Product Title`.

### CA produit

```
CA = SUM(Compare At Price (EUR) * sign)
```
`sign = +1` pour PURCHASE, `-1` pour RETURN.

### COGS

```
COGS = SUM(ABS(Total Cost - COGS (EUR)) * sign)
```

### Marge

```
MARGE = CA - COGS
MARGE_% = MARGE / CA * 100
```

### Taux de retour

```
TAUX_RETOUR = COUNT(RETURN) / COUNT(PURCHASE) * 100
```

---

## KPIs Clients

### Clients uniques

```
CLIENTS = COUNT(DISTINCT Customer ID)
```
Filtre : lignes PRODUCT en ORDER/ORDER.

### LTV moyenne

```
LTV = SUM(AOV des commandes) / CLIENTS
```

### Frequence moyenne

```
FREQ = AVG(MAX(Customer Order Index) par Customer ID)
```

---

## KPIs Geographie

- Repartition par `Shipping Country` et `Shipping City`.
- Revenue = SUM(AOV) des Order ID uniques par zone.
- % CA = Revenue zone / Revenue total * 100.

---

## Hypotheses et limites

1. **Deduplication** : le CSV contient plusieurs lignes par commande (une par line item). L'AOV est au niveau commande — on ne prend que la premiere occurrence non nulle par Order ID.
2. **Refunds** : une commande avec au moins une ligne REFUND/RETURN est consideree comme entierement remboursee pour le calcul du CA net.
3. **Compare At Price** : utilise comme proxy du revenu par produit (c'est le prix affiche). Le vrai revenu post-discount n'est pas directement disponible par ligne.
4. **COGS** : `Total Cost - COGS (EUR)` est souvent a 0 — les marges produit sont donc sous-estimees quand le COGS n'est pas renseigne.
5. **Periode** : les donnees couvrent ~17 jours (fin mars — mi-avril 2026), ~40 commandes, ~307 lignes.
