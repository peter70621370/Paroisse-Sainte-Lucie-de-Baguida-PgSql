export default defineEventHandler((event) => {
  const { siteUrl } = useRuntimeConfig().public;
  setHeader(event, 'content-type', 'text/plain; charset=utf-8');
  return [
    'User-agent: *',
    'Disallow: /admin',
    'Disallow: /api/',
    'Disallow: /dons/merci',
    'Disallow: /dons/simulation',
    'Disallow: /newsletter/',
    '',
    `Sitemap: ${siteUrl}/sitemap.xml`,
    '',
  ].join('\n');
});
