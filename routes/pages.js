const express = require('express');
const { asyncHandler } = require('../lib/asyncHandler');
const {
  getHomeData,
  getProductData,
  getReviewsPageData,
  getNewArrivalsPageData,
  getTrackOrderPageData,
  getCheckoutPageData,
} = require('../lib/storeData');
const {
  getSiteUrl,
  seoForHome,
  seoForCategory,
  seoForProduct,
  seoForReviews,
  seoForNewArrivals,
  seoForTrackOrder,
  seoNoIndex,
} = require('../lib/seo');
const { isCatalogCategory } = require('../lib/catalogCategories');
const { buildSitemapXml } = require('../lib/sitemap');

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const cat = req.query.category;
    const q = req.query.q;
    if (cat && cat !== 'all' && !q) {
      return res.redirect(301, `/category/${cat}`);
    }
    const data = await getHomeData(req, req.query);
    const siteUrl = getSiteUrl(req);
    const seo = seoForHome(siteUrl, { searchQuery: data.searchQuery });
    res.render('index', { ...data, seo, siteUrl });
  } catch (err) {
    console.error(err);
    res.status(500).render('error', { message: err.message });
  }
});

router.get('/category/:slug', async (req, res) => {
  try {
    const slug = req.params.slug;
    if (!isCatalogCategory(slug)) {
      return res.status(404).render('error', { message: 'ক্যাটাগরি পাওয়া যায়নি' });
    }
    const data = await getHomeData(req, { category: slug });
    const category = (data.categories || []).find((c) => c.slug === slug);
    if (!category) {
      return res.status(404).render('error', { message: 'ক্যাটাগরি পাওয়া যায়নি' });
    }
    const siteUrl = getSiteUrl(req);
    const seo = seoForCategory(category, siteUrl);
    res.render('index', { ...data, activeNav: slug, seo, siteUrl });
  } catch (err) {
    console.error(err);
    res.status(500).render('error', { message: err.message });
  }
});

router.get('/reviews', async (req, res) => {
  try {
    const data = await getReviewsPageData(req, req.query);
    const siteUrl = getSiteUrl(req);
    const seo = seoForReviews(siteUrl, {
      currentPage: data.currentPage,
      totalPages: data.totalPages,
    });
    res.render('reviews', { ...data, seo, siteUrl });
  } catch (err) {
    console.error(err);
    res.status(500).render('error', { message: err.message });
  }
});

router.get('/track-order', async (req, res) => {
  try {
    const data = await getTrackOrderPageData(req, req.query);
    const siteUrl = getSiteUrl(req);
    const seo = seoForTrackOrder(siteUrl);
    res.render('track-order', { ...data, seo, siteUrl });
  } catch (err) {
    console.error(err);
    res.status(500).render('error', { message: err.message });
  }
});

router.get('/checkout', async (req, res) => {
  try {
    const data = await getCheckoutPageData(req);
    const siteUrl = getSiteUrl(req);
    const seo = seoNoIndex('চেকআউট');
    res.render('checkout', { ...data, seo, siteUrl });
  } catch (err) {
    console.error(err);
    res.status(500).render('error', { message: err.message });
  }
});

router.get('/new-arrivals', async (req, res) => {
  try {
    const data = await getNewArrivalsPageData(req);
    const siteUrl = getSiteUrl(req);
    const seo = seoForNewArrivals(siteUrl);
    res.render('new-arrivals', { ...data, seo, siteUrl });
  } catch (err) {
    console.error(err);
    res.status(500).render('error', { message: err.message });
  }
});

router.get(
  '/product/:id',
  asyncHandler(async (req, res) => {
    const data = await getProductData(req, req.params.id);
    if (!data) {
      return res.status(404).render('error', { message: 'পণ্য পাওয়া যায়নি' });
    }
    if (data.product?.slug && /^\d+$/.test(String(req.params.id))) {
      return res.redirect(301, `/product/${data.product.slug}`);
    }
    const siteUrl = getSiteUrl(req);
    const seo = seoForProduct(data.product, siteUrl);
    res.render('product', { ...data, seo, siteUrl });
  })
);

router.get('/sitemap.xml', async (req, res) => {
  try {
    const xml = await buildSitemapXml(req);
    res.set('Content-Type', 'application/xml; charset=utf-8');
    res.set('Cache-Control', 'public, max-age=3600');
    res.send(xml);
  } catch (err) {
    console.error(err);
    res.status(500).send('Sitemap error');
  }
});

module.exports = router;
