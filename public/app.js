// app.js — ShopSphere frontend (vanilla JS, hash router, no build step)

const state = {
  user: null,
  products: [],
  cart: JSON.parse(localStorage.getItem('cart') || '[]') // [{productId, quantity}]
};

const $app = document.getElementById('app');
const $toast = document.getElementById('toast');
const $cartCount = document.getElementById('cart-count');
const $authStatus = document.getElementById('auth-status');
const money = (n) => '₹' + Number(n).toLocaleString('en-IN');

// ---------- API helper ----------
async function api(path, options = {}) {
  const res = await fetch('/api' + path, {
    headers: { 'Content-Type': 'application/json' },
    credentials: 'same-origin',
    ...options
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error((data && data.error) || 'Something went wrong.');
  return data;
}

function showToast(msg) {
  $toast.textContent = msg;
  $toast.classList.add('show');
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => $toast.classList.remove('show'), 2200);
}

function saveCart() {
  localStorage.setItem('cart', JSON.stringify(state.cart));
  updateCartCount();
}
function updateCartCount() {
  $cartCount.textContent = state.cart.reduce((sum, i) => sum + i.quantity, 0);
}
function addToCart(productId, quantity = 1) {
  const existing = state.cart.find((i) => i.productId === productId);
  if (existing) existing.quantity += quantity;
  else state.cart.push({ productId, quantity });
  saveCart();
  showToast('Added to cart');
}

async function refreshAuth() {
  state.user = await api('/me');
  renderAuthStatus();
}
function renderAuthStatus() {
  $authStatus.innerHTML = state.user
    ? `Hi, ${escapeHtml(state.user.name)} · <a href="#" id="logout-link">Log out</a>`
    : `<a href="#/login">Log in</a>`;
  const logoutLink = document.getElementById('logout-link');
  if (logoutLink) logoutLink.onclick = async (e) => {
    e.preventDefault();
    await api('/logout', { method: 'POST' });
    state.user = null;
    renderAuthStatus();
    showToast('Logged out');
    navigate('#/');
  };
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// ---------- Router ----------
const routes = {
  '/': renderCatalog,
  '/cart': renderCart,
  '/login': renderLogin,
  '/register': renderRegister,
  '/orders': renderOrders,
  '/checkout': renderCheckout
};

function navigate(hash) { window.location.hash = hash; }

async function router() {
  const hash = window.location.hash.slice(1) || '/';
  const [pathPart] = hash.split('?');

  if (pathPart.startsWith('/product/')) {
    const id = pathPart.split('/')[2];
    return renderProductDetail(id);
  }
  const handler = routes[pathPart] || renderCatalog;
  window.scrollTo(0, 0);
  handler();
}

// ---------- Views ----------
async function renderCatalog() {
  $app.innerHTML = `
    <section class="hero">
      <span class="eyebrow">Kit up like a pro</span>
      <h1>Gear that performs when the pressure's on.</h1>
      <p class="lede">Hand-picked bats, protective gear, and match essentials — sourced for club and tournament players.</p>
    </section>
    <div class="filter-bar" id="filter-bar"></div>
    <div class="product-grid" id="product-grid">Loading products…</div>
  `;
  const products = await api('/products');
  state.products = products;
  const categories = ['All', ...new Set(products.map((p) => p.category))];
  const $filterBar = document.getElementById('filter-bar');
  $filterBar.innerHTML = categories.map((c, i) =>
    `<button class="filter-btn ${i === 0 ? 'active' : ''}" data-cat="${escapeHtml(c)}">${escapeHtml(c)}</button>`
  ).join('');
  $filterBar.addEventListener('click', (e) => {
    const btn = e.target.closest('.filter-btn');
    if (!btn) return;
    $filterBar.querySelectorAll('.filter-btn').forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');
    const cat = btn.dataset.cat;
    renderProductGrid(cat === 'All' ? products : products.filter((p) => p.category === cat));
  });
  renderProductGrid(products);
}

function renderProductGrid(products) {
  const $grid = document.getElementById('product-grid');
  if (products.length === 0) {
    $grid.innerHTML = `<div class="empty-state"><h2>No products here</h2><p>Try a different category.</p></div>`;
    return;
  }
  $grid.innerHTML = products.map((p) => `
    <article class="product-card" data-id="${p.id}">
      <img src="${p.image}" alt="${escapeHtml(p.name)}" loading="lazy">
      <div class="body">
        <span class="category">${escapeHtml(p.category)}</span>
        <h3>${escapeHtml(p.name)}</h3>
        <p class="desc">${escapeHtml(p.description)}</p>
        <div class="row">
          <span class="price">${money(p.price)}</span>
          <button class="btn btn-primary add-btn" data-id="${p.id}">Add to cart</button>
        </div>
      </div>
    </article>
  `).join('');

  $grid.querySelectorAll('.product-card').forEach((card) => {
    card.addEventListener('click', (e) => {
      if (e.target.closest('.add-btn')) return;
      navigate(`#/product/${card.dataset.id}`);
    });
  });
  $grid.querySelectorAll('.add-btn').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      addToCart(Number(btn.dataset.id), 1);
    });
  });
}

