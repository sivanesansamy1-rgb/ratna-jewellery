/* ==========================================================
   cart.js — cart page rendering + the shared cart-count badge
   shown in the header on every page.
   ========================================================== */

async function refreshCartBadge() {
  const badge = document.getElementById('cart-count-badge');
  if (!badge) return;
  if (!window.isLoggedIn()) { badge.textContent = '0'; badge.classList.add('hidden'); return; }
  try {
    const { cart } = await window.api.get('/cart');
    const count = cart.items.reduce((s, i) => s + i.quantity, 0);
    badge.textContent = count;
    badge.classList.toggle('hidden', count === 0);
  } catch (_) { /* ignore */ }
}

function cartItemHTML(item) {
  return `
  <div class="cart-item" data-item-id="${item._id}">
    <img src="${item.image}" alt="${window.escapeHTML(item.name)}"/>
    <div>
      <h3 class="product-name" style="font-size:1.05rem;">${window.escapeHTML(item.name)}</h3>
      <div class="meta">${item.metalType || ''}${item.size ? ' &middot; Size ' + item.size : ''}</div>
      <div class="qty-selector">
        <button type="button" data-qty-minus="${item._id}">&minus;</button>
        <input type="text" value="${item.quantity}" readonly/>
        <button type="button" data-qty-plus="${item._id}">+</button>
      </div>
      <a href="#" class="remove-link" data-remove="${item._id}">Remove</a>
    </div>
    <div style="text-align:right;">
      <div class="price">${window.formatINR(item.price * item.quantity)}</div>
      <div class="muted" style="font-size:0.78rem;">${window.formatINR(item.price)} each</div>
    </div>
  </div>`;
}

function renderTotals(totals) {
  document.getElementById('sum-subtotal').textContent = window.formatINR(totals.subtotal);
  document.getElementById('sum-discount').textContent = `- ${window.formatINR(totals.discount)}`;
  document.getElementById('sum-tax').textContent = window.formatINR(totals.tax);
  document.getElementById('sum-shipping').textContent = totals.shippingFee === 0 ? 'Free' : window.formatINR(totals.shippingFee);
  document.getElementById('sum-total').textContent = window.formatINR(totals.total);
  document.getElementById('discount-row').classList.toggle('hidden', totals.discount === 0);
}

async function loadCartPage() {
  const listEl = document.getElementById('cart-items-list');
  const emptyEl = document.getElementById('cart-empty-state');
  const summaryEl = document.getElementById('cart-summary');
  if (!listEl) return;

  if (!window.requireLogin()) return;

  listEl.innerHTML = window.gemLoaderHTML;
  try {
    const { cart, totals } = await window.api.get('/cart');
    if (cart.items.length === 0) {
      listEl.innerHTML = '';
      emptyEl.classList.remove('hidden');
      summaryEl.classList.add('hidden');
      return;
    }
    emptyEl.classList.add('hidden');
    summaryEl.classList.remove('hidden');
    listEl.innerHTML = cart.items.map(cartItemHTML).join('');
    renderTotals(totals);
    if (cart.coupon?.code) {
      document.getElementById('coupon-applied').textContent = `Coupon "${cart.coupon.code}" applied.`;
      document.getElementById('coupon-applied').classList.remove('hidden');
    }
    bindCartItemEvents();
  } catch (err) {
    listEl.innerHTML = `<p class="muted">${err.message}</p>`;
  }
}

function bindCartItemEvents() {
  document.querySelectorAll('[data-qty-plus]').forEach((btn) => btn.addEventListener('click', () => changeQty(btn.dataset.qtyPlus, 1)));
  document.querySelectorAll('[data-qty-minus]').forEach((btn) => btn.addEventListener('click', () => changeQty(btn.dataset.qtyMinus, -1)));
  document.querySelectorAll('[data-remove]').forEach((btn) => btn.addEventListener('click', async (e) => {
    e.preventDefault();
    try {
      await window.api.del(`/cart/${btn.dataset.remove}`);
      window.dispatchEvent(new Event('ratna:cart-changed'));
      loadCartPage();
    } catch (err) { window.showToast(err.message, 'error'); }
  }));
}

async function changeQty(itemId, delta) {
  const row = document.querySelector(`[data-item-id="${itemId}"]`);
  const input = row.querySelector('.qty-selector input');
  const newQty = Number(input.value) + delta;
  try {
    await window.api.put(`/cart/${itemId}`, { quantity: newQty });
    window.dispatchEvent(new Event('ratna:cart-changed'));
    loadCartPage();
  } catch (err) { window.showToast(err.message, 'error'); }
}

function initCouponForm() {
  const form = document.getElementById('coupon-form');
  if (!form) return;
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const code = form.querySelector('input').value.trim();
    try {
      await window.api.post('/cart/coupon', { code });
      window.showToast('Coupon applied!');
      loadCartPage();
    } catch (err) { window.showToast(err.message, 'error'); }
  });
}

document.addEventListener('DOMContentLoaded', () => {
  refreshCartBadge();
  loadCartPage();
  initCouponForm();
});
window.addEventListener('ratna:cart-changed', refreshCartBadge);
