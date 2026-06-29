#!/usr/bin/env node
/**
 * Import products from a directory of subfolders (each subfolder = one product).
 *
 * Usage:
 *   node scripts/import-folder-products.js \
 *     --source "/path/to/Motivational posters" \
 *     --category office-motivational-art
 *
 * Options:
 *   --dry-run   List products only, no upload/DB
 *   --limit N   Import at most N folders
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const { supabase } = require('../lib/supabase');
const { createProduct } = require('../lib/adminApiBridge');
const { processProductUpload } = require('../lib/optimizeImage');
const { buildStandardSizesFromBase } = require('../lib/productSizes');
const { slugifyProduct } = require('../lib/productSlugUtils');
const { bustCatalog } = require('../lib/catalogCache');

const IMAGE_EXT = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif']);

const CATEGORY_META = {
  'office-motivational-art': { icon: '💼', label: 'Office Motivational Art' },
  'islamic-wall-art': { icon: '🕌', label: 'Islamic Wall Art' },
  'family-photo-canvas': { icon: '👨‍👩‍👧', label: 'Family Photo Canvas' },
  'kids-room-art': { icon: '🧸', label: 'Kids Room Art' },
};

function parseArgs(argv) {
  const args = { dryRun: false, limit: 0 };
  for (let i = 2; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === '--dry-run') args.dryRun = true;
    else if (a === '--limit') args.limit = Number(argv[++i]) || 0;
    else if (a === '--source') args.source = argv[++i];
    else if (a === '--category') args.category = argv[++i];
  }
  return args;
}

function cleanProductName(folderName) {
  const raw = String(folderName || '').replace(/\s+/g, ' ').trim();
  let name = raw
    .replace(/^Chaka Chaundh\s*(Acrylic|Wood|Engineered Wood|Synthetic Wooden)?\s*[-–,]?\s*/i, '')
    .replace(/^(Craft Qila|FATMUG|Giant Innovative|PAINTINGMANTRA|PAPER PLANE DESIGN|PRINTNET|SWASUM|TIED RIBBONS|VantageKart)\s*/i, '')
    .replace(/\s*[-–(]\s*Motivational Quotes?.*$/i, '')
    .replace(/\s*[-–]\s*\([^)]*$/i, '')
    .trim();

  if (!name || name.length < 10 || /^[\d\s.A-Za-z-]+$/.test(name) && name.length < 15) {
    name = raw;
  }
  if (name.length > 120) name = `${name.slice(0, 117)}...`;
  return name;
}

