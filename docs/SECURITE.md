# Sécurité : protections en place, risques acceptés, vérifications avant la mise en ligne

## Protections en place

| Domaine | Mesure |
|---|---|
| Authentification | Sessions en base (jeton aléatoire haché), cookie `HttpOnly` + `SameSite=Lax` + `Secure` en production, mots de passe hachés (scrypt, 10 caractères minimum), sessions expirées purgées chaque heure |
| Force brute | 5 essais/minute par adresse IP **et** 10 échecs / 15 min par compte (même depuis des IP différentes) ; comptes inconnus comptés pareil (pas d'énumération) ; Nginx limite aussi la route de connexion |
| Adresse IP réelle | Nginx remplace `X-Forwarded-For` ; le backend ne fait confiance qu'aux réseaux privés (Docker). Un visiteur ne peut pas falsifier son adresse pour contourner les limites (testé) |
| CSRF | Toute requête qui modifie des données venant d'un navigateur doit provenir d'une origine autorisée (`CORS_ORIGIN`) |
| Droits | Rôles administrateur / éditeur / contributeur contrôlés **côté serveur** sur chaque route (testés) ; un contributeur ne publie ni ne supprime |
| Injection | Requêtes paramétrées (Prisma), validation stricte de chaque entrée (zod, schémas `strict`) |
| XSS | HTML des éditeurs nettoyé côté serveur (liste blanche), JSON-LD échappé, aucune donnée utilisateur injectée sans échappement |
| Fichiers téléversés | Type vérifié sur le **contenu réel** (pas l'extension), images recompressées (WebP), noms aléatoires, 10 Mo max, PDF/images uniquement |
| Données sensibles | Aucune donnée de carte ni de compte Mobile Money (les prestataires les traitent) ; demandes et dons réservés aux rôles habilités ; exports CSV protégés contre l'injection de formules |
| Paiements | Un don n'est validé que par vérification directe auprès du prestataire, pour le bon montant ; webhooks = simple déclencheur |
| Anti-spam | Champ piège invisible + limites par IP sur les formulaires, dons, newsletter |
| En-têtes HTTP | CSP stricte, `X-Frame-Options`, `nosniff`, `Referrer-Policy`, `Permissions-Policy` (production) ; `helmet` côté API |
| Vie privée | Aucun cookie publicitaire, mesure d'audience anonyme sur consentement, vidéos tierces chargées au clic |
| Production | Le serveur **refuse de démarrer** avec un mot de passe d'exemple, les paiements simulés, un cookie non sécurisé ou un site sans HTTPS (`ALLOW_INSECURE_PROD` réservé aux répétitions locales) ; processus en utilisateur non-root |

## Risques acceptés (connus)

1. **`script-src 'unsafe-inline'` dans la CSP** : Nuxt injecte sa configuration en ligne. Atténué par le nettoyage HTML, `object-src 'none'`, `frame-ancestors`, `form-action`, `connect-src 'self'`. Piste d'amélioration : module à nonces.
2. **Avis `npm audit` du frontend (11, « high »)** : outils de compilation (Nuxt CLI, génération de certificats de dev). **Absents de l'image de production** (vérifié : 4,5 Mo, aucun de ces paquets). À mettre à jour avec les prochaines versions de Nuxt.
3. **Prisma CLI** : la dépendance `deepmerge-ts` est forcée en version corrigée (`overrides`). La migration vers Prisma 7 est à planifier.
4. **Verrouillage par compte** : un attaquant peut volontairement bloquer un compte 15 minutes (au prix de 10 essais) ; compromis préféré à la force brute.
5. **Visiteurs uniques des statistiques** : empreinte gardée en mémoire seulement, remise à zéro au redémarrage.
6. **Intégrations de paiement** : testées contre des serveurs simulés, pas encore contre les comptes réels (voir README).

## À faire avant l'ouverture publique

- [ ] Changer le mot de passe administrateur et choisir des mots de passe MySQL forts (`.env` du serveur).
- [ ] Activer HTTPS (sprint 9) puis `COOKIE_SECURE=true`, `PUBLIC_URL=https://…`, ajouter HSTS.
- [ ] Essai de bout en bout des dons avec les comptes **bac à sable** CinetPay et PayPal.
- [ ] Faire relire les textes légaux (mentions légales, confidentialité).
- [ ] Vérifier la restauration d'une sauvegarde (base **et** fichiers).
- [ ] Ne jamais exposer le port MySQL ni celui du backend à Internet (seul Nginx publie un port).
