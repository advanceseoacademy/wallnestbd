/** Duplicate carousel slides only when 2+ unique items (infinite scroll loop). */
function carouselTrackItems(items) {
  if (!items?.length) return [];
  if (items.length < 2) return items;
  return items.concat(items);
}

module.exports = { carouselTrackItems };
