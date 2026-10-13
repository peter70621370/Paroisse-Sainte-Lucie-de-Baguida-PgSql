type Sitemap = {
  pages: { slug: string; locale: string; updatedAt: string }[];
  homilies: { id: number; updatedAt: string }[];
  events: { id: number; updatedAt: string }[];
  albums: { slug: string; updatedAt: string }[];
};

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// Plan du site : pages fixes + contenus publiés (récupérés auprès du backend).
export default defineEventHandler(async (event) => {
  const { siteUrl } = useRuntimeConfig().public;

  const data = await $fetch<Sitemap>(`${apiBase()}/api/sitemap`).catch(() => ({ pages: [], homilies: [], events: [], albums: [] }) as Sitemap);

  const fixed = ['/', '/horaires', '/personnel', '/agenda', '/actualites', '/bulletins', '/homelies', '/galerie', '/direct', '/contact', '/dons', '/demarches/adhesion', '/demarches/catechisme', '/demarches/sacrement', '/demarches/intention-de-messe'];
  const urls: { loc: string; lastmod?: string }[] = [
    ...fixed.map((p) => ({ loc: p })),
    ...fixed.map((p) => ({ loc: p === '/' ? '/en' : `/en${p}` })), // version anglaise
    ...data.pages.map((p) => ({ loc: p.locale === 'fr' ? `/p/${p.slug}` : p.locale === 'en' ? `/en/p/${p.slug}` : `/p/${p.slug}?lang=${p.locale}`, lastmod: p.updatedAt })),
    ...data.homilies.map((h) => ({ loc: `/homelies/${h.id}`, lastmod: h.updatedAt })),
    ...data.events.map((e) => ({ loc: `/agenda/${e.id}`, lastmod: e.updatedAt })),
    ...data.albums.map((a) => ({ loc: `/galerie/${a.slug}`, lastmod: a.updatedAt })),
  ];

  setHeader(event, 'content-type', 'application/xml; charset=utf-8');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls
    .map((u) => `  <url><loc>${esc(siteUrl + u.loc)}</loc>${u.lastmod ? `<lastmod>${u.lastmod.slice(0, 10)}</lastmod>` : ''}</url>`)
    .join('\n')}\n</urlset>\n`;
});
