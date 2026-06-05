function normalizeProductImages(rawImages, imageUrl) {
  let images = [];
  if (Array.isArray(rawImages)) {
    images = rawImages
      .filter((url) => typeof url === 'string' && url.trim())
      .map((url) => url.trim());
  } else if (typeof rawImages === 'string' && rawImages.trim()) {
    try {
      const parsed = JSON.parse(rawImages);
      if (Array.isArray(parsed)) {
        images = parsed
          .filter((url) => typeof url === 'string' && url.trim())
          .map((url) => url.trim());
      }
    } catch (_) {}
  }
  if (!images.length && typeof imageUrl === 'string' && imageUrl.trim()) {
    images = [imageUrl.trim()];
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
  normalizeProductImages,
  primaryImageUrl,
  resolveProductImagesForDb,
};
