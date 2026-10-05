// Contenu de DÉMONSTRATION (textes provisoires) pour visualiser le site avant la saisie des vrais contenus.
// Dev uniquement : npm run seed:demo        Idempotent : ne recrée pas ce qui existe déjà.
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const now = new Date();
const p = (t: string) => `<p>${t}</p>`;
const lorem = '[Texte provisoire] Ce contenu est un exemple. Remplacez-le depuis Administration › Pages.';

const pages = [
  { slug: 'mot-du-cure', title: 'Le mot du Curé', excerpt: 'Un message d\'accueil de notre curé.', content: p(lorem) + p('Chers paroissiens, chers amis, soyez les bienvenus dans notre communauté.') },
  { slug: 'histoire', title: 'Histoire de la paroisse', excerpt: 'Les grandes étapes de la vie de la paroisse.', content: '<h2>Nos origines</h2>' + p(lorem) + '<h2>Aujourd\'hui</h2>' + p(lorem) },
  { slug: 'vision-mission', title: 'Vision et mission', excerpt: 'Ce qui nous rassemble et nous envoie.', content: p(lorem) },
  { slug: 'sacrements', title: 'Les sacrements', excerpt: 'Baptême, communion, confirmation, mariage, onction des malades.', content: '<h2>Baptême</h2>' + p(lorem) + '<h2>Mariage</h2>' + p(lorem) },
  { slug: 'groupes-de-priere', title: 'Groupes de prière et mouvements', excerpt: 'Chorale, légion de Marie, renouveau charismatique…', content: p(lorem) },
  { slug: 'catechese', title: 'Catéchèse et formation', excerpt: 'Inscriptions et préparation aux sacrements.', content: p(lorem) },
  { slug: 'jeunesse', title: 'Jeunesse', excerpt: 'Mouvements de jeunes, scouts, activités et camps.', content: p(lorem) },
  { slug: 'sengager', title: 'S\'engager', excerpt: 'Bénévolat et ministères.', content: p(lorem) },
  { slug: 'dons', title: 'Dons et soutien', excerpt: 'Soutenir la vie et les projets de la paroisse.', content: p(lorem) + p('Le paiement en ligne sera disponible prochainement.') },
  { slug: 'mentions-legales', title: 'Mentions légales', excerpt: null, content: p(lorem) },
  { slug: 'confidentialite', title: 'Politique de confidentialité', excerpt: null, content: p(lorem) },
];

try {
  for (const pg of pages) {
    await prisma.page.upsert({
      where: { slug_locale: { slug: pg.slug, locale: 'fr' } },
      update: {},
      create: { ...pg, locale: 'fr', status: 'PUBLISHED', publishedAt: now },
    });
  }

  if ((await prisma.announcement.count()) === 0) {
    await prisma.announcement.createMany({
      data: [
        { title: 'Bienvenue sur le nouveau site de la paroisse', content: p(lorem), pinned: true, status: 'PUBLISHED', publishedAt: now },
        { title: 'Reprise de la catéchèse', content: p('[Texte provisoire] Les inscriptions sont ouvertes au secrétariat.'), status: 'PUBLISHED', publishedAt: new Date(now.getTime() - 86_400_000) },
      ],
    });
  }

  if ((await prisma.massSchedule.count()) === 0) {
    const day = (weekday: any, time: string, kind: any = 'MASS', notes?: string) => ({ weekday, time, kind, language: 'Français', location: 'Église paroissiale', notes: notes ?? null });
    await prisma.massSchedule.createMany({
      data: [
        day('MONDAY', '18:30'), day('TUESDAY', '18:30'), day('WEDNESDAY', '18:30'), day('THURSDAY', '18:30'), day('FRIDAY', '18:30'),
        day('SATURDAY', '17:00', 'CONFESSION'), day('SATURDAY', '18:30', 'MASS', 'Messe anticipée'),
        day('SUNDAY', '07:30'), day('SUNDAY', '09:30', 'MASS', 'Messe des familles'), day('SUNDAY', '18:00'),
      ],
    });
  }

  if ((await prisma.staffMember.count()) === 0) {
    await prisma.staffMember.createMany({
      data: [
        { fullName: 'Abbé [Nom du curé]', function: 'Curé', bio: lorem, sortOrder: 1 },
        { fullName: 'Abbé [Nom du vicaire]', function: 'Vicaire', bio: lorem, sortOrder: 2 },
      ],
    });
  }
  console.log('Contenu de démonstration prêt.');
} finally {
  await prisma.$disconnect();
}
