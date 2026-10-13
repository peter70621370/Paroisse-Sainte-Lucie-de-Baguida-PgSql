# Tests de bout en bout (Playwright)

Un vrai navigateur (Chromium) parcourt le site complet : visiteur, formulaires, dons (simulation), newsletter, administration, accessibilité (axe-core, WCAG 2.1 AA).

## Lancer (environnement de développement, Docker Desktop démarré)

```bash
docker compose --env-file .env -f deploiement/docker-compose.yml --profile e2e run --rm e2e
```

Le premier lancement télécharge l'image Playwright (~3,5 Go) puis installe les dépendances : compter 10 minutes. Ensuite c'est plus rapide.
Résultats détaillés (captures, traces) : dossier `e2e/test-results/` en cas d'échec.

## Ce qui est testé

| Fichier | Contenu |
|---|---|
| `public.spec.ts` | accueil sans erreur JS, bandeau de vie privée, refus = aucune visite comptée, menu, 404, agenda/galerie/direct, sitemap (le test des en-têtes de sécurité est en pause) |
| `forms.spec.ts` | formulaire de contact (erreurs puis envoi + accusé de réception), adhésion |
| `donation.spec.ts` | don complet en simulation (réussi, échoué, montant invalide) et visible côté administration |
| `newsletter.spec.ts` | inscription, e-mail de confirmation (Mailpit), confirmation, désinscription |
| `admin.spec.ts` | connexion/déconnexion, créer et publier une page avec l'éditeur, brouillon invisible, HTML nettoyé, droits du contributeur |
| `accessibility.spec.ts` | audit axe-core de 12 pages : aucune violation grave ou critique |

Les tests desktop tournent aussi en mobile (Pixel 7) pour `public.spec.ts`.

## Données de test

- Les pages et abonnés créés sont supprimés par les tests eux-mêmes.
- Les **dons** ne sont pas supprimables par l'API (traçabilité) : ceux des tests portent le nom « E2E … ». Pour les retirer de la base de **développement** :

```bash
docker compose --env-file .env -f deploiement/docker-compose.yml exec postgres sh -c 'psql -U $POSTGRES_USER -d $POSTGRES_DB -c "DELETE FROM donations WHERE \"donorName\" LIKE \$\$E2E%\$\$;"'
```

- Un compte « contributeur » de test (`e2e-contributeur@example.test`) est créé une fois ; l'effacer depuis Administration › Utilisateurs (le désactiver) si besoin.

## Contre la répétition de production

```bash
docker run --rm --network sainte-lucie-prod_internal -v "$PWD/e2e:/e2e" -w /e2e \
  -e BASE_URL=http://nginx -e EXPECT_SECURITY_HEADERS=1 -e ADMIN_EMAIL=... -e ADMIN_PASSWORD=... \
  mcr.microsoft.com/playwright:v1.63.0-noble sh -c "npm install && npx playwright test"
```
