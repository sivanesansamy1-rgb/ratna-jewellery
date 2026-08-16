/* ==========================================================
   checkout.js — 4-step checkout: contact -> address -> review
   -> payment. Card/UPI/Net Banking/Wallet go through Razorpay
   Checkout.js; the backend verifies the payment signature
   before the order is ever marked paid (see orderController).
   COD orders skip payment collection entirely.
   ========================================================== */

const checkoutState = { step: 1, contactInfo: {}, shippingAddress: {}, paymentMethod: 'Card' };

function goToStep(step) {
  checkoutState.step = step;
  document.querySelectorAll('.checkout-step').forEach((el, i) => {
    el.classList.toggle('active', i + 1 === step);
    el.classList.toggle('done', i + 1 < step);
  });
  document.querySelectorAll('.checkout-panel').forEach((el) => {
    el.classList.toggle('active', Number(el.dataset.step) === step);
  });
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

async function loadOrderReview() {
  const el = document.getElementById('order-review-items');
  const { cart, totals } = await window.api.get('/cart');
  if (cart.items.length === 0) { location.href = '/user/cart.html'; return; }

  el.innerHTML = cart.items.map((i) => `
    <div class="order-review-item">
      <span>${window.escapeHTML(i.name)} ${i.metalType ? `(${i.metalType}${i.size ? ', ' + i.size : ''})` : ''} &times; ${i.quantity}</span>
      <span>${window.formatINR(i.price * i.quantity)}</span>
    </div>`).join('');

  document.getElementById('checkout-subtotal').textContent = window.formatINR(totals.subtotal);
  document.getElementById('checkout-discount').textContent = `- ${window.formatINR(totals.discount)}`;
  document.getElementById('checkout-tax').textContent = window.formatINR(totals.tax);
  document.getElementById('checkout-shipping').textContent = totals.shippingFee === 0 ? 'Free' : window.formatINR(totals.shippingFee);
  document.getElementById('checkout-total').textContent = window.formatINR(totals.total);
  checkoutState.totals = totals;
}

async function loadSavedAddresses() {
  const box = document.getElementById('saved-addresses');
  if (!box) return;
  try {
    const { user } = await window.api.get('/auth/me');
    if (!user.addresses.length) { box.innerHTML = ''; return; }
    box.innerHTML = `<p class="muted" style="margin-bottom:8px;">Or choose a saved address:</p>` + user.addresses.map((a) => `
      <label class="address-card" style="display:flex;gap:10px;cursor:pointer;">
        <input type="radio" name="savedAddress" value='${JSON.stringify(a).replace(/'/g, "&apos;")}' style="margin-top:4px;"/>
        <span>${a.fullName}, ${a.line1}, ${a.city}, ${a.state} ${a.postalCode}${a.isDefault ? ' <span class="default-tag">DEFAULT</span>' : ''}</span>
      </label>`).join('');

    box.querySelectorAll('input[name="savedAddress"]').forEach((radio) => radio.addEventListener('change', () => {
      const addr = JSON.parse(radio.value.replace(/&apos;/g, "'"));
      const form = document.getElementById('address-form');
      form.line1.value = addr.line1;
      form.city.value = addr.city;
      form.state.value = addr.state;
      form.postalCode.value = addr.postalCode;
      form.country.value = addr.country;
      form.fullName.value = addr.fullName;
      form.phone.value = addr.phone;
      if (!form.email.value) form.email.value = user.email;
    }));
    
    // Pre-fill email initially if empty
    const form = document.getElementById('address-form');
    if (form && !form.email.value) {
      form.email.value = user.email;
    }
  } catch (_) { /* not fatal */ }
}

async function loadRazorpayScript() {
  if (window.Razorpay) return true;
  return new Promise((resolve) => {
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

async function placeOrderFlow() {
  const placeBtn = document.getElementById('place-order-btn');
  placeBtn.disabled = true;
  placeBtn.textContent = 'Processing…';

  try {
    if (checkoutState.paymentMethod === 'COD') {
      const { order } = await window.api.post('/orders', {
        contactInfo: checkoutState.contactInfo,
        shippingAddress: checkoutState.shippingAddress,
        paymentMethod: 'COD',
      });
      window.dispatchEvent(new Event('ratna:cart-changed'));
      location.href = `/user/order-confirmation/?orderId=${order.orderId}`;
      return;
    }

    // Online payment: create a Razorpay order for the server-computed total,
    // collect payment, then let the backend verify the signature.
    const loaded = await loadRazorpayScript();
    if (!loaded) throw new Error('Could not load the payment gateway. Please check your connection.');

    const { razorpayOrder, keyId } = await window.api.post('/orders/razorpay-order', {});

    const rzp = new Razorpay({
      key: keyId,
      amount: razorpayOrder.amount,
      currency: razorpayOrder.currency,
      order_id: razorpayOrder.id,
      name: 'RATNA Fine Jewellery',
      description: 'Order Payment',
      prefill: { name: checkoutState.contactInfo.name, email: checkoutState.contactInfo.email, contact: checkoutState.contactInfo.phone },
      theme: { color: '#1F3D2E' },
      handler: async (response) => {
        try {
          const { order } = await window.api.post('/orders', {
            contactInfo: checkoutState.contactInfo,
            shippingAddress: checkoutState.shippingAddress,
            paymentMethod: checkoutState.paymentMethod,
            paymentInfo: response,
          });
          window.dispatchEvent(new Event('ratna:cart-changed'));
          location.href = `/user/order-confirmation/?orderId=${order.orderId}`;
        } catch (err) {
          window.showToast(err.message, 'error');
          placeBtn.disabled = false;
          placeBtn.textContent = 'Place Order';
        }
      },
      modal: {
        ondismiss: () => {
          placeBtn.disabled = false;
          placeBtn.textContent = 'Place Order';
        },
      },
    });
    rzp.open();
  } catch (err) {
    window.showToast(err.message, 'error');
    placeBtn.disabled = false;
    placeBtn.textContent = 'Place Order';
  }
}

function initCheckoutPage() {
  if (!window.requireLogin()) return;
  loadOrderReview();
  loadSavedAddresses();

  document.getElementById('address-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const fd = Object.fromEntries(new FormData(e.target).entries());
    
    // Validate phone number is exactly 10 digits
    if (!/^\d{10}$/.test(fd.phone)) {
      window.showToast('Please enter a valid 10-digit phone number.', 'error');
      return;
    }

    checkoutState.shippingAddress = fd;
    checkoutState.contactInfo = { name: fd.fullName, phone: fd.phone, email: fd.email };
    goToStep(2);
  });

  document.querySelectorAll('.payment-option').forEach((opt) => opt.addEventListener('click', () => {
    document.querySelectorAll('.payment-option').forEach((o) => o.classList.remove('active'));
    opt.classList.add('active');
    checkoutState.paymentMethod = opt.dataset.method;
  }));

  document.querySelectorAll('[data-back-step]').forEach((btn) => btn.addEventListener('click', () => goToStep(Number(btn.dataset.backStep))));
  document.getElementById('to-payment-btn').addEventListener('click', () => goToStep(3));
  document.getElementById('place-order-btn').addEventListener('click', placeOrderFlow);
}

document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('checkout-root')) initCheckoutPage();

  if (document.getElementById('confirmation-root')) {
    const orderId = new URLSearchParams(location.search).get('orderId');
    document.getElementById('confirmed-order-id').textContent = orderId || '';
  }
});