async function renderProductDetail(id) {
  $app.innerHTML = `<p>Loading…</p>`;
  let product;
  try {
    product = await api(`/products/${id}`);
  } catch {
    $app.innerHTML = `<div class="empty-state"><h2>Product not found</h2><a href="#/" class="btn btn-secondary">Back to catalog</a></div>`;
    return;
  }
  $app.innerHTML = `
    <a href="#/" class="back-link">&larr; Back to catalog</a>
    <div class="detail-grid">
      <img src="${product.image}" alt="${escapeHtml(product.name)}">
      <div class="detail-info">
        <span class="category">${escapeHtml(product.category)}</span>
        <h1>${escapeHtml(product.name)}</h1>
        <span class="price">${money(product.price)}</span>
        <p class="desc">${escapeHtml(product.description)}</p>
        <div class="qty-row">
          <button id="qty-dec">−</button>
          <span id="qty-val">1</span>
          <button id="qty-inc">+</button>
        </div>
        <button class="btn btn-primary btn-block" id="add-detail-btn">Add to cart</button>
        <p class="stock-note">${product.stock} in stock</p>
      </div>
    </div>
  `;
  let qty = 1;
  const $qtyVal = document.getElementById('qty-val');
  document.getElementById('qty-inc').onclick = () => { qty = Math.min(qty + 1, product.stock); $qtyVal.textContent = qty; };
  document.getElementById('qty-dec').onclick = () => { qty = Math.max(1, qty - 1); $qtyVal.textContent = qty; };
  document.getElementById('add-detail-btn').onclick = () => addToCart(product.id, qty);
}

async function renderCart() {
  if (state.cart.length === 0) {
    $app.innerHTML = `<div class="empty-state"><h2>Your cart is empty</h2><p>Browse the catalog to find your next piece of kit.</p><a href="#/" class="btn btn-primary">Shop now</a></div>`;
    return;
  }
  $app.innerHTML = `<h1>Your cart</h1><div id="cart-items"></div><div class="cart-summary" id="cart-summary"></div>`;
  const products = state.products.length ? state.products : await api('/products');
  state.products = products;

  const renderCartItems = () => {
    const $items = document.getElementById('cart-items');
    const $summary = document.getElementById('cart-summary');
    let total = 0;
    $items.innerHTML = state.cart.map((item) => {
      const p = products.find((pr) => pr.id === item.productId);
      if (!p) return '';
      total += p.price * item.quantity;
      return `
        <div class="cart-item" data-id="${p.id}">
          <img src="${p.image}" alt="${escapeHtml(p.name)}">
          <div>
            <div class="name">${escapeHtml(p.name)}</div>
            <div class="unit-price">${money(p.price)} each</div>
          </div>
          <div class="qty-row" style="margin:0">
            <button class="dec">−</button>
            <span>${item.quantity}</span>
            <button class="inc">+</button>
          </div>
          <button class="btn btn-danger remove-btn">Remove</button>
        </div>
      `;
    }).join('');
    $summary.innerHTML = `
      <div class="total-row"><span>Total</span><span>${money(total)}</span></div>
      <button class="btn btn-primary btn-block" id="checkout-btn">Proceed to checkout</button>
    `;
    document.getElementById('checkout-btn').onclick = () => navigate('#/checkout');

    $items.querySelectorAll('.cart-item').forEach((row) => {
      const id = Number(row.dataset.id);
      row.querySelector('.inc').onclick = () => {
        const item = state.cart.find((i) => i.productId === id);
        item.quantity++;
        saveCart(); renderCartItems();
      };
      row.querySelector('.dec').onclick = () => {
        const item = state.cart.find((i) => i.productId === id);
        item.quantity = Math.max(1, item.quantity - 1);
        saveCart(); renderCartItems();
      };
      row.querySelector('.remove-btn').onclick = () => {
        state.cart = state.cart.filter((i) => i.productId !== id);
        saveCart();
        if (state.cart.length === 0) renderCart(); else renderCartItems();
      };
    });
  };
  renderCartItems();
}

