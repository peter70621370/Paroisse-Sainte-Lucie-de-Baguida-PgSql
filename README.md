# Paroisse Sainte Lucie de Baguida

Site web officiel de la paroisse : **Nuxt 3 · Node.js (Fastify) · TypeScript · MySQL**, entièrement conteneurisé (Docker).
Domaine prévu : `www.paroissesaintelucie-baguida.org`

## Structure

```
frontend/     Nuxt 3 : site public et back-office (/admin)
backend/      API Node.js + TypeScript (Fastify), Prisma, MySQL
api/          Contrat de l'API (openapi.yaml)
deploiement/  Docker Compose (dev et prod), Nginx
docs/         Cahier des charges, documentation
```

## Démarrage local (Docker Desktop requis)

1. Démarrer Docker Desktop.
2. Créer le fichier d'environnement :
   ```bash
   cp .env.example .env
   ```
3. Lancer l'environnement de développement :
   ```bash
   docker compose --env-file .env -f deploiement/docker-compose.yml up --build
   ```

| Service | URL |
|---|---|
| Site (frontend) | http://localhost:3000 |
| API (backend) | http://localhost:4000/api/health |
| E-mails de test (Mailpit) | http://localhost:8025 |
| MySQL (depuis l'hôte) | `localhost:3307` |

La page d'accueil affiche l'état de l'API et de la base de données.
Le code est monté en volume : les modifications se rechargent automatiquement.

Arrêter : `docker compose --env-file .env -f deploiement/docker-compose.yml down` (ajouter `-v` pour effacer la base).

## Production / préproduction

```bash
docker compose --env-file .env -f deploiement/docker-compose.prod.yml up -d --build
```

Nginx expose le port 80 : `/` vers le frontend, `/api` vers le backend. Les migrations Prisma s'appliquent au démarrage du backend.
Une sauvegarde MySQL quotidienne est conservée 14 jours (volume `backups`).
Le HTTPS (Let's Encrypt) sera ajouté à la mise en production sur le VPS.

## Commandes utiles (backend)

```bash
docker compose --env-file .env -f deploiement/docker-compose.yml exec backend npx prisma migrate dev --name <nom>
docker compose --env-file .env -f deploiement/docker-compose.yml exec backend npm test
```

## Feuille de route

| Sprint | Contenu | État |
|---|---|---|
| 0 | Fondations : structure, Docker, health check | fait |
| 1 | Schéma de données complet, authentification (sessions), rôles | fait |
| 2 | Back-office : utilisateurs, médiathèque, paramètres | fait |
| 3 | Contenus : pages, annonces, bulletins, horaires, personnel, homélies | fait |
| 4 | Site public (accueil, pages, horaires, bulletins, homélies…) | fait |
| 5 | Calendrier et formulaires (contact, adhésion, catéchisme, sacrements, intentions de messe) | fait |
| 6 | Dons en ligne (Mobile Money, carte, PayPal) | fait (à valider avec vos comptes marchands) |
| 7 | SEO, multilingue, cookies, newsletter | à venir |
| 8 | Qualité et sécurité | à venir |
| 9 | Mise en production | à venir |

## Compte administrateur (développement)

Créé par le seed à partir de `ADMIN_EMAIL` / `ADMIN_PASSWORD` du fichier `.env` :

```bash
docker compose --env-file .env -f deploiement/docker-compose.yml exec backend npm run seed
```

Connexion : http://localhost:3000/admin/login. En production, changer ce mot de passe immédiatement (`node dist/scripts/seed.js` crée le compte s'il n'existe pas).

## Formulaires et e-mails

Les formulaires publics enregistrent la demande (Administration › **Demandes reçues**, export CSV) puis envoient un e-mail au secrétariat
(adresse « E-mail de contact » des paramètres, sinon `NOTIFY_EMAIL`) et un accusé de réception au visiteur.
En développement, les e-mails sont captés par **Mailpit** : http://localhost:8025.
En production, renseigner `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `MAIL_FROM` dans `.env` (sans SMTP, les demandes restent enregistrées mais aucun e-mail ne part).
Anti-spam : champ piège invisible + 5 envois maximum par 10 minutes et par adresse IP.

## Dons en ligne

| Moyen | Devise | Prestataire |
|---|---|---|
| Mobile Money (Flooz, T-Money…) | FCFA | **CinetPay** |
| Carte bancaire | FCFA | **CinetPay** |
| PayPal | **Euros** (PayPal ne gère pas le FCFA) | **PayPal** |

- **Sécurité :** un don n'est validé que si le prestataire le confirme directement à notre serveur (et pour le bon montant). Un webhook ou une adresse de retour ne sont jamais crus sur parole : ils déclenchent seulement une vérification.
- **Développement :** `PAYMENT_MODE=mock` (déjà réglé dans le compose de dev) simule les paiements : page fictive « réussi / échec / annulé », aucun vrai argent.
- **Production :** renseigner dans `.env` `PUBLIC_URL`, `CINETPAY_API_KEY`, `CINETPAY_SITE_ID`, `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET`, `PAYPAL_ENV` (`sandbox` pour essayer, `live` pour le réel). Un moyen non configuré n'est pas proposé aux visiteurs.
  - CinetPay : renseigner dans leur tableau de bord l'adresse de notification `https://VOTRE-SITE/api/donations/webhook/cinetpay`.
  - PayPal (facultatif mais conseillé) : webhook `https://VOTRE-SITE/api/donations/webhook/paypal`, événement `CHECKOUT.ORDER.APPROVED`.
- **Important :** les intégrations CinetPay et PayPal sont écrites d'après leur documentation et testées contre des serveurs simulés, **pas encore contre leurs vrais environnements** : à valider en bac à sable avec vos clés avant d'ouvrir au public.
- Les dons ne sont pas supprimables depuis l'administration (traçabilité). Les « en attente » se revérifient d'un clic (Administration › Dons reçus).
- L'accusé de réception par e-mail **n'est pas un reçu fiscal**.

## Contenu de démonstration et images provisoires

Pour voir le site avec du contenu d'exemple (pages, annonces, horaires, fiches), à ne lancer qu'en développement :

```bash
docker compose --env-file .env -f deploiement/docker-compose.yml exec backend npm run seed:demo
```

Tant qu'aucune image n'est choisie, le site affiche des **images provisoires** (`frontend/public/placeholders/`).
Pour les remplacer : **Administration › Paramètres du site** (logo, grande photo d'accueil, textes de bienvenue, coordonnées).
Les photos du personnel se changent dans **Personnel pastoral**.

## Rechargement en développement (Windows)

Le frontend se recharge automatiquement. Le **backend ne détecte pas** les modifications de fichiers Windows dans Docker :
après une modification du code backend, relancer :

```bash
docker compose --env-file .env -f deploiement/docker-compose.yml restart backend
```

## Tests

```bash
# Unitaires + intégration (nécessite la base : à lancer dans le conteneur)
docker compose --env-file .env -f deploiement/docker-compose.yml exec -e RUN_DB_TESTS=1 backend npm test
```