function derivePricing(folderName) {
  const text = folderName.toLowerCase();
  if (/set of 4|combo set of 4|pack of 4|\(4 unit|4 black frame/i.test(folderName)) {
    return { price: 2499, original: 3299, stock: 40 };
  }
  if (/pack of 6|pack of 06|pack of 6/i.test(folderName)) {
    return { price: 699, original: 999, stock: 80 };
  }
  if (/pack of 3/i.test(folderName)) {
    return { price: 499, original: 699, stock: 60 };
  }
  if (/self adhesive|paper poster|a4|12\s*x\s*18|12x18|45\s*cm\s*x\s*30/i.test(text)) {
    return { price: 299, original: 449, stock: 100 };
  }
  if (/11\s*x\s*11|9\s*x\s*9|23\s*cm/i.test(text)) {
    return { price: 799, original: 1099, stock: 50 };
  }
  return { price: 999, original: 1299, stock: 50 };
}

function listImages(dir) {
  return fs
    .readdirSync(dir)
    .filter((f) => IMAGE_EXT.has(path.extname(f).toLowerCase()))
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
    .map((f) => path.join(dir, f));
}

async function uploadImage(sourcePath) {
  const ext = path.extname(sourcePath).toLowerCase() || '.jpg';
  const uploadsDir = path.join(process.cwd(), 'public', 'uploads', 'products');
  fs.mkdirSync(uploadsDir, { recursive: true });
  const tempName = `${uuidv4()}${ext}`;
  const tempPath = path.join(uploadsDir, tempName);
  fs.copyFileSync(sourcePath, tempPath);
  const result = await processProductUpload(tempPath);
  return result.url;
}

async function productExists(categoryId, nameEn, slugBase) {
  const slug = slugifyProduct(slugBase);
  const { data: bySlug } = await supabase
    .from('products')
    .select('id')
    .eq('slug', slug)
    .maybeSingle();
  if (bySlug) return true;

  const { data: byName } = await supabase
    .from('products')
    .select('id')
    .eq('category_id', categoryId)
    .eq('name_en', nameEn)
    .maybeSingle();
  return !!byName;
}

async function importFolder(folderPath, categoryId, meta, dryRun) {
  const folderName = path.basename(folderPath);
  const images = listImages(folderPath);
  if (!images.length) {
    return { folderName, status: 'skipped', reason: 'no images' };
  }

  const nameEn = cleanProductName(folderName);
  const pricing = derivePricing(folderName);
  const exists = await productExists(categoryId, nameEn, nameEn);
  if (exists) {
    return { folderName, status: 'skipped', reason: 'already exists', nameEn };
  }

  if (dryRun) {
    return {
      folderName,
      status: 'dry-run',
      nameEn,
      images: images.length,
      pricing,
    };
  }

  const imageUrls = [];
  for (const img of images) {
    imageUrls.push(await uploadImage(img));
  }

  const sizes = buildStandardSizesFromBase(pricing.price, pricing.original, pricing.stock);
  const description = `${nameEn}. Motivational wall art for office, study room and home. Imported from supplier catalog.`;

  await createProduct({
    name_en: nameEn,
    name_bn: null,
    description,
    category_id: categoryId,
    icon: meta.icon,
    images: imageUrls,
    image_url: imageUrls[0],
    sizes,
    price: pricing.price,
    original_price: pricing.original,
    stock: pricing.stock,
    badge: 'new',
    is_featured: true,
    is_flash_sale: false,
  });

  return { folderName, status: 'imported', nameEn, images: imageUrls.length, pricing };
}

async function main() {
  const args = parseArgs(process.argv);
  if (!args.source || !fs.existsSync(args.source)) {
    console.error('Missing or invalid --source path');
    process.exit(1);
  }
  if (!args.category) {
    console.error('Missing --category slug');
    process.exit(1);
  }
  if (!supabase) {
    console.error('Supabase not configured');
    process.exit(1);
  }

  const meta = CATEGORY_META[args.category] || { icon: '🖼️', label: args.category };

  const { data: category, error: catErr } = await supabase
    .from('categories')
    .select('id, slug, name_en')
    .eq('slug', args.category)
    .single();
  if (catErr || !category) {
    console.error('Category not found:', args.category, catErr?.message);
    process.exit(1);
  }

  const entries = fs
    .readdirSync(args.source, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => path.join(args.source, d.name))
    .sort((a, b) => path.basename(a).localeCompare(path.basename(b)));

  const folders = args.limit > 0 ? entries.slice(0, args.limit) : entries;

  console.log(`Importing ${folders.length} products → ${category.name_en} (${category.slug})`);
  if (args.dryRun) console.log('(dry run — no changes)\n');

  const results = [];
  for (const folder of folders) {
    try {
      const result = await importFolder(folder, category.id, meta, args.dryRun);
      results.push(result);
      console.log(
        `${result.status === 'imported' ? '✓' : result.status === 'dry-run' ? '○' : '–'} ${result.nameEn || result.folderName}${
          result.reason ? ` (${result.reason})` : ''
        }`
      );
    } catch (err) {
      results.push({ folderName: path.basename(folder), status: 'error', error: err.message });
      console.error(`✗ ${path.basename(folder)}: ${err.message}`);
    }
  }

  if (!args.dryRun) bustCatalog();

  const imported = results.filter((r) => r.status === 'imported').length;
  const skipped = results.filter((r) => r.status === 'skipped').length;
  const errors = results.filter((r) => r.status === 'error').length;
  console.log(`\nDone: ${imported} imported, ${skipped} skipped, ${errors} errors`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
