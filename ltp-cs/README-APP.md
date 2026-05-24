# Left To Pay - Money Manager

Une application web simpliste pour gérer vos finances mensuelles. Entrez votre salaire mensuel et vos prélèvements, et l'application vous affiche solde jour par jour.

## 🎯 Fonctionnalités

- **Saisie du Salaire Mensuel** : Entrez votre salaire pour initialiser le mois
- **Gestion des Prélèvements** : Ajoutez vos dépenses mensuelles (loyer, Netflix, etc.) avec date précise
- **Affichage du Solde Jour par Jour** : Visualisez combien il vous reste à chaque jour du mois
- **Stockage Local** : Vos données sont sauvegardées automatiquement au localStorage
- **Interface Responsive** : Fonctionne sur desktop, tablette et mobile

## 🚀 Démarrage

### Installation

```bash
cd ltp-cs
npm install
```

### Développement

```bash
npm start
```

L'application sera accessible à `http://localhost:4200`

### Production

```bash
npm run build
```

Les fichiers compilés seront dans le dossier `dist/ltp-cs`

## 💡 Comment Utiliser

### 1. Entrez votre Salaire Mensuel
- Allez à la section "Salaire Mensuel"
- Entrez le montant de votre salaire
- Cliquez sur "Ajouter"

### 2. Ajoutez vos Prélèvements
- Allez à la section "Ajouter un Prélèvement"
- Remplissez les champs :
  - **Libellé** : Le nom du prélèvement (ex: Loyer, Netflix)
  - **Montant** : Le montant de la dépense
  - **Jour du mois** : Le jour où la dépense est prélevée (1-31)
- Cliquez sur "➕ Ajouter Prélèvement"

### 3. Consultez votre Solde Jour par Jour
- La section "Solde Jour par Jour" affiche votre solde restant pour chaque jour
- Les montants positifs sont affichés en vert
- Les montants négatifs sont affichés en rouge

### 4. Supprimez des Prélèvements
- Dans la section "Prélèvements", cliquez sur le bouton 🗑️ pour supprimer un prélèvement

## 📱 Architecture

- **Service** : `money-manager.service.ts` - Gère la logique métier et le stockage
- **Composant** : `app.component.ts` - Gère l'interface utilisateur
- **Pipe** : `sort.pipe.ts` - Trie les prélèvements par jour

## 💾 Stockage des Données

Les données sont stockées dans le localStorage du navigateur au format :
```
ltp-[YYYY]-[MM] = { year, month, salary, payments }
```

## 🎨 Design

- Interface moderne avec gradient violet
- Thème cohérent avec variables CSS
- Responsive design pour tous les appareils
- Animations fluides et transitions

## 📝 Notes

- Les calculs du solde jour par jour sont réalisés à la volée
- Le premier jour du mois, votre solde est égal à votre salaire
- Les prélèvements sont déduits du solde selon leur date
- Si des prélèvements dépassent votre solde, il peut devenir négatif

## 🔧 Technologie

- Angular 19
- TypeScript
- CSS3 avec variables
- LocalStorage API
- RxJS Observables

## 📄 Licence

Libre d'utilisation.

