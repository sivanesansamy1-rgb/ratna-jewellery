/* ==========================================================
   products.js — product card rendering, homepage sections,
   shop listing (search/filter/sort/pagination), and product
   detail page (gallery, variant selection, reviews).
   ========================================================== */

function productCardHTML(p) {
  const price = p.discountPrice || p.price;
  const hasDiscount = p.discountPrice && p.discountPrice < p.price;
  const tag = p.isNewArrival ? 'New Arrival' : p.isBestseller ? 'Bestseller' : p.isFeatured ? 'Featured' : '';
  const wishlisted = (window.__wishlistIds || []).includes(p._id);

  return `
  <div class="product-card" data-id="${p._id}">
    <div class="product-thumb">
      <a href="/user/product/?id=${p._id}">
        <img src="${p.images?.[0] || 'https://images.unsplash.com/photo-1599643477877-530eb83abc8e?w=600'}" alt="${window.escapeHTML(p.name)}" loading="lazy" />
      </a>
      ${tag ? `<span class="product-tag">${tag}</span>` : ''}
      <button class="wishlist-toggle ${wishlisted ? 'active' : ''}" data-wishlist-id="${p._id}" title="Add to wishlist">${wishlisted ? '&#9829;' : '&#9825;'}</button>
    </div>
    <div class="product-info">
      <div class="product-cat">${p.category?.name || ''}</div>
      <h3 class="product-name"><a href="/user/product/?id=${p._id}">${window.escapeHTML(p.name)}</a></h3>
      <div class="product-rating">${'&#9733;'.repeat(Math.round(p.rating || 0))}${'&#9734;'.repeat(5 - Math.round(p.rating || 0))} <span class="count">(${p.numReviews || 0})</span></div>
      <div class="price-row">
        <span class="price">${window.formatINR(price)}</span>
        ${hasDiscount ? `<span class="price strike">${window.formatINR(p.price)}</span>` : ''}
      </div>
      <button class="btn btn-primary add-cart-btn" data-quick-add="${p._id}">Add to Cart</button>
    </div>
  </div>`;
}

async function loadWishlistIds() {
  if (!window.isLoggedIn()) { window.__wishlistIds = []; refreshWishlistBadge(); return; }
  try {
    const { wishlist } = await window.api.get('/wishlist');
    window.__wishlistIds = wishlist.products.map((p) => p._id);
  } catch (_) { window.__wishlistIds = []; }
  refreshWishlistBadge();
}

function refreshWishlistBadge() {
  const badge = document.getElementById('wishlist-count-badge');
  if (!badge) return;
  if (!window.isLoggedIn() || !window.__wishlistIds || window.__wishlistIds.length === 0) {
    badge.textContent = '0';
    badge.classList.add('hidden');
  } else {
    badge.textContent = window.__wishlistIds.length;
    badge.classList.remove('hidden');
  }
}

function bindProductGridEvents(container) {
  container.querySelectorAll('[data-quick-add]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      if (!window.requireLogin()) return;
      try {
        await window.api.post('/cart', { productId: btn.dataset.quickAdd, quantity: 1 });
        window.showToast('Added to cart.');
        window.dispatchEvent(new Event('ratna:cart-changed'));
        let count = parseInt(btn.dataset.addedCount || '0', 10) + 1;
        btn.dataset.addedCount = count;
        btn.textContent = `${count} added to cart`;
      } catch (err) { window.showToast(err.message, 'error'); }
    });
  });
  container.querySelectorAll('[data-wishlist-id]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      if (!window.requireLogin()) return;
      const id = btn.dataset.wishlistId;
      try {
        if (btn.classList.contains('active')) {
          await window.api.del(`/wishlist/${id}`);
          btn.classList.remove('active');
          btn.innerHTML = '&#9825;';
          window.__wishlistIds = window.__wishlistIds.filter(wid => wid !== id);
        } else {
          await window.api.post('/wishlist', { productId: id });
          btn.classList.add('active');
          btn.innerHTML = '&#9829;';
          if (!window.__wishlistIds.includes(id)) window.__wishlistIds.push(id);
        }
        refreshWishlistBadge();
        window.showToast('Wishlist updated.');
      } catch (err) { window.showToast(err.message, 'error'); }
    });
  });
}

