(function () {
let categories = [];
let productImages = [];
/** @type {Map<string, string>} uploaded url → original file name (for auto sort) */
let productImageFileNames = new Map();
let productSizes = [];
let descriptionEditor = null;

const DEFAULT_SIZE_ROWS = [
  { label: '6×8"', price: '', original: '', stock: 50 },
  { label: '8×10"', price: '', original: '', stock: 45 },
  { label: '10×12"', price: '', original: '', stock: 40 },
  { label: '12×16"', price: '', original: '', stock: 35 },
];

function getProductIdFromUrl() {
  return new URLSearchParams(window.location.search).get('id') || '';
}

function initDescriptionEditor() {
  const mount = document.getElementById('descriptionEditor');
  if (!mount || typeof window.Quill !== 'function') return;
  if (descriptionEditor) {
    if (document.body.contains(descriptionEditor.root)) return;
    descriptionEditor = null;
  }
  descriptionEditor = new window.Quill('#descriptionEditor', {
    theme: 'snow',
    placeholder: 'পণ্যের বিস্তারিত বিবরণ লিখুন…',
    modules: {
      toolbar: [
        [{ header: [1, 2, 3, false] }],
        ['bold', 'italic', 'underline'],
        ['link'],
        [{ list: 'ordered' }, { list: 'bullet' }],
        ['clean'],
      ],
    },
  });
  descriptionEditor.on('text-change', () => {
    const hidden = document.getElementById('description');
    if (hidden) hidden.value = getDescriptionHtml();
  });
}

function getDescriptionHtml() {
  if (descriptionEditor) {
    const html = descriptionEditor.root.innerHTML.trim();
    return html === '<p><br></p>' ? '' : html;
  }
  return document.getElementById('description')?.value?.trim() || '';
}

function setDescriptionHtml(html) {
  const value = html || '';
  const hidden = document.getElementById('description');
  if (hidden) hidden.value = value;
  if (descriptionEditor) {
    if (!value) {
      descriptionEditor.setText('');
      return;
    }
    descriptionEditor.root.innerHTML = value;
  }
}

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

function fileNameSortKey(filename) {
  if (!filename) return '';
  const base = String(filename).replace(/\.[^./\\]+$/, '').toLowerCase();
  const nums = base.match(/\d+/g);
  if (nums && nums.length) {
    return `${nums.map((n) => String(parseInt(n, 10)).padStart(8, '0')).join('|')}|${base}`;
  }
  return base;
}

function sortFilesByName(files) {
  return Array.from(files).sort((a, b) =>
    fileNameSortKey(a.name).localeCompare(fileNameSortKey(b.name), undefined, {
      numeric: true,
      sensitivity: 'base',
    })
  );
}

function sortProductImagesByFileName() {
  if (!productImageFileNames.size) return;
  productImages.sort((a, b) => {
    const ka = productImageFileNames.get(a);
    const kb = productImageFileNames.get(b);
    if (!ka && !kb) return 0;
    if (!ka) return 1;
    if (!kb) return -1;
    return fileNameSortKey(ka).localeCompare(fileNameSortKey(kb), undefined, {
      numeric: true,
      sensitivity: 'base',
    });
  });
}

function normalizeAdminImageUrls(urls) {
  if (!urls) return [];
  let list = urls;
  if (typeof list === 'string') {
    try {
      const parsed = JSON.parse(list);
      list = Array.isArray(parsed) ? parsed : [list];
    } catch (_) {
      list = [list];
    }
  }
  if (!Array.isArray(list)) return [];
  return list
    .filter((url) => typeof url === 'string' && url.trim())
    .map((url) => {
      const t = url.trim();
      if (t.startsWith('http://') || t.startsWith('https://') || t.startsWith('/')) return t;
      if (t.startsWith('uploads/')) return `/${t}`;
      return t;
    });
}

function setProductImages(urls) {
  productImageFileNames.clear();
  productImages = normalizeAdminImageUrls(urls);
  renderImagePreview();
}

function moveProductImage(from, to) {
  if (from === to || from < 0 || to < 0 || from >= productImages.length || to >= productImages.length) {
    return;
  }
  const [moved] = productImages.splice(from, 1);
  productImages.splice(to, 0, moved);
  renderImagePreview();
}

function bindImageDragDrop(preview) {
  let dragFrom = null;

  preview.querySelectorAll('.product-image-item').forEach((item) => {
    item.addEventListener('dragstart', (e) => {
      dragFrom = Number(item.dataset.index);
      item.classList.add('is-dragging');
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', String(dragFrom));
      if (e.dataTransfer.setDragImage) {
        e.dataTransfer.setDragImage(item.querySelector('img') || item, 50, 50);
      }
    });

    item.addEventListener('dragend', () => {
      item.classList.remove('is-dragging');
      preview.querySelectorAll('.product-image-item').forEach((el) => el.classList.remove('is-drag-over'));
      dragFrom = null;
    });

    item.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      preview.querySelectorAll('.product-image-item').forEach((el) => el.classList.remove('is-drag-over'));
      item.classList.add('is-drag-over');
    });

    item.addEventListener('dragleave', (e) => {
      if (!item.contains(e.relatedTarget)) item.classList.remove('is-drag-over');
    });

    item.addEventListener('drop', (e) => {
      e.preventDefault();
      item.classList.remove('is-drag-over');
      const from =
        dragFrom !== null && !Number.isNaN(dragFrom)
          ? dragFrom
          : Number(e.dataTransfer.getData('text/plain'));
      const to = Number(item.dataset.index);
      moveProductImage(from, to);
    });
  });
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
    <div class="product-image-item ${index === 0 ? 'is-cover' : ''}" data-index="${index}" draggable="true">
      ${index === 0 ? '<span class="product-image-cover-tag">মূল</span>' : ''}
      <img src="${url}" alt="">
      <div class="product-image-drag-handle" title="টেনে সরান">⋮⋮ সরান</div>
      <div class="product-image-actions">
        <button type="button" data-remove="${index}">মুছুন</button>
      </div>
    </div>`
    )
    .join('');

  preview.querySelectorAll('[data-remove]').forEach((btn) => {
    btn.onclick = () => {
      const index = Number(btn.dataset.remove);
      const url = productImages[index];
      productImages.splice(index, 1);
      if (url) productImageFileNames.delete(url);
      renderImagePreview();
    };
  });

  bindImageDragDrop(preview);
}

async function uploadProductImage(file) {
  const fd = new FormData();
  fd.append('image', file);
  const res = await fetch('/api/admin/upload', { method: 'POST', body: fd });
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

function fillProductForm(product) {
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
        ? [{ label: 'Standard', price: product.price, original: product.original, stock: product.stock }]
        : DEFAULT_SIZE_ROWS.map((row) => ({ ...row }));
  setProductSizes(sizes);
  syncHiddenPriceFields(
    sizes.map((s) => ({ price: s.price, original_price: s.original, stock: s.stock }))
  );
  document.getElementById('icon').value = product?.icon || '📦';
  setDescriptionHtml(product?.desc || '');
  document.getElementById('isFeatured').checked = product?.featured !== false;
  document.getElementById('isFlash').checked = !!product?.flash;
  const images =
    product?.images?.length ? product.images : product?.imageUrl ? [product.imageUrl] : [];
  setProductImages(images);
  const sel = document.getElementById('categoryId');
  sel.innerHTML = categories
    .map(
      (c) =>
        `<option value="${c.id}" ${product?.catId === c.id ? 'selected' : ''}>${c.name_bn || c.name_en}</option>`
    )
    .join('');
}

async function loadProductForEdit(productId) {
  const [productRes, catRes] = await Promise.all([
    adminApi(`/products/${productId}`),
    adminApi('/categories'),
  ]);
  categories = catRes.categories || [];
  const product = productRes.product;
  if (!product) {
    alert('পণ্য পাওয়া যায়নি');
    window.location.href = '/admin/products';
    return;
  }
  fillProductForm(product);
}

async function reloadFormDataOnly() {
  initDescriptionEditor();
  const path = window.location.pathname.replace(/\/$/, '');
  const isNew = path.endsWith('/products/new');
  const productId = document.getElementById('productId')?.value || getProductIdFromUrl();
  if (isNew) {
    const { categories: cats } = await adminApi('/categories');
    categories = cats || [];
    fillProductForm(null);
    return;
  }
  if (productId) await loadProductForEdit(productId);
}

async function initProductFormPage() {
  const form = document.getElementById('productForm');
  if (!form) return;

  if (form.dataset.wnBound === '1') {
    return reloadFormDataOnly();
  }
  form.dataset.wnBound = '1';

  initDescriptionEditor();

  document.getElementById('btnAddSize')?.addEventListener('click', () => {
    productSizes.push({ label: '', price: '', original: '', stock: 20 });
    renderProductSizes();
  });

  document.getElementById('imageFile')?.addEventListener('change', async (e) => {
    const files = sortFilesByName(e.target.files || []);
    if (!files.length) return;
    try {
      for (const file of files) {
        const data = await uploadProductImage(file);
        productImages.push(data.url);
        productImageFileNames.set(data.url, file.name);
      }
      sortProductImagesByFileName();
      renderImagePreview();
    } catch (err) {
      alert(err.message);
    } finally {
      e.target.value = '';
    }
  });

  document.getElementById('productForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('btnSaveProduct');
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
      original_price:
        document.getElementById('originalPrice').value || document.getElementById('price').value,
      stock: document.getElementById('stock').value,
      icon: document.getElementById('icon').value,
      images: productImages,
      image_url: productImages[0] || null,
      description: getDescriptionHtml(),
      is_featured: document.getElementById('isFeatured').checked,
      is_flash_sale: document.getElementById('isFlash').checked,
    };
    try {
      if (btn) {
        btn.disabled = true;
        btn.textContent = 'সেভ হচ্ছে…';
      }
      if (id) {
        await adminApi(`/products/${id}`, { method: 'PUT', body: JSON.stringify(body) });
      } else {
        await adminApi('/products', { method: 'POST', body: JSON.stringify(body) });
      }
      if (typeof clearAdminShellCache === 'function') clearAdminShellCache();
      window.location.href = '/admin/products';
    } catch (err) {
      alert(err.message || 'সেভ ব্যর্থ');
      if (btn) {
        btn.disabled = false;
        btn.textContent = 'সেভ করুন';
      }
    }
  });

  const path = window.location.pathname.replace(/\/$/, '');
  const isNew = path.endsWith('/products/new');
  const productId = document.getElementById('productId')?.value || getProductIdFromUrl();

  if (isNew) {
    const { categories: cats } = await adminApi('/categories');
    categories = cats || [];
    fillProductForm(null);
    return;
  }

  if (productId) {
    await loadProductForEdit(productId);
    return;
  }

  window.location.href = '/admin/products';
}

bootAdminPage('product-form', initProductFormPage);
})();
