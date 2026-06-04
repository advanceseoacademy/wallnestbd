let categories = [];
let productsCache = [];

function closeProductModal() {
  document.getElementById('productModal').style.display = 'none';
}

async function openProductModal(product = null) {
  document.getElementById('productModal').style.display = 'flex';
  document.getElementById('modalTitle').textContent = product ? 'পণ্য এডিট' : 'নতুন পণ্য';
  document.getElementById('productId').value = product?.id || '';
  document.getElementById('nameEn').value = product?.name || '';
  document.getElementById('nameBn').value = product?.nameBn || '';
  document.getElementById('price').value = product?.price || '';
  document.getElementById('originalPrice').value = product?.original || '';
  document.getElementById('stock').value = product?.stock ?? 100;
  document.getElementById('icon').value = product?.icon || '📦';
  document.getElementById('imageUrl').value = product?.imageUrl || '';
  document.getElementById('description').value = product?.desc || '';
  document.getElementById('isFeatured').checked = product?.featured !== false;
  document.getElementById('isFlash').checked = !!product?.flash;
  document.getElementById('imagePreview').innerHTML = product?.imageUrl
    ? `<img src="${product.imageUrl}" style="max-height:80px;border-radius:8px;">`
    : '';

  const sel = document.getElementById('categoryId');
  sel.innerHTML = categories
    .map((c) => `<option value="${c.id}" ${product?.catId === c.id ? 'selected' : ''}>${c.name_bn || c.name_en}</option>`)
    .join('');
}

async function loadProducts() {
  const [{ products }, catRes] = await Promise.all([
    adminApi('/products'),
    adminApi('/categories'),
  ]);
  categories = catRes.categories || [];
  productsCache = products || [];
  const tbody = document.getElementById('productsBody');
  tbody.innerHTML = productsCache
    .map(
      (p) => `
    <tr>
      <td>${p.imageUrl ? `<img src="${p.imageUrl}" style="width:40px;height:40px;object-fit:cover;border-radius:8px;">` : p.icon}</td>
      <td><strong>${p.name}</strong><br><small>${p.nameBn || ''}</small></td>
      <td><span class="cat-pill">${p.cat || '—'}</span></td>
      <td>${formatBDT(p.price)}</td>
      <td>${p.stock}</td>
      <td>${p.featured ? '✅' : ''} ${p.flash ? '⚡' : ''}</td>
      <td>
        <button class="action-btn" data-edit="${p.id}">এডিট</button>
        <button class="action-btn" onclick="deleteProduct('${p.id}')">ডিলিট</button>
      </td>
    </tr>`
    )
    .join('');
  tbody.querySelectorAll('[data-edit]').forEach((btn) => {
    btn.onclick = () => {
      const p = productsCache.find((x) => x.id === btn.dataset.edit);
      openProductModal(p);
    };
  });
}

async function deleteProduct(id) {
  if (!confirm('পণ্য ডিলিট করবেন?')) return;
  await adminApi(`/products/${id}`, { method: 'DELETE' });
  loadProducts();
}

document.getElementById('btnAddProduct').onclick = () => openProductModal();

document.getElementById('imageFile').onchange = async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const fd = new FormData();
  fd.append('image', file);
  const res = await fetch('/admin/api/upload', { method: 'POST', body: fd });
  const data = await res.json();
  if (!res.ok) return alert(data.error);
  document.getElementById('imageUrl').value = data.url;
  document.getElementById('imagePreview').innerHTML = `<img src="${data.url}" style="max-height:80px;border-radius:8px;">`;
};

document.getElementById('productForm').onsubmit = async (e) => {
  e.preventDefault();
  const id = document.getElementById('productId').value;
  const body = {
    name_en: document.getElementById('nameEn').value,
    name_bn: document.getElementById('nameBn').value,
    category_id: document.getElementById('categoryId').value,
    price: document.getElementById('price').value,
    original_price: document.getElementById('originalPrice').value || document.getElementById('price').value,
    stock: document.getElementById('stock').value,
    icon: document.getElementById('icon').value,
    image_url: document.getElementById('imageUrl').value || null,
    description: document.getElementById('description').value,
    is_featured: document.getElementById('isFeatured').checked,
    is_flash_sale: document.getElementById('isFlash').checked,
  };
  if (id) {
    await adminApi(`/products/${id}`, { method: 'PUT', body: JSON.stringify(body) });
  } else {
    await adminApi('/products', { method: 'POST', body: JSON.stringify(body) });
  }
  closeProductModal();
  loadProducts();
};

loadProducts().catch(console.error);
