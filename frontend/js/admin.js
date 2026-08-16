/* ==========================================================
   admin.js — everything for the admin dashboard: guarded
   login/session, product/category/order/user/coupon/review
   CRUD tables, and the analytics dashboard.

   Security note: this file only controls what the ADMIN UI
   shows. The actual authorisation is enforced by the backend
   (protect + requireAdmin middleware on every /api/admin/*
   route) — hiding buttons here is a UX nicety, not security.
   ========================================================== */

function adminUser() {
  const raw = localStorage.getItem('ratna_admin_user');
  return raw ? JSON.parse(raw) : null;
}
function isAdminLoggedIn() { return !!localStorage.getItem('ratna_admin_token'); }
function requireAdminLogin() {
  if (!isAdminLoggedIn()) { location.href = '/admin/login.html'; return false; }
  return true;
}
function adminLogout() {
  localStorage.removeItem('ratna_admin_token');
  localStorage.removeItem('ratna_admin_user');
  location.href = '/user/index.html';
}
const aGet = (p) => window.api.get(p, { isAdmin: true });
const aPost = (p, b) => window.api.post(p, b, { isAdmin: true });
const aPut = (p, b) => window.api.put(p, b, { isAdmin: true });
const aDel = (p) => window.api.del(p, { isAdmin: true });

function renderAdminChrome() {
  const nameEl = document.getElementById('admin-user-name');
  if (nameEl) {
    const u = adminUser();
    nameEl.textContent = u ? u.name : '';
  }
  document.querySelectorAll('[data-admin-logout]').forEach((b) => b.addEventListener('click', adminLogout));
  // Highlight active sidebar link
  const path = location.pathname;
  document.querySelectorAll('.admin-nav a').forEach((a) => {
    const href = a.getAttribute('href');
    if (href) {
      a.classList.toggle('active', path === href || path.startsWith(href.replace('.html', '')));
    }
  });
}

/* ---------------- Admin login ---------------- */
async function handleAdminLoginForm(form) {
  const errorBox = form.querySelector('.form-error-box');
  errorBox.classList.add('hidden');
  const fd = Object.fromEntries(new FormData(form).entries());
  try {
    const res = await window.api.post('/auth/admin-login', fd, { auth: false });
    localStorage.setItem('ratna_admin_token', res.token);
    localStorage.setItem('ratna_admin_user', JSON.stringify(res.user));
    location.href = '/admin/dashboard.html';
  } catch (err) {
    errorBox.textContent = err.message;
    errorBox.classList.remove('hidden');
  }
}

/* ---------------- Dashboard ---------------- */
async function loadAdminDashboard() {
  if (!requireAdminLogin()) return;
  try {
    const stats = await aGet('/admin/dashboard');
    document.getElementById('stat-revenue').textContent = window.formatINR(stats.totalRevenue);
    document.getElementById('stat-orders').textContent = stats.totalOrders;
    document.getElementById('stat-customers').textContent = stats.totalCustomers;
    document.getElementById('stat-products').textContent = stats.totalProducts;
    document.getElementById('stat-stock').textContent = stats.totalStock;
    document.getElementById('stat-pending-orders').textContent = stats.pendingOrders;
    document.getElementById('stat-pending-returns').textContent = stats.pendingReturns;

    const lowStockEl = document.getElementById('low-stock-list');
    lowStockEl.innerHTML = stats.lowStockProducts.length
      ? stats.lowStockProducts.map((p) => `<div class="order-review-item"><span>${window.escapeHTML(p.name)} (${p.sku})</span><span>${p.stock} left</span></div>`).join('')
      : '<p class="muted">Nothing is running low right now.</p>';

    const chart = document.getElementById('revenue-chart');
    const max = Math.max(...stats.revenueByMonth.map((m) => m.revenue), 1);
    chart.innerHTML = stats.revenueByMonth.map((m) => `<div class="chart-bar" style="height:${(m.revenue / max) * 100}%"><span class="tip">${window.formatINR(m.revenue)}</span></div>`).join('') || '<p class="muted">No revenue yet.</p>';
    document.getElementById('revenue-chart-labels').innerHTML = stats.revenueByMonth.map((m) => `<span>${m._id}</span>`).join('');

    const topEl = document.getElementById('top-products-list');
    topEl.innerHTML = stats.topProducts.length
      ? stats.topProducts.map((p) => `<div class="order-review-item"><span>${window.escapeHTML(p.name)}</span><span>${p.unitsSold} sold</span></div>`).join('')
      : '<p class="muted">No sales yet.</p>';
  } catch (err) { window.showToast(err.message, 'error'); }
}

