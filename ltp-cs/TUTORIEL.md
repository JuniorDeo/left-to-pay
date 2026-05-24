<!-- Exemple d'utilisation de l'application Left To Pay -->

# Tutoriel Rapide - Left To Pay

## Scénario : Gestion d'un mois type

### Étape 1 : Lancer l'application
```bash
npm start
```
Ouvrez votre navigateur à `http://localhost:4200`

### Étape 2 : Entrer le salaire
Supposons que vous avez un salaire net de **2500€**

1. Allez à la section "Salaire Mensuel"
2. Entrez `2500` dans le champ
3. Cliquez sur "Ajouter"

Vous devriez voir : "Salaire enregistré : 2 500,00 €"

### Étape 3 : Ajouter les prélèvements

#### Prélèvement 1 : Loyer (le 1er du mois)
- Libellé : `Loyer`
- Montant : `800`
- Jour : `1`
- Cliquez sur "➕ Ajouter Prélèvement"

#### Prélèvement 2 : Alimentation (le 5 du mois)
- Libellé : `Alimentation`
- Montant : `300`
- Jour : `5`
- Cliquez sur "➕ Ajouter Prélèvement"

#### Prélèvement 3 : Netflix (le 10 du mois)
- Libellé : `Netflix`
- Montant : `13`
- Jour : `10`
- Cliquez sur "➕ Ajouter Prélèvement"

#### Prélèvement 4 : Assurance (le 15 du mois)
- Libellé : `Assurance`
- Montant : `150`
- Jour : `15`
- Cliquez sur "➕ Ajouter Prélèvement"

#### Prélèvement 5 : Fruits (le 20 du mois)
- Libellé : `Fruits`
- Montant : `50`
- Jour : `20`
- Cliquez sur "➕ Ajouter Prélèvement"

### Étape 4 : Visualiser le solde jour par jour

La section "Solde Jour par Jour" vous montre :

```
Jour 1 (lun 1)    : 1 700,00 € (après loyer)
Jour 2 (mar 2)    : 1 700,00 €
Jour 3 (mer 3)    : 1 700,00 €
Jour 4 (jeu 4)    : 1 700,00 €
Jour 5 (ven 5)    : 1 400,00 € (après alimentation)
Jour 6 (sam 6)    : 1 400,00 €
...
Jour 10 (mer 10)  : 1 387,00 € (après Netflix)
...
Jour 15 (lun 15)  : 1 237,00 € (après assurance)
...
Jour 20 (sam 20)  : 1 187,00 € (après fruits)
...
```

### Étape 5 : Supprimer un prélèvement

Si vous vous êtes trompé(e) dans un prélèvement :

1. Allez à la section "Prélèvements"
2. Trouvez le prélèvement à supprimer
3. Cliquez sur le bouton 🗑️

Le solde jour par jour sera recalculé automatiquement.

## ✨ Caractéristiques spéciales

- ✅ Les données sont sauvegardées automatiquement
- ✅ Si vous rafraîchissez la page, tout est conservé
- ✅ L'affichage est formaté en EUR (symbole €)
- ✅ Responsive : fonctionne sur mobile, tablette et desktop

## 🎯 Cas d'usage

### Cas 1 : Budget tight en fin de mois
Si vous voyez que le solde devient négatif (en rouge), cela signifie que vous avez plus de prélèvements que de revenus. C'est un signal d'alarme !

### Cas 2 : Calcul du jour limite
Vous pouvez voir exactement à quel jour de la mois vous n'avez plus d'argent.

### Cas 3 : Planification mensuelle
Avant même de recevoir votre salaire, vous pouvez planifier vos dépenses et vérifier que vous aurez assez.

## 🔄 De mois en mois

Quand le mois change (passage du 30 avril au 1er mai), l'application crée automatiquement un nouveau mois avec un nouveau solde 0.

Chaque mois a ses propres prélèvements enregistrés.

---

**Bon budget ! 💰**

