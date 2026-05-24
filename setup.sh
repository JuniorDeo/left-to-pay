#!/bin/bash

# Script d'installation et démarrage rapide de Left To Pay

echo "🚀 Bienvenue dans Left To Pay - Money Manager"
echo "=============================================="
echo ""

# Aller au répertoire du projet
cd "$(dirname "$0")/ltp-cs" || exit 1

# Vérifier que Node.js est installé
if ! command -v node &> /dev/null; then
    echo "❌ Node.js n'est pas installé."
    echo "Veuillez installer Node.js depuis https://nodejs.org/"
    exit 1
fi

echo "✅ Node.js version: $(node --version)"
echo "✅ npm version: $(npm --version)"
echo ""

# Installer les dépendances
echo "📦 Installation des dépendances..."
npm install

if [ $? -ne 0 ]; then
    echo "❌ L'installation des dépendances a échoué."
    exit 1
fi

echo ""
echo "✅ Installation complète!"
echo ""
echo "🎯 Pour démarrer l'application:"
echo ""
echo "   cd ltp-cs"
echo "   npm start"
echo ""
echo "L'application sera disponible à: http://localhost:4200"
echo ""
echo "💡 Pour compiler en production:"
echo ""
echo "   npm run build"
echo ""
echo "Merci d'utiliser Left To Pay! 💰"

