/* ==========================================================
   account.js — My Account area: profile, addresses, order
   history, order detail + tracking, cancel, and return
   requests. All tabs live on account.html and swap panels.
   ========================================================== */

function statusToClass(status) {
  return status.toLowerCase().replace(/\s+/g, '-').replace('order-placed', 'placed').replace('payment-confirmed', 'confirmed').replace('out-for-delivery', 'out');
}

async function loadProfileTab() {
  const form = document.getElementById('profile-form');
  if (!form) return;
  const { user } = await window.api.get('/auth/me');
  form.name.value = user.name;
  form.email.value = user.email;
  form.phone.value = user.phone || '';

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
      await window.api.put('/auth/profile', { name: form.name.value, phone: form.phone.value });
      const stored = window.currentUser();
      stored.name = form.name.value;
      localStorage.setItem('ratna_user', JSON.stringify(stored));
      window.showToast('Profile updated.');
    } catch (err) { window.showToast(err.message, 'error'); }
  });

  const pwForm = document.getElementById('password-form');
  if (pwForm) pwForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = Object.fromEntries(new FormData(pwForm).entries());
    try {
      await window.api.put('/auth/password', fd);
      window.showToast('Password changed.');
      pwForm.reset();
    } catch (err) { window.showToast(err.message, 'error'); }
  });
}

async function loadAddressesTab() {
  const list = document.getElementById('address-list');
  if (!list) return;
  const { user } = await window.api.get('/auth/me');
  list.innerHTML = user.addresses.length
    ? user.addresses.map((a) => `
      <div class="address-card">
        ${a.isDefault ? '<span class="default-tag">DEFAULT</span><br/>' : ''}
        <strong>${window.escapeHTML(a.fullName)}</strong> &middot; ${a.phone}<br/>
        ${window.escapeHTML(a.line1)}, ${a.city}, ${a.state} ${a.postalCode}, ${a.country}
        <div style="margin-top:10px;"><button class="btn-ghost" data-del-address="${a._id}">Remove</button></div>
      </div>`).join('')
    : '<p class="muted">No saved addresses yet.</p>';

  list.querySelectorAll('[data-del-address]').forEach((btn) => btn.addEventListener('click', async () => {
    await window.api.del(`/auth/addresses/${btn.dataset.delAddress}`);
    loadAddressesTab();
  }));

  const form = document.getElementById('new-address-form');
  if (form) form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = Object.fromEntries(new FormData(form).entries());
    fd.isDefault = form.isDefault.checked;
    try {
      await window.api.post('/auth/addresses', fd);
      window.showToast('Address added.');
      form.reset();
      loadAddressesTab();
    } catch (err) { window.showToast(err.message, 'error'); }
  });
}

function orderRowHTML(o) {
  return `
  <div class="order-row">
    <img src="${o.items[0]?.image || ''}" alt=""/>
    <div>
      <strong>${o.orderId}</strong>
      <div class="muted" style="font-size:0.82rem;">${new Date(o.createdAt).toLocaleDateString()} &middot; ${o.items.length} item(s)</div>
    </div>
    <span class="status-pill ${statusToClass(o.orderStatus)}">${o.orderStatus === 'Cancelled' ? 'Order Cancelled' : o.orderStatus}</span>
    <div style="text-align:right;">
      <div class="price">${window.formatINR(o.total)}</div>
      <a href="/user/order-details/?id=${o._id}" class="btn-ghost" style="font-size:0.78rem;">View Details</a>
    </div>
  </div>`;
}

async function loadOrdersTab() {
  const list = document.getElementById('orders-list');
  if (!list) return;
  list.innerHTML = window.gemLoaderHTML;
  try {
    const { orders } = await window.api.get('/orders');
    list.innerHTML = orders.length ? orders.map(orderRowHTML).join('') : '<p class="muted">You haven\'t placed any orders yet.</p>';
  } catch (err) { list.innerHTML = `<p class="muted">${err.message}</p>`; }
}

const TRACK_STEPS = ['Order Placed', 'Payment Confirmed', 'Processing', 'Packed', 'Shipped', 'Out for Delivery', 'Delivered'];

