// Données initiales : compte administrateur, catégories d'événements, paramètres du site.
// Dev : npm run seed        Prod : node dist/scripts/seed.js
// Idempotent : peut être relancé sans danger.
import { PrismaClient } from '@prisma/client';
import { hashPassword } from '../auth/password.js';

const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
const password = process.env.ADMIN_PASSWORD;

if (!email || !password) {
  console.error('ADMIN_EMAIL et ADMIN_PASSWORD sont requis.');
  process.exit(1);
}
if (password.length < 10) {
  console.error('ADMIN_PASSWORD doit contenir au moins 10 caractères.');
  process.exit(1);
}

const prisma = new PrismaClient();

try {
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    console.log(`Administrateur déjà présent : ${email} (mot de passe inchangé)`);
  } else {
    await prisma.user.create({
      data: {
        email,
        passwordHash: await hashPassword(password),
        firstName: 'Administrateur',
        lastName: 'Paroisse',
        role: 'ADMIN',
      },
    });
    console.log(`Administrateur créé : ${email}`);
  }

  const categories = [
    { slug: 'messe', name: 'Messes et célébrations', color: '#1F3A5F' },
    { slug: 'catechese', name: 'Catéchèse', color: '#B8860B' },
    { slug: 'jeunesse', name: 'Jeunesse', color: '#2E7D32' },
    { slug: 'communaute', name: 'Vie communautaire', color: '#8E24AA' },
  ];
  for (const c of categories) {
    await prisma.eventCategory.upsert({ where: { slug: c.slug }, update: {}, create: c });
  }

  // Valeurs par défaut (modifiables dans Administration > Paramètres du site). Les images vides = images provisoires.
  const settings: Record<string, string> = {
    'site.name': 'Paroisse Sainte Lucie de Baguida',
    'site.tagline': 'Communauté catholique',
    'home.welcomeTitle': 'Bienvenue à la paroisse Sainte Lucie',
    'home.welcomeText':
      'Que vous soyez paroissien, visiteur de passage ou membre de la diaspora, nous sommes heureux de vous accueillir. Retrouvez ici les horaires des messes, les annonces, les bulletins et toute la vie de notre communauté.',
    'site.contactEmail': '',
    'site.phone': '',
    'site.address': '',
  };
  for (const [key, value] of Object.entries(settings)) {
    await prisma.setting.upsert({ where: { key }, update: {}, create: { key, value } });
  }

  // Pages légales par défaut (créées seulement si elles n'existent pas). TEXTES TYPES : à relire et adapter par la paroisse.
  const note = '<blockquote><p><strong>Texte type à relire.</strong> Complétez les éléments entre crochets et faites valider ce texte par la paroisse (et, si possible, par un conseil juridique) avant la mise en ligne définitive.</p></blockquote>';
  const legalPages = [
    {
      slug: 'mentions-legales',
      title: 'Mentions légales',
      content: note +
        '<h2>Éditeur du site</h2><p>Paroisse Sainte Lucie de Baguida, [adresse complète], [téléphone], [e-mail].</p>' +
        '<p>Directeur de la publication : [nom du curé ou du responsable].</p>' +
        '<h2>Réalisation</h2><p>Conception et développement : ALOWANOU Dove Leonce, chef de projet.</p>' +
        '<h2>Hébergement</h2><p>Le site est hébergé par Contabo GmbH, Aschauer Straße 32a, 81549 Munich, Allemagne.</p>' +
        '<h2>Propriété intellectuelle</h2><p>Les textes et photographies de ce site appartiennent à la paroisse ou à leurs auteurs. Toute reproduction à des fins commerciales est interdite sans autorisation.</p>',
    },
    {
      slug: 'confidentialite',
      title: 'Politique de confidentialité',
      content: note +
        '<p>La paroisse Sainte Lucie de Baguida respecte votre vie privée. Cette page explique quelles données nous collectons, pourquoi, et comment exercer vos droits, conformément à la réglementation applicable (notamment la loi togolaise n° 2019-014 relative à la protection des données à caractère personnel).</p>' +
        '<h2>Responsable du traitement</h2><p>Paroisse Sainte Lucie de Baguida, [adresse], [e-mail de contact].</p>' +
        '<h2>Données collectées et finalités</h2><ul>' +
        '<li><strong>Formulaires</strong> (contact, adhésion, catéchisme, sacrements, intentions de messe) : nom, coordonnées et contenu de votre demande, pour traiter votre demande. Conservation : [3 ans] après le dernier échange.</li>' +
        '<li><strong>Dons en ligne</strong> : nom, coordonnées, montant et référence du paiement, pour enregistrer et confirmer votre don. Les paiements sont traités par nos prestataires (CinetPay, PayPal) : <strong>la paroisse ne voit ni ne conserve vos données de carte ou de compte Mobile Money</strong>. Conservation : [10 ans] (obligations comptables).</li>' +
        '<li><strong>Lettre d’information</strong> : votre adresse e-mail, avec votre consentement (confirmation par e-mail). Désinscription possible à tout moment par le lien présent dans chaque message.</li>' +
        '<li><strong>Mesure d’audience</strong> : si vous l’acceptez, nous comptons les pages vues de manière anonyme (aucun cookie, aucune adresse IP ni identifiant conservé).</li></ul>' +
        '<h2>Cookies et traceurs</h2><p>Ce site n’utilise <strong>aucun cookie publicitaire ni de suivi</strong>. Un cookie technique de session est utilisé uniquement pour les personnes connectées à l’administration. Votre choix concernant la mesure d’audience est mémorisé dans votre navigateur. Les vidéos (YouTube, Facebook) ne sont chargées qu’après votre clic.</p>' +
        '<h2>Destinataires</h2><p>Les données sont accessibles uniquement aux personnes habilitées de la paroisse et à nos prestataires techniques (hébergement, envoi d’e-mails, paiement), dans la limite de leur mission. Elles ne sont jamais vendues.</p>' +
        '<h2>Vos droits</h2><p>Vous pouvez demander l’accès, la rectification ou la suppression de vos données, ou vous opposer à leur traitement, en écrivant à [e-mail de contact]. Vous pouvez aussi saisir l’autorité de protection des données de votre pays.</p>',
    },
  ];
  for (const pg of legalPages) {
    await prisma.page.upsert({
      where: { slug_locale: { slug: pg.slug, locale: 'fr' } },
      update: {},
      create: { ...pg, locale: 'fr', status: 'PUBLISHED', publishedAt: new Date() },
    });
  }
  console.log('Seed terminé.');
} finally {
  await prisma.$disconnect();
}
