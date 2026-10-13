# Paroisse Sainte Lucie de Baguida

Site web officiel de la paroisse : **Nuxt 3 · Node.js (Fastify) · TypeScript · PostgreSQL**, entièrement conteneurisé (Docker).
Domaine prévu : `www.paroissesaintelucie-baguida.org`

## Structure

```
frontend/     Nuxt 3 : site public et back-office (/admin)
backend/      API Node.js + TypeScript (Fastify), Prisma, PostgreSQL
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
| Administration de la base (pgAdmin) | http://localhost:5050 |
| PostgreSQL (depuis l'hôte) | `localhost:5433` |

La page d'accueil affiche l'état de l'API et de la base de données.
Le code est monté en volume : les modifications se rechargent automatiquement.

Arrêter : `docker compose --env-file .env -f deploiement/docker-compose.yml down` (ajouter `-v` pour effacer la base).

## Production / préproduction

```bash
docker compose --env-file .env -f deploiement/docker-compose.prod.yml up -d --build
```

Nginx expose le port 80 : `/` vers le frontend, `/api` vers le backend. Les migrations Prisma s'appliquent au démarrage du backend.
Une sauvegarde PostgreSQL quotidienne est conservée 14 jours (volume `backups`).
Le HTTPS (Let's Encrypt) sera ajouté à la mise en production sur le VPS.

## Déploiement sur Render

Le fichier `render.yaml` (racine du dépôt) décrit tout : le site, l'API, la base PostgreSQL et le disque des fichiers téléversés.
Les trois éléments sont sur des **offres payantes** (l'offre gratuite de Render n'a pas de disque et supprime la base au bout d'un mois).

1. Dans Render : **New › Blueprint**, autoriser l'accès au dépôt GitHub et le choisir.
2. Renseigner les valeurs demandées :
   - `PUBLIC_URL` et `NUXT_PUBLIC_SITE_URL` : l'adresse publique du site, identique pour les deux, sans barre finale.
     Au premier déploiement : `https://sainte-lucie-site.onrender.com` (si Render attribue un autre nom, corriger ensuite dans **Environment** de chaque service).
   - `ADMIN_EMAIL`, `ADMIN_PASSWORD` (10 caractères minimum) : compte administrateur créé au premier démarrage.
   - SMTP, CinetPay, PayPal : peuvent rester vides au début (pas d'e-mails, aucun moyen de paiement proposé).
3. Lancer : Render construit les deux images, crée la base, applique les migrations et démarre. Chaque `git push` sur `main` redéploie.
4. Nom de domaine : service `sainte-lucie-site` › **Settings › Custom Domains**, puis remplacer `PUBLIC_URL` et `NUXT_PUBLIC_SITE_URL` par la nouvelle adresse.

Fonctionnement : seul le site est exposé à Internet (HTTPS fourni par Render) ; il relaie `/api` et `/uploads` vers l'API par le réseau privé.
Nginx et le service de sauvegarde du compose de production ne sont pas utilisés sur Render.

À vérifier après le premier déploiement :

- **Envoi d'un fichier dans la médiathèque.** L'API tourne avec un utilisateur non privilégié ; si l'envoi échoue (« permission denied » dans les journaux), le disque monté n'est pas inscriptible par cet utilisateur.
- **Adresse des visiteurs.** Les limites anti-spam se fondent sur l'adresse IP lue dans `X-Forwarded-For`. Dans les journaux de l'API, `remoteAddress` / l'adresse retenue doit être celle du visiteur et non une adresse de Render ; sinon ajuster `TRUST_PROXY`.
- **Sauvegardes.** Vérifier dans Render ce que l'offre choisie inclut pour la base (restauration) et pour le disque (instantanés).

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
| 7 | SEO, vie privée, statistiques, newsletter, galerie, messe en direct, éwé (pages) | fait |
| 8 | Qualité et sécurité : durcissement, audit, performance, accessibilité, tests de bout en bout | fait |
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

## Référencement, vie privée et statistiques

- **SEO :** `/sitemap.xml` (pages, homélies, événements, albums publiés) et `/robots.txt` générés automatiquement, balises Open Graph / Twitter, lien canonique, données structurées schema.org (paroisse, événements).
  En production, définir `PUBLIC_URL` : il sert aux liens du sitemap et aux liens de partage.
- **Vie privée :** aucun cookie publicitaire. Bandeau de choix ; vidéos YouTube/Facebook chargées **seulement au clic**.
- **Statistiques maison** (Administration › Statistiques) : seulement si le visiteur accepte, sans cookie ; le serveur ne stocke que des compteurs (jamais d'IP). Respecte « Ne pas me suivre ».
- **Pages légales :** `npm run seed` crée des **textes types** (mentions légales, confidentialité) à faire relire et compléter (entre crochets) par la paroisse.

## Newsletter

Inscription depuis le pied de page, avec **double confirmation** par e-mail et désinscription en un clic (lien dans chaque message + en-tête `List-Unsubscribe`).
Envoi depuis Administration › Newsletter (test sur une adresse, puis envoi à tous les abonnés confirmés). Export CSV des abonnés ; un administrateur peut effacer un abonné (droit à l'effacement).
Un hébergeur limite souvent les envois en masse par SMTP : pour de gros volumes, utiliser un service d'envoi dédié (`SMTP_*`).

## Galerie, messe en direct, langue éwé

- **Galerie :** albums de photos (optimisées automatiquement) et de vidéos YouTube/Facebook, avec visionneuse plein écran.
- **Messe en direct :** renseigner le lien dans Administration › Paramètres du site › « Messe en direct ». Un bandeau apparaît sur l'accueil et la page `/direct` ; vider le champ pour le retirer.
- **Langues :** français (par défaut, adresses sans préfixe) et **anglais** (adresses en `/en/…`). Le sélecteur FR / EN / EE est dans l'en-tête ; l'**éwé** y est annoncé mais pas encore activé.
  - *Interface* (menus, boutons, formulaires, messages) : traduite dans `frontend/locales/en.ts`. Dans le code, le texte français sert de clé : `t('Faire un don')`. Un texte sans traduction s'affiche en français.
  - *Pages rédigées* : créer une seconde page avec la **même adresse (slug)** et la langue « English » (Administration › Pages). Sans version anglaise, la page française est affichée avec une mention.
  - *Textes d'accueil, slogan, horaires du secrétariat* : Administration › Paramètres du site › « Version anglaise ».
  - *Annonces et événements* : bloc « Version anglaise » (facultatif) dans leur fiche d'administration ; laissé vide, le site anglais affiche le français.
  - *Homélies, bulletins, campagnes, albums* : une seule langue (celle de la saisie) pour l'instant.
  - *Activer l'éwé plus tard* : ajouter `locales/ee.ts`, passer `enabled: true` dans `frontend/utils/i18n.ts` et étendre le préfixe de langue (`/ee/…`) dans ce même fichier et dans `nuxt.config.ts`.
  - L'administration reste en français.

## Contenu de démonstration et images provisoires

Pour présenter un site complet avant la saisie des vrais contenus (à ne lancer qu'en développement / démonstration) :

```bash
docker compose --env-file .env -f deploiement/docker-compose.yml exec backend npm run seed:demo
```

Le script crée : textes des pages, annonces, horaires, équipe pastorale, événements de l'agenda (dates calculées à partir d'aujourd'hui),
homélies, bulletins (PDF d'exemple), albums photo (illustrations générées), campagnes de dons avec des dons fictifs, demandes reçues, coordonnées.
**Tout est fictif** (noms, numéros, montants). Il peut être relancé sans créer de doublons et ne touche pas à ce que vous avez saisi vous-même.

Pour retirer tout ce contenu d'exemple avant de saisir les vraies données (les pages restent, à réécrire) :

```bash
docker compose --env-file .env -f deploiement/docker-compose.yml exec backend npm run seed:demo -- --clear
```

Captures d'écran pleine page pour relire le site (résultat dans `e2e/test-results/shots/`) :

```bash
MSYS_NO_PATHCONV=1 docker compose --env-file .env -f deploiement/docker-compose.yml --profile e2e run --rm e2e node shots.mjs / /horaires
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

## Qualité, sécurité et performance

- **Tests :** 101 tests backend (unitaires + intégration sur PostgreSQL) et 43 tests de bout en bout dans un vrai navigateur (voir `e2e/README.md`).
- **Sécurité :** voir `docs/SECURITE.md`. Plusieurs mesures de durcissement sont **volontairement retirées pour l'instant** (verrouillage par compte, garde-fous de production, mises à jour de dépendances, en-têtes HTTP) : la liste et la marche à suivre pour les réactiver y figurent.
- **Performance / accessibilité (Lighthouse, production, mobile émulé) :** accueil **86 à 90** en performance, **100** en accessibilité, bonnes pratiques et SEO ; les autres pages 87 à 93.
  Les grandes photos sont servies en versions adaptées à l'écran (`/api/image`) : un téléphone télécharge quelques dizaines de Ko au lieu de centaines.

### Répéter la production en local

Pour tester la vraie pile (Nginx + images de production + base séparée) avant de toucher au serveur, créer un fichier `.env.prod-local` (ignoré par git) :

```bash
POSTGRES_DB=sainte_lucie   POSTGRES_USER=sainte_lucie   POSTGRES_PASSWORD=<aléatoire, lettres et chiffres>
PUBLIC_URL=http://localhost:8080  HTTP_PORT=8080  COOKIE_SECURE=false
PAYMENT_MODE=mock                 # ⚠ paiements simulés : répétition locale UNIQUEMENT
ADMIN_EMAIL=...                   ADMIN_PASSWORD=<fort>
```

```bash
docker compose --env-file .env.prod-local -f deploiement/docker-compose.prod.yml up -d --build
docker compose --env-file .env.prod-local -f deploiement/docker-compose.prod.yml exec backend node dist/scripts/seed.js
# site : http://localhost:8080
```

⚠ Aucun garde-fou n'empêche pour l'instant de démarrer la production avec des paiements simulés ou un mot de passe d'exemple : à vérifier à la main avant la mise en ligne.

## Tests

```bash
# Unitaires + intégration (nécessite la base : à lancer dans le conteneur)
docker compose --env-file .env -f deploiement/docker-compose.yml exec -e RUN_DB_TESTS=1 backend npm test
```
