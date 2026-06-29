function normalizeUploadUrl(url) {
  if (typeof url !== 'string') return null;
  const trimmed = url.trim();
  if (!trimmed) return null;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  if (trimmed.startsWith('//')) return `https:${trimmed}`;
  if (trimmed.startsWith('/')) return trimmed;
  if (trimmed.startsWith('uploads/')) return `/${trimmed}`;
  return trimmed;
}

/** Skip local paths when the file is missing on disk (avoids broken <img> tags). */
function resolveLocalImageUrl(url) {
  const normalized = normalizeUploadUrl(url);
  if (!normalized || /^https?:\/\//i.test(normalized)) return normalized;
  try {
    const fs = require('fs');
    const path = require('path');
    const rel = normalized.replace(/^\//, '');
    const roots = [
      path.join(__dirname, '..'),
      process.cwd(),
    ];
    for (const root of roots) {
      const fp = path.join(root, 'public', rel);
      if (fs.existsSync(fp)) return normalized;
    }
    return null;
  } catch {
    /* non-Node / edge */
  }
  return normalized;
}

function normalizeProductImages(rawImages, imageUrl) {
  let images = [];
  if (Array.isArray(rawImages)) {
    images = rawImages
      .map((u) => resolveLocalImageUrl(u))
      .filter(Boolean);
  } else if (typeof rawImages === 'string' && rawImages.trim()) {
    try {
      const parsed = JSON.parse(rawImages);
      if (Array.isArray(parsed)) {
        images = parsed.map((u) => resolveLocalImageUrl(u)).filter(Boolean);
      } else {
        const one = resolveLocalImageUrl(rawImages);
        if (one) images = [one];
      }
    } catch (_) {
      const one = resolveLocalImageUrl(rawImages);
      if (one) images = [one];
    }
  }
  if (!images.length) {
    const fallback = resolveLocalImageUrl(imageUrl);
    if (fallback) images = [fallback];
  }
  return images;
}

function primaryImageUrl(images, fallback = null) {
  if (Array.isArray(images) && images.length) return images[0];
  const resolved = resolveLocalImageUrl(fallback);
  if (resolved) return resolved;
  return null;
}

function resolveProductImagesForDb(body = {}) {
  const images = normalizeProductImages(body.images, body.image_url);
  return {
    images,
    image_url: primaryImageUrl(images, body.image_url || null),
  };
}

module.exports = {
  normalizeUploadUrl,
  resolveLocalImageUrl,
  normalizeProductImages,
  primaryImageUrl,
  resolveProductImagesForDb,
};
