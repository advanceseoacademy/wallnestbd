let categories = [];
let productsCache = [];
let productImages = [];
let productSizes = [];

const PRODUCT_MODAL_ID = 'productModal';

const DEFAULT_SIZE_ROWS = [
  { label: '6×8"', price: '', original: '', stock: 50 },
  { label: '8×10"', price: '', original: '', stock: 45 },
  { label: '10×12"', price: '', original: '', stock: 40 },
  { label: '12×16"', price: '', original: '', stock: 35 },
];

function setProductSizes(rows) {
  productSizes = (rows || []).map((row) => ({
    label: row.label || row.label_bn || '',
    price: row.price ?? '',
    original: row.original ?? row.original_price ?? '',
    stock: row.stock ?? '',
  }));
  renderProductSizes();
}

function renderProductSizes() {
  const list = document.getElementById('productSizesList');
  const head = document.getElementById('productSizesHead');
  if (!list) return;
  if (!productSizes.length) {
    if (head) head.hidden = true;
    list.innerHTML = '<p style="font-size:12px;color:var(--muted2);margin:0;">কোনো সাইজ নেই — "+ সাইজ" চাপুন।</p>';
    return;
  }
  if (head) head.hidden = false;
  list.innerHTML = productSizes
    .map(
      (row, index) => `
    <div class="product-size-row-admin" data-size-index="${index}">
      <input class="form-input" type="text" placeholder='সাইজ (যেমন 6×8")' value="${row.label || ''}" data-field="label">
      <input class="form-input" type="number" placeholder="দাম" step="0.01" value="${row.price}" data-field="price">
      <input class="form-input" type="number" placeholder="আগের দাম" step="0.01" value="${row.original}" data-field="original">
      <input class="form-input" type="number" placeholder="স্টক" value="${row.stock}" data-field="stock">
      <button type="button" class="card-btn" data-remove-size="${index}">×</button>
    </div>`
    )
    .join('');

  list.querySelectorAll('[data-remove-size]').forEach((btn) => {
    btn.onclick = () => {
      productSizes.splice(Number(btn.dataset.removeSize), 1);
      renderProductSizes();
    };
  });
}

function collectProductSizesFromForm() {
  const list = document.getElementById('productSizesList');
  if (!list) return [];
  return Array.from(list.querySelectorAll('.product-size-row-admin'))
    .map((row) => {
      const get = (field) => row.querySelector(`[data-field="${field}"]`)?.value ?? '';
      const label = get('label').trim();
      return {
        label,
        label_bn: label,
        price: Number(get('price')),
        original_price: Number(get('original') || get('price')),
        stock: Number(get('stock') || 0),
      };
    })
    .filter((row) => row.label && row.price > 0);
}

function syncHiddenPriceFields(sizes) {
  const first = sizes[0];
  if (!first) return;
  document.getElementById('price').value = first.price;
  document.getElementById('originalPrice').value = first.original_price || first.price;
  document.getElementById('stock').value = sizes.reduce((sum, s) => sum + Number(s.stock || 0), 0);
}

function closeProductModal() {
  closeAdminModal(PRODUCT_MODAL_ID);
}

function setProductImages(urls) {
  productImages = (urls || []).filter((url) => typeof url === 'string' && url.trim());
  renderImagePreview();
}

function renderImagePreview() {
  const preview = document.getElementById('imagePreview');
  if (!preview) return;
  if (!productImages.length) {
    preview.innerHTML = '';
    return;
  }
  preview.innerHTML = productImages
    .map(
      (url, index) => `
    <div class="product-image-item ${index === 0 ? 'is-cover' : ''}" data-index="${index}">
      ${index === 0 ? '<span class="product-image-cover-tag">মূল</span>' : ''}
      <img src="${url}" alt="">
      <div class="product-image-actions">
        ${index > 0 ? `<button type="button" data-move="${index}" data-dir="-1">←</button>` : ''}
        ${index < productImages.length - 1 ? `<button type="button" data-move="${index}" data-dir="1">→</button>` : ''}
        <button type="button" data-remove="${index}">মুছুন</button>
      </div>
    </div>`
    )
    .join('');

  preview.querySelectorAll('[data-remove]').forEach((btn) => {
    btn.onclick = () => {
      const i = Number(btn.dataset.remove);
      productImages.splice(i, 1);
      renderImagePreview();
    };
  });

  preview.querySelectorAll('[data-move]').forEach((btn) => {
    btn.onclick = () => {
      const i = Number(btn.dataset.move);
      const dir = Number(btn.dataset.dir);
      const j = i + dir;
      if (j < 0 || j >= productImages.length) return;
      [productImages[i], productImages[j]] = [productImages[j], productImages[i]];
      renderImagePreview();
    };
  });
}

