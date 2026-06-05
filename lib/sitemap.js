const { getCachedCatalogBundle, getCachedCategories } = require('./catalogCache');
const { getSiteUrl } = require('./seo');
const { productPath } = require('./productSlugUtils');

function escapeXml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function urlEntry(loc, { changefreq = 'weekly', priority = '0.7' } = {}) {
  return `  <url>
    <loc>${escapeXml(loc)}</loc>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
  </url>`;
}

async function buildSitemapXml(req) {
  const base = getSiteUrl(req);
  const [bundle, categories] = await Promise.all([
    getCachedCatalogBundle(),
    getCachedCategories(),
  ]);

  const urls = [
    urlEntry(`${base}/`, { changefreq: 'daily', priority: '1.0' }),
    urlEntry(`${base}/new-arrivals`, { changefreq: 'daily', priority: '0.9' }),
    urlEntry(`${base}/reviews`, { changefreq: 'weekly', priority: '0.8' }),
  ];

  for (const cat of categories || []) {
    if (!cat.slug || cat.slug === 'all') continue;
    urls.push(
      urlEntry(`${base}/category/${cat.slug}`, {
        changefreq: 'weekly',
        priority: '0.85',
      })
    );
  }

  for (const product of bundle.products || []) {
    urls.push(
      urlEntry(`${base}${productPath(product)}`, {
        changefreq: 'weekly',
        priority: '0.8',
      })
    );
  }

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join('\n')}
</urlset>`;
}

module.exports = { buildSitemapXml };
