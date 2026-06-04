const express = require('express');
const { supabase } = require('../lib/supabase');
const { mapProduct } = require('../lib/mapProduct');
const { filterByProductParam } = require('../lib/productQuery');
const { asyncHandler } = require('../lib/asyncHandler');
const { getPageContext } = require('../lib/pageContext');

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const ctx = await getPageContext(req);
    const [{ data: products }, { data: flash }, { data: reviews }] =
      await Promise.all([
        supabase
          .from('products')
          .select('*, categories(slug, name_en, name_bn, catalog_share)')
          .order('legacy_id'),
        supabase
          .from('products')
          .select('*, categories(slug, name_en, name_bn)')
          .eq('is_flash_sale', true)
          .order('legacy_id')
          .limit(4),
        supabase.from('reviews').select('*').order('created_at', { ascending: false }).limit(3),
      ]);

    let productList = (products || []).map(mapProduct);
    const catFilter = req.query.category;
    const q = (req.query.q || '').trim().toLowerCase();
    if (catFilter && catFilter !== 'all') {
      productList = productList.filter((p) => p.catSlug === catFilter);
      ctx.activeNav = catFilter;
    } else {
      ctx.activeNav = 'home';
    }
    if (q) {
      productList = productList.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          (p.nameBn && p.nameBn.includes(q)) ||
          p.cat.toLowerCase().includes(q)
      );
    }

    res.render('index', {
      ...ctx,
      searchQuery: req.query.q || '',
      products: productList,
      flashProducts: (flash || []).map(mapProduct),
      reviews: reviews || [],
    });
  } catch (err) {
    console.error(err);
    res.status(500).render('error', { message: err.message });
  }
});

router.get(
  '/product/:id',
  asyncHandler(async (req, res) => {
    const ctx = await getPageContext(req);
    const { data: raw, error } = await filterByProductParam(
      supabase.from('products').select('*, categories(slug, name_en, name_bn)'),
      req.params.id
    ).maybeSingle();

    if (error) throw error;
    if (!raw) {
      return res.status(404).render('error', { message: 'পণ্য পাওয়া যায়নি' });
    }

    const product = mapProduct(raw);

    const relatedPromise = raw.category_id
      ? supabase
          .from('products')
          .select('*, categories(slug, name_en, name_bn)')
          .eq('category_id', raw.category_id)
          .neq('id', raw.id)
          .order('legacy_id')
          .limit(8)
      : Promise.resolve({ data: [] });

    const [{ data: relatedRaw }, { data: productReviews }, { data: alsoLikeRaw }] =
      await Promise.all([
        relatedPromise,
        supabase
          .from('reviews')
          .select('*')
          .eq('product_id', raw.id)
          .order('created_at', { ascending: false })
          .limit(10),
        supabase
          .from('products')
          .select('*, categories(slug, name_en, name_bn)')
          .eq('is_featured', true)
          .neq('id', raw.id)
          .order('legacy_id')
          .limit(4),
      ]);

    res.render('product', {
      ...ctx,
      product,
      related: (relatedRaw || []).map(mapProduct),
      alsoLike: (alsoLikeRaw || []).map(mapProduct),
      productReviews: productReviews || [],
    });
  })
);

module.exports = router;
