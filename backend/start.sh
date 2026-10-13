#!/bin/sh
# Démarrage de l'API en production : migrations, puis le serveur.
#   SEED_ON_START=true : crée d'abord le compte administrateur et les contenus initiaux (sans effet s'ils existent déjà).
#   DEMO_ON_START=true : recrée le contenu de démonstration en arrière-plan (hébergement sans disque : ses images
#                        disparaissent à chaque redémarrage). Jamais sur le site réel.
set -e

./node_modules/.bin/prisma migrate deploy

if [ "$SEED_ON_START" = "true" ]; then
  node dist/scripts/seed.js
fi

if [ "$DEMO_ON_START" = "true" ]; then
  (node dist/scripts/seed-demo.js --clear && node dist/scripts/seed-demo.js) &
fi

exec node dist/server.js
