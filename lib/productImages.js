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

function normalizeProductImages(rawImages, imageUrl) {
  let images = [];
  if (Array.isArray(rawImages)) {
    images = rawImages
      .map(normalizeUploadUrl)
      .filter(Boolean);
  } else if (typeof rawImages === 'string' && rawImages.trim()) {
    try {
      const parsed = JSON.parse(rawImages);
      if (Array.isArray(parsed)) {
        images = parsed.map(normalizeUploadUrl).filter(Boolean);
      } else {
        const one = normalizeUploadUrl(rawImages);
        if (one) images = [one];
      }
    } catch (_) {
      const one = normalizeUploadUrl(rawImages);
      if (one) images = [one];
    }
  }
  if (!images.length) {
    const fallback = normalizeUploadUrl(imageUrl);
    if (fallback) images = [fallback];
  }
  return images;
}

function primaryImageUrl(images, fallback = null) {
  if (Array.isArray(images) && images.length) return images[0];
  if (typeof fallback === 'string' && fallback.trim()) return fallback.trim();
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
  normalizeProductImages,
  primaryImageUrl,
  resolveProductImagesForDb,
};