/* ---------------- Categories (loaded for product form dropdown too) ---------------- */
async function loadCategoryOptions(selectEl, selectedId) {
  const { categories } = await aGet('/admin/categories');
  selectEl.innerHTML = categories.map((c) => `<option value="${c._id}" ${c._id === selectedId ? 'selected' : ''}>${window.escapeHTML(c.name)}</option>`).join('');
  return categories;
}

async function loadCategoriesTable() {
  const tbody = document.getElementById('categories-tbody');
  if (!tbody) return;
  const { categories } = await aGet('/admin/categories');
  tbody.innerHTML = categories.length ? categories.map((c) => `
    <tr>
      <td>${window.escapeHTML(c.name)}</td>
      <td>${c.slug}</td>
      <td><span class="pill ${c.isActive ? 'active' : 'inactive'}">${c.isActive ? 'Active' : 'Inactive'}</span></td>
      <td>
        <button class="a-btn small" data-edit-cat="${c._id}" data-name="${window.escapeHTML(c.name)}" data-desc="${window.escapeHTML(c.description || '')}" data-img="${c.image || ''}">Edit</button>
        <button class="a-btn small" data-toggle-cat="${c._id}" data-active="${c.isActive}">${c.isActive ? 'Deactivate' : 'Activate'}</button>
        <button class="a-btn small danger" data-del-cat="${c._id}">Delete</button>
      </td>
    </tr>`).join('') : '<tr class="empty-row"><td colspan="4">No categories yet.</td></tr>';

  tbody.querySelectorAll('[data-toggle-cat]').forEach((btn) => btn.addEventListener('click', async () => {
    await aPut(`/admin/categories/${btn.dataset.toggleCat}`, { isActive: btn.dataset.active !== 'true' });
    loadCategoriesTable();
  }));
  tbody.querySelectorAll('[data-del-cat]').forEach((btn) => btn.addEventListener('click', async () => {
    const confirmed = await window.showConfirmModal('Delete Category', 'Delete this category?');
    if (!confirmed) return;
    try { 
      await aDel(`/admin/categories/${btn.dataset.delCat}`); 
      loadCategoriesTable(); 
    } catch (err) { 
      window.showToast(err.message, 'error'); 
    }
  }));

  tbody.querySelectorAll('[data-edit-cat]').forEach((btn) => btn.addEventListener('click', () => {
    document.getElementById('edit-category-id').value = btn.dataset.editCat;
    document.getElementById('edit-category-name').value = btn.dataset.name;
    document.getElementById('edit-category-desc').value = btn.dataset.desc;
    document.getElementById('edit-category-image').value = btn.dataset.img;
    document.getElementById('category-modal').classList.remove('hidden');
  }));

  const editForm = document.getElementById('edit-category-form');
  if (editForm) {
    editForm.onsubmit = async (e) => {
      e.preventDefault();
      const fd = Object.fromEntries(new FormData(editForm).entries());
      try {
        await aPut(`/admin/categories/${fd.id}`, { name: fd.name, description: fd.description, image: fd.image });
        document.getElementById('category-modal').classList.add('hidden');
        loadCategoriesTable();
        window.showToast('Category updated.');
      } catch (err) { window.showToast(err.message, 'error'); }
    };
  }

  const form = document.getElementById('add-category-form');
  if (form) form.onsubmit = async (e) => {
    e.preventDefault();
    const fd = Object.fromEntries(new FormData(form).entries());
    try { await aPost('/admin/categories', fd); form.reset(); loadCategoriesTable(); window.showToast('Category added.'); }
    catch (err) { window.showToast(err.message, 'error'); }
  };
}