// --------- Homepage sections ---------
async function loadHomepageSections() {
  const featuredEl = document.getElementById('featured-products');
  const newArrivalsEl = document.getElementById('new-arrivals-products');
  const bestsellersEl = document.getElementById('bestseller-products');
  const categoriesEl = document.getElementById('home-categories');

  await loadWishlistIds();

  if (categoriesEl) {
    try {
      const { categories } = await window.api.get('/categories', { auth: false });
      categoriesEl.innerHTML = categories
        .filter((c) => c.isActive)
        .map(
          (c) => `<a class="cat-card" href="/user/shop/?category=${c._id}">
            <div class="cat-thumb"><img src="${c.image || 'https://images.unsplash.com/photo-1611591437281-460bfbe1220a?w=300'}" alt="${window.escapeHTML(c.name)}"/></div>
            <span>${window.escapeHTML(c.name)}</span>
          </a>`
        )
        .join('');
    } catch (_) { categoriesEl.innerHTML = '<p class="muted">Categories unavailable right now.</p>'; }
  }

  const fetchAndRender = async (el, query) => {
    if (!el) return;
    el.innerHTML = window.gemLoaderHTML;
    try {
      const { items } = await window.api.get(`/products?${query}`, { auth: false });
      el.innerHTML = items.map(productCardHTML).join('') || '<p class="muted">No products yet — run the seed script.</p>';
      bindProductGridEvents(el);
    } catch (err) {
      el.innerHTML = `<p class="muted">${err.message}</p>`;
    }
  };

  fetchAndRender(featuredEl, 'sort=featured&limit=4');
  fetchAndRender(newArrivalsEl, 'sort=newest&limit=4');
  fetchAndRender(bestsellersEl, 'sort=best-selling&limit=4');
}

// --------- Shop listing page ---------
const shopState = { page: 1, filters: {}, sort: 'featured' };

function readFiltersFromForm() {
  const form = document.getElementById('filter-form');
  if (!form) return {};
  const fd = new FormData(form);
  const filters = {};
  for (const [key, value] of fd.entries()) {
    if (!value) continue;
    filters[key] = value;
  }
  return filters;
}

async function loadFacets() {
  const box = document.getElementById('dynamic-filters');
  if (!box) return;
  try {
    const facets = await window.api.get('/products/meta/facets', { auth: false });
    const section = (title, name, values) => `
      <div class="filter-group">
        <h4>${title}</h4>
        ${values.filter(Boolean).map((v) => `
          <label class="filter-option"><input type="radio" name="${name}" value="${v}"/> ${v}</label>
        `).join('')}
        <label class="filter-option"><input type="radio" name="${name}" value="" checked/> Any</label>
      </div>`;
    box.innerHTML =
      section('Category', 'category', facets.categories.map((c) => c._id)).replace(
        /value="([a-f0-9]{24})"\/> ([a-f0-9]{24})/g,
        (m, id) => m
      ) +
      // Replace category labels with names (categories need id as value, name as label)
      '';
    // Build category filter block manually to show names while submitting ids.
    let urlCat = new URLSearchParams(location.search).get('category') || '';
    if (urlCat && urlCat.length !== 24) {
      const match = facets.categories.find(c => c.slug.toLowerCase() === urlCat.toLowerCase() || c.name.toLowerCase() === urlCat.toLowerCase());
      if (match) urlCat = match._id;
    }
    const catBlock = `
      <div class="filter-group">
        <h4>Category</h4>
        ${facets.categories.map((c) => `<label class="filter-option"><input type="radio" name="category" value="${c._id}" ${c._id === urlCat ? 'checked' : ''}/> ${window.escapeHTML(c.name)}</label>`).join('')}
        <label class="filter-option"><input type="radio" name="category" value="" ${!urlCat ? 'checked' : ''}/> All Categories</label>
      </div>`;
    box.innerHTML =
      catBlock +
      section('Metal Type', 'metalType', facets.metalTypes) +
      section('Stone Type', 'stoneType', facets.stoneTypes) +
      section('Colour', 'color', facets.colors) +
      section('Size', 'size', facets.sizes);

    const form = document.getElementById('filter-form');
    if (form) {
      form.querySelectorAll('input').forEach((el) => el.addEventListener('change', () => { shopState.page = 1; loadShopProducts(); }));
    }
  } catch (_) { box.innerHTML = '<p class="muted">Filters unavailable.</p>'; }
}

