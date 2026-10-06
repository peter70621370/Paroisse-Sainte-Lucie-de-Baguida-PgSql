# Sécurité : protections en place, mesures retirées pour l'instant, vérifications avant la mise en ligne

## Protections en place

| Domaine | Mesure |
|---|---|
| Authentification | Sessions en base (jeton aléatoire haché), cookie `HttpOnly` + `SameSite=Lax` + `Secure` en production, mots de passe hachés (scrypt, 10 caractères minimum) |
| Force brute | 5 essais/minute par adresse IP sur la connexion (et sur le changement de mot de passe) ; comptes inconnus traités comme les autres (pas d'énumération) |
| Adresse IP réelle | Nginx remplace `X-Forwarded-For` ; le backend ne fait confiance qu'aux réseaux privés (Docker). Un visiteur ne peut pas falsifier son adresse pour contourner les limites (testé) |
| CSRF | Toute requête qui modifie des données venant d'un navigateur doit provenir d'une origine autorisée (`CORS_ORIGIN`) |
| Droits | Rôles administrateur / éditeur / contributeur contrôlés **côté serveur** sur chaque route (testés) |
| Injection | Requêtes paramétrées (Prisma), validation stricte de chaque entrée (zod, schémas `strict`) |
| XSS | HTML des éditeurs nettoyé côté serveur (liste blanche), JSON-LD échappé |
| Fichiers téléversés | Type vérifié sur le **contenu réel**, images recompressées (WebP), noms aléatoires, 10 Mo max |
| Images adaptées (`/api/image`) | Uniquement des WebP de la médiathèque, largeurs en liste fermée, chemins strictement contrôlés (testé : traversée de dossier refusée) |
| Données sensibles | Aucune donnée de carte ni de compte Mobile Money ; demandes et dons réservés aux rôles habilités ; exports CSV protégés contre l'injection de formules |
| Paiements | Un don n'est validé que par vérification directe auprès du prestataire, pour le bon montant |
| Anti-spam | Champ piège invisible + limites par IP sur les formulaires, dons, newsletter |
| Vie privée | Aucun cookie publicitaire, mesure d'audience anonyme sur consentement, vidéos tierces chargées au clic |
| API | `helmet` (en-têtes de sécurité des réponses de l'API) |

## Mesures retirées pour l'instant (décision du 6 octobre 2026)

Ces mesures avaient été ajoutées au sprint 8 (commit `86de8b0`) puis retirées à la demande du client. **À réexaminer avant l'ouverture publique.**

| Mesure retirée | Conséquence tant qu'elle est absente |
|---|---|
| **Verrouillage par compte** (10 échecs / 15 min) | Seule la limite par adresse IP (5/min) protège la connexion : une attaque répartie sur de nombreuses adresses peut tester des mots de passe sans être bloquée |
| **Garde-fous de production** (refus de démarrer avec mot de passe d'exemple, paiements simulés, cookie non sécurisé, site sans HTTPS) | Rien n'empêche de lancer la production avec `PAYMENT_MODE=mock` (un clic suffirait à « payer » un don) ou un mot de passe d'exemple : **vérification manuelle obligatoire** |
| **Purge des sessions expirées** | La table `sessions` grossit lentement (les sessions expirées ne servent à rien mais restent en base) |
| **Mises à jour de dépendances** : Nodemailer 10, sharp 0.35, `@fastify/static` 10 | Versions antérieures avec des avis de sécurité connus (6 pour Nodemailer, dont déni de service par adresse piégée ; sharp/libvips, qui traite les images téléversées par les utilisateurs connectés ; `@fastify/static`) |
| **En-têtes HTTP du site** (CSP, `X-Frame-Options`, `nosniff`, `Referrer-Policy`, `Permissions-Policy`) | Le site peut être inclus dans le cadre d'un autre site (clickjacking) et aucune politique ne limite les ressources chargées |
| **Durcissement de Nginx** (limites de débit, masquage de version, délais clients) | Nginx n'applique aucune limite propre (seules celles du backend jouent) |

Conservés malgré tout : compression et cache Nginx, remplacement de `X-Forwarded-For`, re-résolution des conteneurs (évite les erreurs 502 après une mise à jour).
Le test de bout en bout des en-têtes de sécurité est en pause (`test.fixme` dans `e2e/tests/public.spec.ts`).

### Pour les réactiver

Tout est dans l'historique git : `git show 86de8b0` (sprint 8). Par exemple, pour revenir sur les dépendances :
`git checkout 86de8b0 -- backend/package.json backend/package-lock.json` puis `docker volume rm` du volume `node_modules` du backend et reconstruction ; adapter `setHeaders` de `@fastify/static` (voir ce commit).

## Risques acceptés (connus)

1. **Paiements** : intégrations testées contre des serveurs simulés, pas encore contre les comptes réels.
2. **Statistiques** : l'empreinte des visiteurs uniques est gardée en mémoire seulement (remise à zéro au redémarrage).
3. **Avis `npm audit` du frontend** (outils de compilation, absents de l'image de production).

## À faire avant l'ouverture publique

- [ ] **Décider du sort des mesures retirées ci-dessus** (au minimum les garde-fous de production et les dépendances).
- [ ] Changer le mot de passe administrateur et choisir des mots de passe MySQL forts (`.env` du serveur) ; `PAYMENT_MODE=live`.
- [ ] Activer HTTPS (sprint 9) puis `COOKIE_SECURE=true`, `PUBLIC_URL=https://…`.
- [ ] Essai de bout en bout des dons avec les comptes **bac à sable** CinetPay et PayPal.
- [ ] Faire relire les textes légaux (mentions légales, confidentialité).
- [ ] Vérifier la restauration d'une sauvegarde (base **et** fichiers).
- [ ] Ne jamais exposer le port MySQL ni celui du backend à Internet (seul Nginx publie un port).
