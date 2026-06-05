const { productPath } = require('./productSlugUtils');

const SITE_NAME = 'WallNest BD';
const DEFAULT_DESCRIPTION =
  'ওয়াল আর্ট ও ক্যানভাস অনলাইন শপ — ইসলামিক আর্ট, ফ্যামিলি ফটো ক্যানভাস, কিডস রুম ও অফিস মোটিভেশনাল। বাংলাদেশে হোম ডেলিভারি।';
const DEFAULT_OG_IMAGE = '/images/wallnestbd-logo.png';

function getSiteUrl(req) {
  const fromEnv = process.env.BASE_URL || process.env.NEXT_PUBLIC_SITE_URL;
  if (fromEnv) return fromEnv.replace(/\/$/, '');
  const host = req?.headers?.host;
  if (host) {
    const proto = req.headers['x-forwarded-proto'] || 'http';
    return `${proto}://${host}`;
  }
  return 'https://wallnestbd.com';
}

function absUrl(base, path) {
  if (!path) return base;
  if (String(path).startsWith('http')) return path;
  return `${base}${path.startsWith('/') ? '' : '/'}${path}`;
}

function truncateDesc(text, max = 155) {
  const s = String(text || '').replace(/\s+/g, ' ').trim();
  if (!s) return DEFAULT_DESCRIPTION;
  if (s.length <= max) return s;
  return `${s.slice(0, max - 3).trimEnd()}...`;
}

function organizationJsonLd(baseUrl) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: SITE_NAME,
    url: baseUrl,
    logo: absUrl(baseUrl, DEFAULT_OG_IMAGE),
    description: DEFAULT_DESCRIPTION,
    contactPoint: {
      '@type': 'ContactPoint',
      contactType: 'customer service',
      email: 'support@wallnestbd.com',
      availableLanguage: ['bn', 'en'],
    },
  };
}

function websiteJsonLd(baseUrl) {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: SITE_NAME,
    url: baseUrl,
    inLanguage: 'bn',
    potentialAction: {
      '@type': 'SearchAction',
      target: `${baseUrl}/?q={search_term_string}`,
      'query-input': 'required name=search_term_string',
    },
  };
}

function breadcrumbJsonLd(items) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: item.name,
      item: item.url,
    })),
  };
}

function productJsonLd(product, baseUrl) {
  const images = product.images?.length
    ? product.images
    : product.imageUrl
      ? [product.imageUrl]
      : [];
  const canonical = `${baseUrl}${productPath(product)}`;
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    description: truncateDesc(product.desc || product.name),
    image: images.map((url) => absUrl(baseUrl, url)),
    sku: `WN-${product.id}`,
    brand: { '@type': 'Brand', name: SITE_NAME },
    offers: {
      '@type': 'Offer',
      url: canonical,
      priceCurrency: 'BDT',
      price: String(product.price),
      availability:
        product.stock > 0
          ? 'https://schema.org/InStock'
          : 'https://schema.org/OutOfStock',
      seller: { '@type': 'Organization', name: SITE_NAME },
    },
  };
  if (product.reviews > 0 && product.rating) {
    schema.aggregateRating = {
      '@type': 'AggregateRating',
      ratingValue: String(product.rating),
      reviewCount: String(product.reviews),
    };
  }
  return schema;
}

function buildSeo({
  title,
  description,
  canonical,
  image,
  type = 'website',
  robots,
  jsonLd = [],
  prev,
  next,
}) {
  const desc = truncateDesc(description);
  const ogImage = image || DEFAULT_OG_IMAGE;
  return {
    title: title.includes(SITE_NAME) ? title : `${title} — ${SITE_NAME}`,
    description: desc,
    canonical,
    ogImage,
    ogType: type === 'product' ? 'product' : 'website',
    robots: robots || 'index, follow',
    jsonLd: Array.isArray(jsonLd) ? jsonLd : [jsonLd],
    prev: prev || null,
    next: next || null,
  };
}

function seoForHome(baseUrl, { searchQuery } = {}) {
  if (searchQuery) {
    const q = String(searchQuery).trim();
    return buildSeo({
      title: `"${q}" অনুসন্ধান`,
      description: `WallNest BD-তে "${q}" অনুসন্ধানের ফলাফল দেখুন।`,
      canonical: absUrl(baseUrl, `/?q=${encodeURIComponent(q)}`),
      robots: 'noindex, follow',
    });
  }
  return buildSeo({
    title: `${SITE_NAME} — ওয়াল আর্ট ও ক্যানভাস অনলাইন শপ`,
    description: DEFAULT_DESCRIPTION,
    canonical: `${baseUrl}/`,
    image: DEFAULT_OG_IMAGE,
    jsonLd: [organizationJsonLd(baseUrl), websiteJsonLd(baseUrl)],
  });
}