async function loadShopProducts() {
  const grid = document.getElementById('shop-product-grid');
  const countEl = document.getElementById('result-count');
  const pager = document.getElementById('pagination');
  if (!grid) return;

  grid.innerHTML = window.gemLoaderHTML;
  const filters = readFiltersFromForm();
  const params = new URLSearchParams({ ...filters, sort: shopState.sort, page: shopState.page, limit: 12 });

  const urlParams = new URLSearchParams(location.search);
  if (urlParams.get('search')) params.set('search', urlParams.get('search'));

  // Sync URL with active filters so refreshing doesn't lose state
  const newUrl = new URL(location.href);
  newUrl.search = params.toString();
  history.replaceState(null, '', newUrl);

  try {
    const { items, total, pages, page } = await window.api.get(`/products?${params.toString()}`, { auth: false });
    await loadWishlistIds();
    grid.innerHTML = items.map(productCardHTML).join('') || '<div class="empty-state"><div class="icon">&#9670;</div><h3>No jewellery matches these filters</h3><p class="muted">Try widening your search.</p></div>';
    bindProductGridEvents(grid);
    if (countEl) countEl.textContent = `${total} result${total === 1 ? '' : 's'}`;
    if (pager) {
      pager.innerHTML = '';
      for (let i = 1; i <= pages; i++) {
        const b = document.createElement('button');
        b.textContent = i;
        if (i === page) b.classList.add('active');
        b.addEventListener('click', () => { shopState.page = i; loadShopProducts(); window.scrollTo({ top: 0, behavior: 'smooth' }); });
        pager.appendChild(b);
      }
    }
  } catch (err) {
    grid.innerHTML = `<p class="muted">${err.message}</p>`;
  }
}

async function initShopPage() {
  await loadFacets();
  const sortSelect = document.getElementById('sort-select');
  if (sortSelect) sortSelect.addEventListener('change', () => { shopState.sort = sortSelect.value; loadShopProducts(); });
  loadShopProducts();
}

// --------- Product detail page ---------
function uniq(arr) { return [...new Set(arr)]; }