function renderLogin() {
  $app.innerHTML = `
    <div class="form-card">
      <h1>Welcome back</h1>
      <p class="sub">Log in to check out and view your orders.</p>
      <form id="login-form">
        <label for="email">Email</label>
        <input type="email" id="email" required>
        <label for="password">Password</label>
        <input type="password" id="password" required>
        <p class="form-error" id="form-error"></p>
        <button class="btn btn-primary btn-block" type="submit">Log in</button>
      </form>
      <p class="switch-link">New here? <a href="#/register">Create an account</a></p>
    </div>
  `;
  document.getElementById('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    try {
      state.user = await api('/login', { method: 'POST', body: JSON.stringify({ email, password }) });
      renderAuthStatus();
      showToast('Logged in');
      navigate('#/');
    } catch (err) {
      document.getElementById('form-error').textContent = err.message;
    }
  });
}

function renderRegister() {
  $app.innerHTML = `
    <div class="form-card">
      <h1>Create your account</h1>
      <p class="sub">Join to track orders and check out faster.</p>
      <form id="register-form">
        <label for="name">Name</label>
        <input type="text" id="name" required>
        <label for="email">Email</label>
        <input type="email" id="email" required>
        <label for="password">Password</label>
        <input type="password" id="password" required minlength="6">
        <p class="form-error" id="form-error"></p>
        <button class="btn btn-primary btn-block" type="submit">Create account</button>
      </form>
      <p class="switch-link">Already have an account? <a href="#/login">Log in</a></p>
    </div>
  `;
  document.getElementById('register-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('name').value;
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    try {
      state.user = await api('/register', { method: 'POST', body: JSON.stringify({ name, email, password }) });
      renderAuthStatus();
      showToast('Account created');
      navigate('#/');
    } catch (err) {
      document.getElementById('form-error').textContent = err.message;
    }
  });
}

async function renderCheckout() {
  if (!state.user) { navigate('#/login'); return; }
  if (state.cart.length === 0) { navigate('#/cart'); return; }
  const products = state.products.length ? state.products : await api('/products');
  let total = 0;
  const lines = state.cart.map((item) => {
    const p = products.find((pr) => pr.id === item.productId);
    total += p.price * item.quantity;
    return `<div class="order-line"><span>${escapeHtml(p.name)} × ${item.quantity}</span><span>${money(p.price * item.quantity)}</span></div>`;
  }).join('');

  $app.innerHTML = `
    <h1>Checkout</h1>
    <div class="detail-grid">
      <div>
        <form id="checkout-form">
          <label for="shipName">Full name</label>
          <input type="text" id="shipName" required value="${escapeHtml(state.user.name)}">
          <label for="shipAddress">Shipping address</label>
          <textarea id="shipAddress" rows="4" required></textarea>
          <p class="form-error" id="form-error"></p>
          <button class="btn btn-primary btn-block" type="submit" style="margin-top:16px">Place order</button>
        </form>
      </div>
      <div class="cart-summary" style="margin:0; max-width:100%">
        <h3>Order summary</h3>
        ${lines}
        <div class="total-row" style="margin-top:12px">
          <span>Total</span><span>${money(total)}</span>
        </div>
      </div>
    </div>
  `;
  document.getElementById('checkout-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const shippingName = document.getElementById('shipName').value;
    const shippingAddress = document.getElementById('shipAddress').value;
    try {
      const result = await api('/orders', {
        method: 'POST',
        body: JSON.stringify({
          items: state.cart,
          shippingName,
          shippingAddress
        })
      });
      state.cart = [];
      saveCart();
      showToast(`Order #${result.orderId} placed!`);
      navigate('#/orders');
    } catch (err) {
      document.getElementById('form-error').textContent = err.message;
    }
  });
}

async function renderOrders() {
  if (!state.user) { navigate('#/login'); return; }
  $app.innerHTML = `<h1>My orders</h1><div id="orders-list">Loading…</div>`;
  const orders = await api('/orders');
  const $list = document.getElementById('orders-list');
  if (orders.length === 0) {
    $list.innerHTML = `<div class="empty-state"><h2>No orders yet</h2><a href="#/" class="btn btn-primary">Start shopping</a></div>`;
    return;
  }
  $list.innerHTML = orders.map((o) => `
    <div class="order-card">
      <div class="head">
        <span>Order #${o.id} · ${new Date(o.created_at).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' })}</span>
        <span class="status-pill">${escapeHtml(o.status)}</span>
      </div>
      ${o.items.map((i) => `<div class="order-line"><span>${escapeHtml(i.name)} × ${i.quantity}</span><span>${money(i.price * i.quantity)}</span></div>`).join('')}
      <div class="order-line" style="margin-top:8px; font-weight:700; color:var(--brass-bright)"><span>Total</span><span>${money(o.total)}</span></div>
    </div>
  `).join('');
}

// ---------- Init ----------
window.addEventListener('hashchange', router);
window.addEventListener('DOMContentLoaded', async () => {
  updateCartCount();
  await refreshAuth();
  router();
});