async function loadOrderDetailsPage() {
  const root = document.getElementById('order-detail-root');
  if (!root) return;
  if (!window.requireLogin()) return;
  let id = new URLSearchParams(location.search).get('id');

  try {
    if (!id) {
      const { orders } = await window.api.get('/orders');
      if (orders && orders.length > 0) {
        id = orders[0]._id;
      } else {
        root.innerHTML = `<p class="muted" style="margin-top:20px;">You haven't placed any orders yet.</p>`;
        return;
      }
    }
    
    const { order } = await window.api.get(`/orders/${id}`);
    let currentIdx = TRACK_STEPS.indexOf(order.orderStatus);
    const returnStatuses = ['Return Requested', 'Approved', 'Rejected', 'Returned', 'Refunded'];
    if (returnStatuses.includes(order.orderStatus)) {
      currentIdx = TRACK_STEPS.indexOf('Delivered');
    }
    const cancelled = order.orderStatus === 'Cancelled';

    root.innerHTML = `
      <div class="card">
        <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;">
          <div><h2 style="margin-bottom:4px;">${order.orderId}</h2><p class="muted">Placed on ${new Date(order.createdAt).toLocaleString()}</p></div>
          <span class="status-pill ${statusToClass(order.orderStatus)}">${order.orderStatus === 'Cancelled' ? 'Order Cancelled' : order.orderStatus}</span>
        </div>

        ${!cancelled ? `
        <div class="tracking-line">
          ${TRACK_STEPS.map((s, i) => `
            <div class="tracking-step ${i <= currentIdx ? 'done' : ''}">
              <div class="tracking-dot"></div>${s}
            </div>`).join('')}
        </div>` : `<p class="form-msg error" style="margin-top:20px;">This order was cancelled${order.cancelReason ? ': ' + window.escapeHTML(order.cancelReason) : '.'}</p>`}

        <hr class="gold-rule" style="margin:24px 0;"/>
        ${order.items.map((i) => `
          <div class="order-review-item">
            <span>${window.escapeHTML(i.name)} ${i.metalType ? `(${i.metalType}${i.size ? ', ' + i.size : ''})` : ''} &times; ${i.quantity}</span>
            <span>${window.formatINR(i.price * i.quantity)}</span>
          </div>`).join('')}
        <div class="summary-row"><span>Subtotal</span><span>${window.formatINR(order.subtotal)}</span></div>
        <div class="summary-row"><span>Discount</span><span>- ${window.formatINR(order.discount)}</span></div>
        <div class="summary-row"><span>Tax</span><span>${window.formatINR(order.tax)}</span></div>
        <div class="summary-row"><span>Shipping</span><span>${order.shippingFee === 0 ? 'Free' : window.formatINR(order.shippingFee)}</span></div>
        <div class="summary-row total"><span>Total</span><span>${window.formatINR(order.total)}</span></div>

        <hr class="gold-rule" style="margin:24px 0;"/>
        <p><strong>Shipping to:</strong> ${order.contactInfo.name}, ${order.shippingAddress.line1}, ${order.shippingAddress.city}, ${order.shippingAddress.state} ${order.shippingAddress.postalCode}</p>
        <p><strong>Payment:</strong> ${order.paymentMethod} &middot; <span class="status-pill ${order.orderStatus === 'Cancelled' ? 'cancelled' : (order.paymentStatus === 'Paid' ? 'delivered' : (order.paymentStatus === 'Pending' ? 'processing' : 'cancelled'))}">${order.orderStatus === 'Cancelled' ? 'Order Cancelled' : order.paymentStatus}</span></p>

        <div style="display:flex;gap:12px;margin-top:20px;flex-wrap:wrap;">
          ${['Order Placed', 'Payment Confirmed', 'Processing'].includes(order.orderStatus) ? `<button class="btn btn-danger" id="cancel-order-btn">Cancel Order</button>` : ''}
          ${order.orderStatus === 'Delivered' ? `<button class="btn btn-outline" id="return-order-btn">Request Return / Refund</button>` : ''}
        </div>
      </div>`;

    const cancelBtn = document.getElementById('cancel-order-btn');
    if (cancelBtn) cancelBtn.addEventListener('click', async () => {
      const confirmed = await window.showConfirmModal('Cancel Order', 'Are you sure you want to cancel this order?');
      if (!confirmed) return;
      try { await window.api.put(`/orders/${order._id}/cancel`, { reason: 'Cancelled by customer' }); window.showToast('Order cancelled.'); loadOrderDetailsPage(); }
      catch (err) { window.showToast(err.message, 'error'); }
    });
    const returnBtn = document.getElementById('return-order-btn');
    if (returnBtn) returnBtn.addEventListener('click', async () => {
      const reason = await window.showPromptModal('Return Request', 'Please describe the reason for your return request:');
      if (!reason) return;
      try {
        await window.api.post('/returns', {
          orderId: order._id,
          items: order.items.map((i) => ({ product: i.product, name: i.name, quantity: i.quantity })),
          reason,
        });
        window.showToast('Return request submitted.');
        loadOrderDetailsPage();
      } catch (err) { window.showToast(err.message, 'error'); }
    });
  } catch (err) {
    root.innerHTML = `<p class="muted">${err.message}</p>`;
  }
}

function initAccountTabs() {
  const links = document.querySelectorAll('[data-tab-link]');
  if (!links.length) return;
  const activate = (tab) => {
    links.forEach((l) => l.classList.toggle('active', l.dataset.tabLink === tab));
    document.querySelectorAll('.account-tab-panel').forEach((p) => p.classList.toggle('active', p.id === `tab-${tab}`));
  };
  links.forEach((link) => link.addEventListener('click', (e) => {
    e.preventDefault();
    activate(link.dataset.tabLink);
  }));
  const requested = new URLSearchParams(location.search).get('tab');
  if (requested) activate(requested);
}

document.addEventListener('DOMContentLoaded', () => {
  if (!window.requireLogin) return;
  if (document.getElementById('profile-form') || document.getElementById('address-list') || document.getElementById('orders-list')) {
    if (!window.requireLogin()) return;
  }
  initAccountTabs();
  loadProfileTab();
  loadAddressesTab();
  loadOrdersTab();
  loadOrderDetailsPage();
});