async function initProductDetailPage() {
  const params = new URLSearchParams(location.search);
  const id = params.get('id');
  const root = document.getElementById('product-detail-root');
  if (!root || !id) return;

  root.innerHTML = window.gemLoaderHTML;
  let product;
  try {
    const res = await window.api.get(`/products/${id}`, { auth: false });
    product = res.product;
  } catch (err) {
    root.innerHTML = `<p class="muted">${err.message}</p>`;
    return;
  }

  const metals = uniq(product.variants.map((v) => v.metalType));
  const sizes = uniq(product.variants.map((v) => v.size).filter(Boolean));
  const state = { metal: metals[0] || product.metalType, size: sizes[0] || '', qty: 1 };

  const findVariant = () => {
    if (!product.variants || product.variants.length === 0) {
      return { sku: product.sku, price: product.discountPrice || product.price, stock: product.stock };
    }
    return product.variants.find((v) => v.metalType === state.metal && (v.size === state.size || !sizes.length)) || product.variants[0];
  };

  document.title = `${product.name} — RATNA`;

  root.innerHTML = `
    <div class="product-detail">
      <div>
        <div class="gallery-main"><img id="gallery-main-img" src="${product.images[0]}" alt="${window.escapeHTML(product.name)}"/></div>
        <div class="gallery-thumbs">
          ${product.images.map((img, i) => `<img src="${img}" class="${i === 0 ? 'active' : ''}" data-gallery-img="${img}"/>`).join('')}
        </div>
      </div>
      <div>
        <div class="product-cat">${product.category?.name || ''}</div>
        <h1 class="pd-title">${window.escapeHTML(product.name)}</h1>
        <div class="pd-sku">SKU: ${product.sku} &middot; <span class="product-rating">${'&#9733;'.repeat(Math.round(product.rating))}${'&#9734;'.repeat(5 - Math.round(product.rating))} <span class="count">(${product.numReviews} reviews)</span></span></div>
        <div class="pd-price" id="pd-price">${window.formatINR(product.discountPrice || product.price)}</div>
        ${product.discountPrice ? `<div class="price strike">${window.formatINR(product.price)}</div>` : ''}
        <p class="muted" style="margin-top:16px;">${window.escapeHTML(product.description)}</p>

        ${metals.length ? `<div class="option-group"><span class="title">Metal Type</span><div class="option-pills" id="metal-pills">
          ${metals.map((m) => `<button type="button" class="option-pill ${m === state.metal ? 'active' : ''}" data-metal="${m}">${m}</button>`).join('')}
        </div></div>` : ''}

        ${sizes.length ? `<div class="option-group"><span class="title">Size</span><div class="option-pills" id="size-pills">
          ${sizes.map((s) => `<button type="button" class="option-pill ${s === state.size ? 'active' : ''}" data-size="${s}">${s}</button>`).join('')}
        </div></div>` : ''}

        <div class="option-group">
          <span class="title">Quantity</span>
          <div class="qty-selector">
            <button type="button" id="qty-minus">&minus;</button>
            <input type="text" id="qty-input" value="1" readonly/>
            <button type="button" id="qty-plus">+</button>
          </div>
        </div>

        <p class="stock-msg" id="stock-msg"></p>

        <div class="pd-actions">
          <button class="btn btn-primary" id="add-to-cart-btn">Add to Cart</button>
          <button class="btn btn-outline" id="wishlist-btn">&#9825; Wishlist</button>
        </div>

        <div class="pd-specs">
          <div class="spec-row"><span>Metal Purity</span><span>${product.metalPurity || '—'}</span></div>
          <div class="spec-row"><span>Weight</span><span>${product.weight ? product.weight + ' g' : '—'}</span></div>
          <div class="spec-row"><span>Stone Type</span><span>${product.stoneType || '—'}</span></div>
          <div class="spec-row"><span>Stone Weight</span><span>${product.stoneWeight ? product.stoneWeight + ' ct' : '—'}</span></div>
          <div class="spec-row"><span>Colour</span><span>${product.color || '—'}</span></div>
        </div>
      </div>
    </div>

    <div class="tabs">
      <button class="tab-btn active" data-tab="desc">Description</button>
      <button class="tab-btn" data-tab="reviews">Reviews (${product.numReviews})</button>
    </div>
    <div class="tab-panel active" id="tab-desc"><p>${window.escapeHTML(product.description)}</p></div>
    <div class="tab-panel" id="tab-reviews">
      <div id="review-list"><p class="muted">Loading reviews…</p></div>
      <div style="margin-top:24px;">
        ${window.isLoggedIn() ? `
        <h4>Write a Review</h4>
        <form id="review-form">
          <div class="form-group"><label>Rating (1-5)</label><input type="number" name="rating" min="1" max="5" required/></div>
          <div class="form-group"><label>Comment</label><textarea name="comment" rows="3" required></textarea></div>
          <button class="btn btn-primary" type="submit">Submit Review</button>
        </form>` : `<p class="muted"><a href="/user/login.html">Log in</a> to write a review after your order is delivered.</p>`}
      </div>
    </div>
  `;

  const updateStockMsg = () => {
    const v = findVariant();
    const msg = document.getElementById('stock-msg');
    if (!v || v.stock <= 0) { msg.textContent = 'Out of stock'; msg.className = 'stock-msg out'; }
    else if (v.stock <= 5) { msg.textContent = `Only ${v.stock} left in stock`; msg.className = 'stock-msg low'; }
    else { msg.textContent = 'In stock'; msg.className = 'stock-msg ok'; }
  };
  updateStockMsg();

  root.querySelectorAll('[data-gallery-img]').forEach((img) => img.addEventListener('click', () => {
    document.getElementById('gallery-main-img').src = img.dataset.galleryImg;
    root.querySelectorAll('[data-gallery-img]').forEach((i) => i.classList.remove('active'));
    img.classList.add('active');
  }));
  root.querySelectorAll('[data-metal]').forEach((btn) => btn.addEventListener('click', () => {
    state.metal = btn.dataset.metal;
    root.querySelectorAll('[data-metal]').forEach((b) => b.classList.toggle('active', b === btn));
    document.getElementById('pd-price').textContent = window.formatINR(findVariant().price);
    updateStockMsg();
  }));
  root.querySelectorAll('[data-size]').forEach((btn) => btn.addEventListener('click', () => {
    state.size = btn.dataset.size;
    root.querySelectorAll('[data-size]').forEach((b) => b.classList.toggle('active', b === btn));
    document.getElementById('pd-price').textContent = window.formatINR(findVariant().price);
    updateStockMsg();
  }));
  document.getElementById('qty-minus').addEventListener('click', () => {
    state.qty = Math.max(1, state.qty - 1);
    document.getElementById('qty-input').value = state.qty;
  });
  document.getElementById('qty-plus').addEventListener('click', () => {
    state.qty += 1;
    document.getElementById('qty-input').value = state.qty;
  });

  const addBtn = document.getElementById('add-to-cart-btn');
  addBtn.addEventListener('click', async () => {
    if (!window.requireLogin()) return;
    const variant = findVariant();
    try {
      await window.api.post('/cart', { productId: product._id, variantSku: variant.sku, quantity: state.qty });
      window.showToast('Added to cart.');
      window.dispatchEvent(new Event('ratna:cart-changed'));
      let count = parseInt(addBtn.dataset.addedCount || '0', 10) + state.qty;
      addBtn.dataset.addedCount = count;
      addBtn.textContent = `${count} added to cart`;
    } catch (err) { window.showToast(err.message, 'error'); }
  });
  document.getElementById('wishlist-btn').addEventListener('click', async () => {
    if (!window.requireLogin()) return;
    try { 
      await window.api.post('/wishlist', { productId: product._id }); 
      if (!window.__wishlistIds.includes(product._id)) window.__wishlistIds.push(product._id);
      refreshWishlistBadge();
      window.showToast('Added to wishlist.'); 
    }
    catch (err) { window.showToast(err.message, 'error'); }
  });

  root.querySelectorAll('.tab-btn').forEach((btn) => btn.addEventListener('click', () => {
    root.querySelectorAll('.tab-btn').forEach((b) => b.classList.toggle('active', b === btn));
    document.getElementById('tab-desc').classList.toggle('active', btn.dataset.tab === 'desc');
    document.getElementById('tab-reviews').classList.toggle('active', btn.dataset.tab === 'reviews');
  }));

  loadReviews(product._id);
  const reviewForm = document.getElementById('review-form');
  if (reviewForm) reviewForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = Object.fromEntries(new FormData(reviewForm).entries());
    try {
      await window.api.post(`/products/${product._id}/reviews`, { rating: Number(fd.rating), comment: fd.comment });
      window.showToast('Review submitted — pending approval.');
      reviewForm.reset();
    } catch (err) { window.showToast(err.message, 'error'); }
  });
}

async function loadReviews(productId) {
  const el = document.getElementById('review-list');
  try {
    const { reviews } = await window.api.get(`/products/${productId}/reviews`, { auth: false });
    el.innerHTML = reviews.length
      ? reviews.map((r) => `
        <div class="review-item">
          <strong>${window.escapeHTML(r.user?.name || 'Customer')}</strong>
          <div class="stars">${'&#9733;'.repeat(r.rating)}${'&#9734;'.repeat(5 - r.rating)}</div>
          <p>${window.escapeHTML(r.comment)}</p>
        </div>`).join('')
      : '<p class="muted">No reviews yet. Be the first to review this piece.</p>';
  } catch (_) { el.innerHTML = '<p class="muted">Could not load reviews.</p>'; }
}

document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('featured-products')) loadHomepageSections();
  if (document.getElementById('shop-product-grid')) initShopPage();
  if (document.getElementById('product-detail-root')) initProductDetailPage();

});