function seoForCategory(category, baseUrl) {
  const name = category.name_bn || category.name_en || category.slug;
  const en = category.name_en || name;
  return buildSeo({
    title: `${name} — ওয়াল আর্ট ও ক্যানভাস`,
    description: `${name} (${en}) ক্যাটাগরির সেরা ওয়াল আর্ট ও ক্যানভাস পণ্য কিনুন। বাংলাদেশে হোম ডেলিভারি — ${SITE_NAME}।`,
    canonical: `${baseUrl}/category/${category.slug}`,
    image: category.hero_image_url || category.heroImageUrl || DEFAULT_OG_IMAGE,
    jsonLd: [
      breadcrumbJsonLd([
        { name: 'হোম', url: `${baseUrl}/` },
        { name, url: `${baseUrl}/category/${category.slug}` },
      ]),
    ],
  });
}

function seoForProduct(product, baseUrl) {
  const images = product.images?.length
    ? product.images
    : product.imageUrl
      ? [product.imageUrl]
      : [];
  const catName = product.cat || 'পণ্য';
  return buildSeo({
    title: product.name,
    description: truncateDesc(
      product.desc || `${product.name} — ৳${product.price} | ${catName}`
    ),
    canonical: `${baseUrl}${productPath(product)}`,
    image: images[0] || DEFAULT_OG_IMAGE,
    type: 'product',
    jsonLd: [
      productJsonLd(product, baseUrl),
      breadcrumbJsonLd([
        { name: 'হোম', url: `${baseUrl}/` },
        {
          name: catName,
          url: product.catSlug
            ? `${baseUrl}/category/${product.catSlug}`
            : `${baseUrl}/`,
        },
        { name: product.name, url: `${baseUrl}${productPath(product)}` },
      ]),
    ],
  });
}

function seoForReviews(baseUrl, { currentPage = 1, totalPages = 1 } = {}) {
  const page = Number(currentPage) || 1;
  const canonical =
    page <= 1 ? `${baseUrl}/reviews` : `${baseUrl}/reviews?page=${page}`;
  const prev = page > 1 ? (page === 2 ? `${baseUrl}/reviews` : `${baseUrl}/reviews?page=${page - 1}`) : null;
  const next = page < totalPages ? `${baseUrl}/reviews?page=${page + 1}` : null;
  const titleSuffix = page > 1 ? ` (পেজ ${page})` : '';
  return buildSeo({
    title: `গ্রাহকের মতামত${titleSuffix}`,
    description:
      'WallNest BD গ্রাহকদের আসল রিভিউ ও মতামত পড়ুন। ওয়াল আর্ট ও ক্যানভাস কেনার আগে অন্যদের অভিজ্ঞতা জানুন।',
    canonical,
    image: DEFAULT_OG_IMAGE,
    prev,
    next,
    jsonLd: [
      breadcrumbJsonLd([
        { name: 'হোম', url: `${baseUrl}/` },
        { name: 'গ্রাহকের মতামত', url: `${baseUrl}/reviews` },
      ]),
    ],
  });
}

function seoForTrackOrder(baseUrl) {
  return buildSeo({
    title: 'অর্ডার ট্র্যাক',
    description:
      'WallNest BD অর্ডার ট্র্যাক করুন — অর্ডার নম্বর ও মোবাইল দিয়ে ডেলিভারি ও পেমেন্ট স্ট্যাটাস দেখুন।',
    canonical: `${baseUrl}/track-order`,
    image: DEFAULT_OG_IMAGE,
    jsonLd: [
      breadcrumbJsonLd([
        { name: 'হোম', url: `${baseUrl}/` },
        { name: 'অর্ডার ট্র্যাক', url: `${baseUrl}/track-order` },
      ]),
    ],
  });
}

function seoForNewArrivals(baseUrl) {
  return buildSeo({
    title: 'নতুন আরাইভাল',
    description:
      'WallNest BD-এর সর্বশেষ ওয়াল আর্ট ও ক্যানভাস পণ্য — নতুন কালেকশন এক নজরে দেখুন।',
    canonical: `${baseUrl}/new-arrivals`,
    image: DEFAULT_OG_IMAGE,
    jsonLd: [
      breadcrumbJsonLd([
        { name: 'হোম', url: `${baseUrl}/` },
        { name: 'নতুন আরাইভাল', url: `${baseUrl}/new-arrivals` },
      ]),
    ],
  });
}

function seoNoIndex(title) {
  return buildSeo({
    title,
    description: DEFAULT_DESCRIPTION,
    canonical: null,
    robots: 'noindex, nofollow',
  });
}

module.exports = {
  SITE_NAME,
  DEFAULT_DESCRIPTION,
  DEFAULT_OG_IMAGE,
  getSiteUrl,
  absUrl,
  truncateDesc,
  buildSeo,
  seoForHome,
  seoForCategory,
  seoForProduct,
  seoForReviews,
  seoForNewArrivals,
  seoForTrackOrder,
  seoNoIndex,
};