/* ---------------- Products ---------------- */
let variantRowCount = 0;
function addVariantRow(container, variant = {}) {
  const id = variantRowCount++;
  const row = document.createElement('div');
  row.className = 'variant-row';
  row.dataset.variantId = id;
  row.innerHTML = `
    <input placeholder="Metal type e.g. 18K Gold" value="${variant.metalType || ''}" data-v-metal/>
    <input placeholder="Size" value="${variant.size || ''}" data-v-size/>
    <input placeholder="Price" type="number" value="${variant.price || ''}" data-v-price/>
    <input placeholder="Stock" type="number" value="${variant.stock ?? ''}" data-v-stock/>
    <button type="button" class="a-btn small danger" data-remove-variant>&times;</button>`;
  row.querySelector('[data-remove-variant]').addEventListener('click', () => row.remove());
  container.appendChild(row);
}

function collectVariants(container) {
  return [...container.querySelectorAll('.variant-row')].map((row, i) => ({
    sku: `VAR-${Date.now()}-${i}`,
    metalType: row.querySelector('[data-v-metal]').value,
    size: row.querySelector('[data-v-size]').value,
    price: Number(row.querySelector('[data-v-price]').value || 0),
    stock: Number(row.querySelector('[data-v-stock]').value || 0),
  })).filter((v) => v.metalType);
}

function openProductModal(product = null) {
  const overlay = document.getElementById('product-modal');
  overlay.classList.remove('hidden');
  const form = document.getElementById('product-form');
  form.reset();
  document.getElementById('variant-rows').innerHTML = '';
  document.getElementById('product-modal-title').textContent = product ? 'Edit Product' : 'Add Product';
  form.dataset.editingId = product ? product._id : '';

  loadCategoryOptions(form.category, product?.category?._id || product?.category);

  if (product) {
    form.name.value = product.name;
    form.sku.value = product.sku;
    form.description.value = product.description;
    form.price.value = product.price;
    form.discountPrice.value = product.discountPrice || '';
    form.images.value = (product.images || []).join(', ');
    form.metalType.value = product.metalType || '';
    form.metalPurity.value = product.metalPurity || '';
    form.weight.value = product.weight || '';
    form.stoneType.value = product.stoneType || '';
    form.stoneWeight.value = product.stoneWeight || '';
    form.color.value = product.color || '';
    form.availableSizes.value = (product.availableSizes || []).join(', ');
    if (form.stock) form.stock.value = product.stock || 0;
    (product.variants || []).forEach((v) => addVariantRow(document.getElementById('variant-rows'), v));
  }
}
function closeProductModal() { document.getElementById('product-modal').classList.add('hidden'); }

async function loadProductsTable() {
  const tbody = document.getElementById('products-tbody');
  if (!tbody) return;
  const search = document.getElementById('product-search')?.value || '';
  const { items } = await aGet(`/admin/products${search ? `?search=${encodeURIComponent(search)}` : ''}`);

  tbody.innerHTML = items.length ? items.map((p) => `
    <tr>
      <td><img class="thumb" src="${p.images?.[0] || ''}" alt=""/></td>
      <td>${window.escapeHTML(p.name)}<br/><span class="muted" style="font-size:0.75rem;">${p.sku}</span></td>
      <td>${p.category?.name || '—'}</td>
      <td>${window.formatINR(p.discountPrice || p.price)}</td>
      <td>${p.stock}</td>
      <td><span class="pill ${p.status}">${p.status}</span></td>
      <td>
        <button class="a-btn small" data-edit-product="${p._id}">Edit</button>
        <button class="a-btn small" data-toggle-status="${p._id}" data-status="${p.status}">${p.status === 'active' ? 'Deactivate' : 'Activate'}</button>
        <button class="a-btn small danger" data-del-product="${p._id}">Delete</button>
      </td>
    </tr>`).join('') : '<tr class="empty-row"><td colspan="7">No products found.</td></tr>';

  window.__adminProductsCache = items;

  tbody.querySelectorAll('[data-edit-product]').forEach((btn) => btn.addEventListener('click', () => {
    const product = items.find((p) => p._id === btn.dataset.editProduct);
    openProductModal(product);
  }));
  tbody.querySelectorAll('[data-toggle-status]').forEach((btn) => btn.addEventListener('click', async () => {
    const newStatus = btn.dataset.status === 'active' ? 'inactive' : 'active';
    await aPut(`/admin/products/${btn.dataset.toggleStatus}/status`, { status: newStatus });
    loadProductsTable();
  }));
  tbody.querySelectorAll('[data-del-product]').forEach((btn) => btn.addEventListener('click', async () => {
    const confirmed = await window.showConfirmModal('Delete Product', 'Delete this product permanently?');
    if (!confirmed) return;
    try { 
      await aDel(`/admin/products/${btn.dataset.delProduct}`); 
      loadProductsTable(); 
      window.showToast('Product deleted.'); 
    } catch (err) { 
      window.showToast(err.message, 'error'); 
    }
  }));
}

