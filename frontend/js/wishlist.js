/* ==========================================================
   wishlist.js — wishlist page: view, remove, move-to-cart.
   ========================================================== */

function wishlistItemHTML(p) {
  const price = p.discountPrice || p.price;
  return `
  <div class="product-card" data-id="${p._id}">
    <div class="product-thumb">
      <a href="/user/product/?id=${p._id}"><img src="${p.images?.[0]}" alt="${window.escapeHTML(p.name)}"/></a>
      <button class="wishlist-toggle active" data-remove-wishlist="${p._id}" title="Remove">&times;</button>
    </div>
    <div class="product-info">
      <h3 class="product-name"><a href="/user/product/?id=${p._id}">${window.escapeHTML(p.name)}</a></h3>
      <div class="price-row"><span class="price">${window.formatINR(price)}</span></div>
      <button class="btn btn-primary add-cart-btn" data-move-to-cart="${p._id}">Move to Cart</button>
    </div>
  </div>`;
}

async function loadWishlistPage() {
  const grid = document.getElementById('wishlist-grid');
  const emptyEl = document.getElementById('wishlist-empty-state');
  if (!grid) return;
  if (!window.requireLogin()) return;

  grid.innerHTML = window.gemLoaderHTML;
  try {
    const { wishlist } = await window.api.get('/wishlist');
    if (wishlist.products.length === 0) {
      grid.innerHTML = '';
      emptyEl.classList.remove('hidden');
      return;
    }
    emptyEl.classList.add('hidden');
    grid.innerHTML = wishlist.products.map(wishlistItemHTML).join('');

    grid.querySelectorAll('[data-remove-wishlist]').forEach((btn) => btn.addEventListener('click', async () => {
      await window.api.del(`/wishlist/${btn.dataset.removeWishlist}`);
      if (window.__wishlistIds) {
        window.__wishlistIds = window.__wishlistIds.filter(id => id !== btn.dataset.removeWishlist);
        if (typeof refreshWishlistBadge === 'function') refreshWishlistBadge();
      }
      loadWishlistPage();
    }));
    grid.querySelectorAll('[data-move-to-cart]').forEach((btn) => btn.addEventListener('click', async () => {
      try {
        await window.api.post('/cart', { productId: btn.dataset.moveToCart, quantity: 1 });
        await window.api.del(`/wishlist/${btn.dataset.moveToCart}`);
        if (window.__wishlistIds) {
          window.__wishlistIds = window.__wishlistIds.filter(id => id !== btn.dataset.moveToCart);
          if (typeof refreshWishlistBadge === 'function') refreshWishlistBadge();
        }
        window.dispatchEvent(new Event('ratna:cart-changed'));
        loadWishlistPage();
        window.showToast('Moved to cart.');
      } catch (err) { window.showToast(err.message, 'error'); }
    }));
  } catch (err) {
    grid.innerHTML = `<p class="muted">${err.message}</p>`;
  }
}

document.addEventListener('DOMContentLoaded', loadWishlistPage);
