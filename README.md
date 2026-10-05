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
| 0 | Fondations : structure, Docker, CI, health check | fait |
| 1 | Schéma de données complet, authentification, rôles | à venir |
| 2 | Back-office : utilisateurs, médiathèque, paramètres | à venir |
| 3 | Contenus : pages, annonces, bulletins, horaires, personnel, homélies | à venir |
| 4 | Site public (maquette) | à venir |
| 5 | Calendrier et formulaires | à venir |
| 6 | Dons en ligne | à venir |
| 7 | SEO, multilingue, cookies, newsletter | à venir |
| 8 | Qualité et sécurité | à venir |
| 9 | Mise en production | à venir |
