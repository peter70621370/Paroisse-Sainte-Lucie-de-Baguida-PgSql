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

  const settings: Record<string, string> = {
    'site.name': 'Paroisse Sainte Lucie de Baguida',
    'site.contactEmail': '',
    'site.phone': '',
    'site.address': '',
  };
  for (const [key, value] of Object.entries(settings)) {
    await prisma.setting.upsert({ where: { key }, update: {}, create: { key, value } });
  }
  console.log('Seed terminé.');
} finally {
  await prisma.$disconnect();
}