function initProductsPage() {
  if (!requireAdminLogin()) return;
  loadProductsTable();
  document.getElementById('add-product-btn')?.addEventListener('click', () => openProductModal());
  document.getElementById('close-product-modal')?.addEventListener('click', closeProductModal);
  document.getElementById('add-variant-btn')?.addEventListener('click', () => addVariantRow(document.getElementById('variant-rows')));
  document.getElementById('product-search')?.addEventListener('input', debounce(loadProductsTable, 350));

  document.getElementById('product-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = e.target;
    const fd = Object.fromEntries(new FormData(form).entries());
    const payload = {
      ...fd,
      price: Number(fd.price),
      discountPrice: fd.discountPrice ? Number(fd.discountPrice) : null,
      weight: fd.weight ? Number(fd.weight) : undefined,
      stoneWeight: fd.stoneWeight ? Number(fd.stoneWeight) : undefined,
      images: fd.images.split(',').map((s) => s.trim()).filter(Boolean),
      availableSizes: fd.availableSizes.split(',').map((s) => s.trim()).filter(Boolean),
      variants: collectVariants(document.getElementById('variant-rows')),
    };
    const stockTotal = payload.variants.length ? payload.variants.reduce((s, v) => s + v.stock, 0) : Number(fd.stock || 0);
    payload.stock = stockTotal;

    try {
      const editingId = form.dataset.editingId;
      if (editingId) await aPut(`/admin/products/${editingId}`, payload);
      else await aPost('/admin/products', payload);
      closeProductModal();
      loadProductsTable();
      window.showToast('Product saved.');
    } catch (err) { window.showToast(err.message, 'error'); }
  });
}

function debounce(fn, ms) { let t; return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); }; }

/* ---------------- Orders ---------------- */
const STATUS_FLOW = ['Order Placed', 'Payment Confirmed', 'Processing', 'Packed', 'Shipped', 'Out for Delivery', 'Delivered', 'Return Requested', 'Approved', 'Rejected', 'Returned', 'Refunded', 'Cancelled'];

async function loadOrdersTable() {
  const tbody = document.getElementById('orders-tbody');
  if (!tbody) return;
  const status = document.getElementById('order-status-filter')?.value || '';
  const { items } = await aGet(`/admin/orders${status ? `?status=${encodeURIComponent(status)}` : ''}`);

  tbody.innerHTML = items.length ? items.map((o) => `
    <tr>
      <td>${o.orderId}</td>
      <td>${window.escapeHTML(o.user?.name || '—')}<br/><span class="muted" style="font-size:0.75rem;">${o.user?.email || ''}</span></td>
      <td>${o.items.length}</td>
      <td>${window.formatINR(o.total)}</td>
      <td><span class="pill ${o.paymentStatus === 'Paid' ? 'paid' : 'pending'}">${o.paymentStatus}</span></td>
      <td>
        <select data-order-status="${o._id}">
          ${STATUS_FLOW.map((s) => `<option value="${s}" ${s === o.orderStatus ? 'selected' : ''}>${s}</option>`).join('')}
        </select>
      </td>
      <td>${new Date(o.createdAt).toLocaleDateString()}</td>
    </tr>`).join('') : '<tr class="empty-row"><td colspan="7">No orders found.</td></tr>';

  tbody.querySelectorAll('[data-order-status]').forEach((sel) => sel.addEventListener('change', async () => {
    try { 
      const res = await aPut(`/admin/orders/${sel.dataset.orderStatus}/status`, { status: sel.value }); 
      window.showToast(`Order status updated. Notification sent to ${res.emailSentTo}`); 
      loadOrdersTable(); 
    }
    catch (err) { window.showToast(err.message, 'error'); }
  }));
}

