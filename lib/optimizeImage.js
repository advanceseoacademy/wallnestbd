const fs = require('fs');
const path = require('path');

let sharp;
try {
  sharp = require('sharp');
} catch {
  sharp = null;
}

const PRESETS = {
  product: { maxWidth: 2000, maxHeight: 2000, quality: 86 },
  category: { maxWidth: 2400, maxHeight: 1600, quality: 86 },
};

function publicImageUrl(subdir, filename) {
  return `/uploads/${subdir}/${filename}`;
}

function formatBytes(bytes) {
  const n = Number(bytes) || 0;
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Resize + WebP compress uploaded images (keeps visual quality, cuts file size).
 */
async function optimizeUploadedImage(filePath, presetName = 'product') {
  if (!sharp) {
    throw new Error('Image optimizer (sharp) is not installed. Run: npm install sharp');
  }
  if (!filePath || !fs.existsSync(filePath)) {
    throw new Error('Uploaded image file not found');
  }

  const cfg = PRESETS[presetName] || PRESETS.product;
  const dir = path.dirname(filePath);
  const stem = path.basename(filePath, path.extname(filePath));
  const outPath = path.join(dir, `${stem}.webp`);

  const bytesBefore = fs.statSync(filePath).size;

  await sharp(filePath)
    .rotate()
    .resize(cfg.maxWidth, cfg.maxHeight, {
      fit: 'inside',
      withoutEnlargement: true,
    })
    .webp({
      quality: cfg.quality,
      effort: 4,
      smartSubsample: true,
    })
    .toFile(outPath);

  if (path.resolve(outPath) !== path.resolve(filePath)) {
    fs.unlinkSync(filePath);
  }

  const meta = await sharp(outPath).metadata();
  const bytesAfter = fs.statSync(outPath).size;

  return {
    path: outPath,
    filename: path.basename(outPath),
    width: meta.width || 0,
    height: meta.height || 0,
    bytesBefore,
    bytesAfter,
    savedPercent:
      bytesBefore > 0
        ? Math.max(0, Math.round((1 - bytesAfter / bytesBefore) * 100))
        : 0,
    format: 'webp',
  };
}

async function processProductUpload(filePath) {
  const result = await optimizeUploadedImage(filePath, 'product');
  return {
    url: publicImageUrl('products', result.filename),
    optimized: true,
    width: result.width,
    height: result.height,
    bytesBefore: result.bytesBefore,
    bytesAfter: result.bytesAfter,
    savedPercent: result.savedPercent,
    sizeBefore: formatBytes(result.bytesBefore),
    sizeAfter: formatBytes(result.bytesAfter),
  };
}

async function processCategoryUpload(filePath) {
  const result = await optimizeUploadedImage(filePath, 'category');
  return {
    url: publicImageUrl('categories', result.filename),
    optimized: true,
    width: result.width,
    height: result.height,
    bytesBefore: result.bytesBefore,
    bytesAfter: result.bytesAfter,
    savedPercent: result.savedPercent,
    sizeBefore: formatBytes(result.bytesBefore),
    sizeAfter: formatBytes(result.bytesAfter),
  };
}

module.exports = {
  PRESETS,
  optimizeUploadedImage,
  processProductUpload,
  processCategoryUpload,
  publicImageUrl,
  formatBytes,
};
