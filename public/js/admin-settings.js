(function () {
const HERO_LIMIT = 4;

async function uploadHeroImage(file) {
  const fd = new FormData();
  fd.append('image', file);
  const res = await fetch('/api/admin/upload/category-hero', { method: 'POST', body: fd });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(
      typeof adminUploadError === 'function'
        ? adminUploadError(data, 'আপলোড ব্যর্থ')
        : data.error || data.message || 'আপলোড ব্যর্থ'
    );
  }
  return data;
}

async function saveHeroImage(categoryId, heroImageUrl) {
  await adminApi(`/categories/${categoryId}`, {
    method: 'PUT',
    body: JSON.stringify({ hero_image_url: heroImageUrl }),
  });
}

function renderHeroSlots(categories) {
  const el = document.getElementById('heroSlots');
  if (!el) return;
  const heroes = [...categories]
    .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
    .slice(0, HERO_LIMIT);

  if (!heroes.length) {
    el.innerHTML =
      '<p class="hero-slot-empty">কোনো ক্যাটাগরি নেই। <a href="/admin/categories">ক্যাটাগরি যোগ করুন</a></p>';
    return;
  }

  el.innerHTML = heroes
    .map(
      (c, i) => `
    <div class="hero-slot-card" data-id="${c.id}">
      <img src="${c.hero_image_url || ''}" alt="" id="heroImg-${c.id}">
      <h4>${c.icon || '🖼️'} ${c.name_bn || c.name_en}</h4>
      <div class="hero-slot-meta">স্লট ${i + 1} · <code>${c.slug}</code></div>
      <input type="file" accept="image/*" data-upload="${c.id}">
      <p class="hero-slot-meta" data-status="${c.id}" style="min-height:18px;"></p>
    </div>`
    )
    .join('');

  el.querySelectorAll('[data-upload]').forEach((input) => {
    input.addEventListener('change', async () => {
      const id = input.dataset.upload;
      const file = input.files[0];
      if (!file) return;
      const img = document.getElementById(`heroImg-${id}`);
      const status = el.querySelector(`[data-status="${id}"]`);
      try {
        if (status) status.textContent = 'আপলোড হচ্ছে...';
        const data = await uploadHeroImage(file);
        img.src = data.url;
        if (status) status.textContent = 'সেভ হচ্ছে...';
        await saveHeroImage(id, data.url);
        if (status) {
          status.textContent =
            data.optimized && data.savedPercent > 0
              ? `✓ সেভ · ${data.sizeBefore} → ${data.sizeAfter}`
              : '✓ সেভ হয়েছে';
        }
        input.value = '';
      } catch (err) {
        alert(err.message);
        if (status) status.textContent = '';
      }
    });
  });
}

async function init() {
  if (!document.getElementById('heroSlots')) return;
  const { categories } = await adminApi('/categories');
  renderHeroSlots(categories || []);
}

bootAdminPage('settings', () =>
  init().catch((err) => {
    console.error(err);
    alert(err.message || 'সেটিংস লোড হয়নি');
  })
);
})();