/* ---------------- Users ---------------- */
async function loadUsersTable() {
  const tbody = document.getElementById('users-tbody');
  if (!tbody) return;
  const search = document.getElementById('user-search')?.value || '';
  const { items } = await aGet(`/admin/users${search ? `?search=${encodeURIComponent(search)}` : ''}`);

  tbody.innerHTML = items.length ? items.map((u) => `
    <tr>
      <td>${window.escapeHTML(u.name)}</td>
      <td>${u.email}</td>
      <td>${u.phone || '—'}</td>
      <td><span class="pill ${u.isBlocked ? 'blocked' : 'active'}">${u.isBlocked ? 'Blocked' : 'Active'}</span></td>
      <td>${new Date(u.createdAt).toLocaleDateString()}</td>
      <td><button class="a-btn small ${u.isBlocked ? '' : 'danger'}" data-toggle-block="${u._id}" data-blocked="${u.isBlocked}">${u.isBlocked ? 'Unblock' : 'Block'}</button></td>
    </tr>`).join('') : '<tr class="empty-row"><td colspan="6">No customers found.</td></tr>';

  tbody.querySelectorAll('[data-toggle-block]').forEach((btn) => btn.addEventListener('click', async () => {
    await aPut(`/admin/users/${btn.dataset.toggleBlock}/block`, { isBlocked: btn.dataset.blocked !== 'true' });
    loadUsersTable();
  }));
}

/* ---------------- Reviews ---------------- */
async function loadReviewsTable() {
  const tbody = document.getElementById('reviews-tbody');
  if (!tbody) return;
  const { reviews } = await aGet('/admin/reviews');
  tbody.innerHTML = reviews.length ? reviews.map((r) => `
    <tr>
      <td>${window.escapeHTML(r.product?.name || '—')}</td>
      <td>${window.escapeHTML(r.user?.name || '—')}</td>
      <td>${'&#9733;'.repeat(r.rating)}</td>
      <td style="max-width:280px;">${window.escapeHTML(r.comment)}</td>
      <td><span class="pill ${r.isApproved ? 'approved' : 'pending'}">${r.isApproved ? 'Approved' : 'Pending'}</span></td>
      <td>
        ${!r.isApproved ? `<button class="a-btn small gold" data-approve-review="${r._id}">Approve</button>` : `<button class="a-btn small" data-reject-review="${r._id}">Unapprove</button>`}
        <button class="a-btn small danger" data-del-review="${r._id}">Remove</button>
      </td>
    </tr>`).join('') : '<tr class="empty-row"><td colspan="6">No reviews yet.</td></tr>';

  tbody.querySelectorAll('[data-approve-review]').forEach((btn) => btn.addEventListener('click', async () => { await aPut(`/admin/reviews/${btn.dataset.approveReview}/moderate`, { isApproved: true }); loadReviewsTable(); }));
  tbody.querySelectorAll('[data-reject-review]').forEach((btn) => btn.addEventListener('click', async () => { await aPut(`/admin/reviews/${btn.dataset.rejectReview}/moderate`, { isApproved: false }); loadReviewsTable(); }));
  tbody.querySelectorAll('[data-del-review]').forEach((btn) => btn.addEventListener('click', async () => {
    const confirmed = await window.showConfirmModal('Remove Review', 'Remove this review?');
    if (!confirmed) return;
    try {
      await aDel(`/admin/reviews/${btn.dataset.delReview}`); 
      loadReviewsTable();
      window.showToast('Review removed.');
    } catch (err) {
      window.showToast(err.message, 'error');
    }
  }));
}