async function uploadProductImage(file) {
  const fd = new FormData();
  fd.append('image', file);
  const res = await fetch('/api/admin/upload', { method: 'POST', body: fd });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'আপলোড ব্যর্থ');
  if (data.optimized && data.savedPercent > 0) {
    console.info(
      `Image optimized: ${data.sizeBefore} → ${data.sizeAfter} (${data.savedPercent}% smaller)`
    );
  }
  return data;
}

async function openProductModal(product = null) {
  openAdminModal(PRODUCT_MODAL_ID);
  document.getElementById('modalTitle').textContent = product ? 'পণ্য এডিট' : 'নতুন পণ্য';
  document.getElementById('productId').value = product?.id || '';
  document.getElementById('nameEn').value = product?.name || '';
  document.getElementById('nameBn').value = product?.nameBn || '';
  const sizes =
    product?.sizes?.length
      ? product.sizes.map((s) => ({
          label: s.label || s.label_bn,
          price: s.price,
          original: s.original,
          stock: s.stock,
        }))
      : product
        ? [
            {
              label: 'Standard',
              price: product.price,
              original: product.original,
              stock: product.stock,
            },
          ]
        : DEFAULT_SIZE_ROWS.map((row) => ({ ...row }));
  setProductSizes(sizes);
  syncHiddenPriceFields(
    sizes.map((s) => ({
      price: s.price,
      original_price: s.original,
      stock: s.stock,
    }))
  );
  document.getElementById('icon').value = product?.icon || '📦';
  document.getElementById('description').value = product?.desc || '';
  document.getElementById('isFeatured').checked = product?.featured !== false;
  document.getElementById('isFlash').checked = !!product?.flash;

  const images =
    product?.images?.length
      ? product.images
      : product?.imageUrl
        ? [product.imageUrl]
        : [];
  setProductImages(images);

  const imageFile = document.getElementById('imageFile');
  if (imageFile) imageFile.value = '';

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
  if (!tbody) return;
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

function initProductsPage() {
  if (!document.getElementById('productsBody')) return;

  const btnAdd = document.getElementById('btnAddProduct');
  if (btnAdd) btnAdd.onclick = () => openProductModal();

  const btnAddSize = document.getElementById('btnAddSize');
  if (btnAddSize) {
    btnAddSize.onclick = () => {
      productSizes.push({ label: '', price: '', original: '', stock: 20 });
      renderProductSizes();
    };
  }

  const imageFile = document.getElementById('imageFile');
  if (imageFile) {
    imageFile.onchange = async (e) => {
      const files = Array.from(e.target.files || []);
      if (!files.length) return;
      try {
        const notes = [];
        for (const file of files) {
          const data = await uploadProductImage(file);
          productImages.push(data.url);
          if (data.optimized && data.savedPercent > 0) {
            notes.push(`${data.sizeBefore} → ${data.sizeAfter}`);
          }
        }
        renderImagePreview();
        if (notes.length) {
          alert(`ছবি অপটিমাইজ হয়েছে (ওয়েব-ফ্রেন্ডলি WebP):\n${notes.join('\n')}`);
        }
      } catch (err) {
        alert(err.message);
      } finally {
        e.target.value = '';
      }
    };
  }

  const form = document.getElementById('productForm');
  if (form) {
    form.onsubmit = async (e) => {
      e.preventDefault();
      const id = document.getElementById('productId').value;
      const sizes = collectProductSizesFromForm();
      if (!sizes.length) {
        alert('কমপক্ষে একটি সাইজ ও দাম দিন।');
        return;
      }
      syncHiddenPriceFields(sizes);
      const body = {
        name_en: document.getElementById('nameEn').value,
        name_bn: document.getElementById('nameBn').value,
        category_id: document.getElementById('categoryId').value,
        sizes,
        price: document.getElementById('price').value,
        original_price: document.getElementById('originalPrice').value || document.getElementById('price').value,
        stock: document.getElementById('stock').value,
        icon: document.getElementById('icon').value,
        images: productImages,
        image_url: productImages[0] || null,
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
  }

  bindAdminModal(PRODUCT_MODAL_ID, closeProductModal);
  window.closeProductModal = closeProductModal;
  window.deleteProduct = deleteProduct;

  return loadProducts();
}

runAdminPageInit(initProductsPage);
