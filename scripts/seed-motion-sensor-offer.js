/**
 * Ensure E27 PIR motion sensor offer product exists (landing page SKU).
 * Usage: node scripts/seed-motion-sensor-offer.js
 */
require('dotenv').config();
require('dotenv').config({ path: '.env.local', override: true });

const SLUG = 'e27-pir-motion-sensor-light';

async function main() {
  const { getSupabaseAdminAsync } = require('../lib/supabaseAdmin');
  const { bustCatalog } = require('../lib/catalogCache');
  const db = await getSupabaseAdminAsync();

  const { data: cat, error: catErr } = await db
    .from('categories')
    .upsert(
      {
        slug: 'smart-lighting',
        name_en: 'Smart Lighting',
        name_bn: 'স্মার্ট লাইটিং',
        icon: '💡',
        sort_order: 90,
        catalog_share: null,
      },
      { onConflict: 'slug' }
    )
    .select('id, slug')
    .single();
  if (catErr) throw catErr;

  const payload = {
    legacy_id: 9001,
    category_id: cat.id,
    name_en: 'E27 PIR Motion Sensor LED Bulb 15W',
    name_bn: 'ই২৭ পিআইআর মোশন সেন্সর এলইডি বাল্ব ১৫ওয়াট',
    slug: SLUG,
    description:
      '<p>নড়াচড়া ধরলে অটো লাইট জ্বলে, কেউ না থাকলে নিভে যায়। সাধারণ E27 হোল্ডারে সহজে লাগানো যায় — সিঁড়ি, করিডোর, বারান্দা ও গ্যারেজের জন্য আদর্শ।</p><ul><li>PIR মোশন সেন্সর + লাইট সেন্সর</li><li>E27 স্ক্রু বেস</li><li>১৫W LED</li><li>বিদ্যুৎ সাশ্রয়ী অটো অন/অফ</li></ul>',
    icon: '💡',
    image_url: '/images/e27-pir-motion-sensor-hero.jpg',
    images: [
      '/images/e27-pir-motion-sensor-hero.jpg',
      '/images/motion-sensor-offer-2.jpg',
      '/images/motion-sensor-offer-3.jpg',
      '/images/motion-sensor-offer-4.jpg',
    ],
    price: 450,
    original_price: 550,
    rating: 5,
    review_count: 2,
    badge: 'sale',
    is_featured: false,
    is_flash_sale: true,
    stock: 200,
    sizes: [
      {
        label: '15W',
        label_bn: '১৫ওয়াট',
        price: 450,
        original_price: 550,
        stock: 200,
      },
    ],
  };

  const { data: existing } = await db
    .from('products')
    .select('id')
    .eq('slug', SLUG)
    .maybeSingle();

  let product;
  if (existing?.id) {
    const { data, error } = await db
      .from('products')
      .update(payload)
      .eq('id', existing.id)
      .select('id, slug, price, name_en')
      .single();
    if (error) throw error;
    product = data;
    console.log('Updated offer product:', product);
  } else {
    const { data: byLegacy } = await db
      .from('products')
      .select('id')
      .eq('legacy_id', 9001)
      .maybeSingle();
    if (byLegacy?.id) {
      const { data, error } = await db
        .from('products')
        .update(payload)
        .eq('id', byLegacy.id)
        .select('id, slug, price, name_en')
        .single();
      if (error) throw error;
      product = data;
      console.log('Updated offer product by legacy_id:', product);
    } else {
      const { data, error } = await db
        .from('products')
        .insert(payload)
        .select('id, slug, price, name_en')
        .single();
      if (error) throw error;
      product = data;
      console.log('Created offer product:', product);
    }
  }

  bustCatalog();
  console.log('✓ Offer product ready — /offer/motion-sensor-light');
}

main().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});