/* ---------------- Coupons ---------------- */
async function loadCouponsTable() {
  const tbody = document.getElementById('coupons-tbody');
  if (!tbody) return;
  const { coupons } = await aGet('/admin/coupons');
  tbody.innerHTML = coupons.length ? coupons.map((c) => `
    <tr>
      <td><strong>${c.code}</strong></td>
      <td>${c.discountType === 'percentage' ? c.discountValue + '%' : window.formatINR(c.discountValue)}</td>
      <td>${window.formatINR(c.minOrderValue)}</td>
      <td>${new Date(c.startDate).toLocaleDateString()} – ${new Date(c.expiryDate).toLocaleDateString()}</td>
      <td>${c.usedCount}${c.usageLimit ? ' / ' + c.usageLimit : ''}</td>
      <td><span class="pill ${c.isActive ? 'active' : 'inactive'}">${c.isActive ? 'Active' : 'Inactive'}</span></td>
      <td>
        <button class="a-btn small" data-toggle-coupon="${c._id}" data-active="${c.isActive}">${c.isActive ? 'Disable' : 'Enable'}</button>
        <button class="a-btn small danger" data-del-coupon="${c._id}">Delete</button>
      </td>
    </tr>`).join('') : '<tr class="empty-row"><td colspan="7">No coupons yet.</td></tr>';

  tbody.querySelectorAll('[data-toggle-coupon]').forEach((btn) => btn.addEventListener('click', async () => { await aPut(`/admin/coupons/${btn.dataset.toggleCoupon}`, { isActive: btn.dataset.active !== 'true' }); loadCouponsTable(); }));
  tbody.querySelectorAll('[data-del-coupon]').forEach((btn) => btn.addEventListener('click', async () => {
    const confirmed = await window.showConfirmModal('Delete Coupon', 'Delete this coupon?');
    if (!confirmed) return;
    try {
      await aDel(`/admin/coupons/${btn.dataset.delCoupon}`); 
      loadCouponsTable();
      window.showToast('Coupon deleted.');
    } catch (err) {
      window.showToast(err.message, 'error');
    }
  }));

  const form = document.getElementById('add-coupon-form');
  if (form) form.onsubmit = async (e) => {
    e.preventDefault();
    const fd = Object.fromEntries(new FormData(form).entries());
    fd.discountValue = Number(fd.discountValue);
    fd.minOrderValue = Number(fd.minOrderValue || 0);
    fd.maxDiscount = fd.maxDiscount ? Number(fd.maxDiscount) : null;
    fd.usageLimit = fd.usageLimit ? Number(fd.usageLimit) : null;
    try { await aPost('/admin/coupons', fd); form.reset(); loadCouponsTable(); window.showToast('Coupon created.'); }
    catch (err) { window.showToast(err.message, 'error'); }
  };
}

/* ---------------- Returns ---------------- */
async function loadReturnsTable() {
  const tbody = document.getElementById('returns-tbody');
  if (!tbody) return;
  const { returns } = await aGet('/admin/returns');
  const RETURN_FLOW = ['Requested', 'Approved', 'Rejected', 'Returned', 'Quality Check', 'Refunded'];

  tbody.innerHTML = returns.length ? returns.map((r) => `
    <tr>
      <td>${r.order?.orderId || '—'}</td>
      <td>${window.escapeHTML(r.user?.name || '—')}</td>
      <td style="max-width:220px;">${window.escapeHTML(r.reason)}</td>
      <td>${r.type}</td>
      <td>
        <select data-return-status="${r._id}">
          ${RETURN_FLOW.map((s) => `<option value="${s}" ${s === r.status ? 'selected' : ''}>${s}</option>`).join('')}
        </select>
      </td>
      <td>${new Date(r.createdAt).toLocaleDateString()}</td>
    </tr>`).join('') : '<tr class="empty-row"><td colspan="6">No return requests.</td></tr>';

  tbody.querySelectorAll('[data-return-status]').forEach((sel) => sel.addEventListener('change', async () => {
    await aPut(`/admin/returns/${sel.dataset.returnStatus}/status`, { status: sel.value });
    window.showToast('Return status updated.');
  }));
}

document.addEventListener('DOMContentLoaded', () => {
  renderAdminChrome();

  const loginForm = document.getElementById('admin-login-form');
  if (loginForm) loginForm.addEventListener('submit', (e) => { e.preventDefault(); handleAdminLoginForm(loginForm); });

  if (document.getElementById('stat-revenue')) loadAdminDashboard();
  if (document.getElementById('products-tbody')) initProductsPage();
  if (document.getElementById('categories-tbody')) { if (requireAdminLogin()) loadCategoriesTable(); }
  if (document.getElementById('orders-tbody')) {
    if (requireAdminLogin()) {
      loadOrdersTable();
      document.getElementById('order-status-filter')?.addEventListener('change', loadOrdersTable);
    }
  }
  if (document.getElementById('users-tbody')) {
    if (requireAdminLogin()) {
      loadUsersTable();
      document.getElementById('user-search')?.addEventListener('input', debounce(loadUsersTable, 350));
    }
  }
  if (document.getElementById('reviews-tbody')) { if (requireAdminLogin()) loadReviewsTable(); }
  if (document.getElementById('coupons-tbody')) { if (requireAdminLogin()) loadCouponsTable(); }
  if (document.getElementById('returns-tbody')) { if (requireAdminLogin()) loadReturnsTable(); }
});
