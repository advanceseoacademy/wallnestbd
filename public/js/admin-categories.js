(function () {
let categoriesCache = [];

function slugifyClient(name) {
  return String(name || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80);
}

const CATEGORY_MODAL_ID = 'categoryModal';

function closeCategoryModal() {
  closeAdminModal(CATEGORY_MODAL_ID);
}

function openCategoryModal(cat = null) {
  openAdminModal(CATEGORY_MODAL_ID);
  document.getElementById('categoryModalTitle').textContent = cat ? 'ক্যাটাগরি এডিট' : 'নতুন ক্যাটাগরি';
  document.getElementById('categoryId').value = cat?.id || '';
  document.getElementById('catNameEn').value = cat?.name_en || '';
  document.getElementById('catNameBn').value = cat?.name_bn || '';
  document.getElementById('catSlug').value = cat?.slug || '';
  document.getElementById('catIcon').value = cat?.icon || '🖼️';
  document.getElementById('catShare').value =
    cat?.catalog_share != null ? cat.catalog_share : '';
  document.getElementById('catSort').value = cat?.sort_order ?? 10;
  document.getElementById('catSlug').dataset.auto = cat ? '0' : '1';
}

async function loadCategories() {
  const { categories } = await adminApi('/categories');
  categoriesCache = categories || [];
  const tbody = document.getElementById('categoriesBody');
  if (!tbody) return;
  if (!categoriesCache.length) {
    tbody.innerHTML =
      '<tr><td colspan="6" style="text-align:center;padding:24px;color:var(--muted)">কোনো ক্যাটাগরি নেই — নতুন যোগ করুন</td></tr>';
    return;
  }
  const sorted = [...categoriesCache].sort(
    (a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)
  );
  tbody.innerHTML = sorted
    .map((c, i) => {
      const slotHint =
        i < 4
          ? `<br><small style="color:var(--primary)">হিরো স্লট ${i + 1}</small>`
          : '';
      return `
    <tr>
      <td style="font-size:22px">${c.icon || '🖼️'}</td>
      <td><strong>${c.name_bn || c.name_en}</strong><br><small>${c.name_en}</small>${slotHint}</td>
      <td><code style="font-size:12px">${c.slug}</code></td>
      <td>${c.catalog_share != null ? `${c.catalog_share}%` : '—'}</td>
      <td>${c.sort_order ?? 0}</td>
      <td>
        <button class="action-btn" data-edit-cat="${c.id}">এডিট</button>
        <button class="action-btn" data-del-cat="${c.id}">ডিলিট</button>
      </td>
    </tr>`;
    })
    .join('');

  tbody.querySelectorAll('[data-edit-cat]').forEach((btn) => {
    btn.onclick = () => {
      const c = categoriesCache.find((x) => x.id === btn.dataset.editCat);
      openCategoryModal(c);
    };
  });
  tbody.querySelectorAll('[data-del-cat]').forEach((btn) => {
    btn.onclick = () => deleteCategory(btn.dataset.delCat);
  });
}

async function deleteCategory(id) {
  if (!confirm('ক্যাটাগরি ডিলিট করবেন?')) return;
  try {
    await adminApi(`/categories/${id}`, { method: 'DELETE' });
    loadCategories();
  } catch (err) {
    alert(err.message);
  }
}

function initCategoriesPage() {
  if (!document.getElementById('categoriesBody')) return;

  const btnAdd = document.getElementById('btnAddCategory');
  if (btnAdd) btnAdd.onclick = () => openCategoryModal();

  const form = document.getElementById('categoryForm');
  if (form) {
    form.onsubmit = async (e) => {
      e.preventDefault();
      const id = document.getElementById('categoryId').value;
      const body = {
        name_en: document.getElementById('catNameEn').value,
        name_bn: document.getElementById('catNameBn').value,
        slug: document.getElementById('catSlug').value,
        icon: document.getElementById('catIcon').value,
        catalog_share: document.getElementById('catShare').value,
        sort_order: document.getElementById('catSort').value,
      };
      try {
        if (id) {
          await adminApi(`/categories/${id}`, {
            method: 'PUT',
            body: JSON.stringify(body),
          });
        } else {
          await adminApi('/categories', {
            method: 'POST',
            body: JSON.stringify(body),
          });
        }
        closeCategoryModal();
        loadCategories();
      } catch (err) {
        alert(err.message);
      }
    };
  }

  document.getElementById('catNameEn')?.addEventListener('input', (e) => {
    const slugEl = document.getElementById('catSlug');
    if (slugEl?.dataset.auto === '1') slugEl.value = slugifyClient(e.target.value);
  });

  document.getElementById('catSlug')?.addEventListener('input', () => {
    const slugEl = document.getElementById('catSlug');
    if (slugEl) slugEl.dataset.auto = '0';
  });

  bindAdminModal(CATEGORY_MODAL_ID, closeCategoryModal);
  window.closeCategoryModal = closeCategoryModal;

  return loadCategories().catch((err) => {
    console.error(err);
    alert(err.message || 'ক্যাটাগরি লোড হয়নি');
  });
}

bootAdminPage('categories', initCategoriesPage);
})();
