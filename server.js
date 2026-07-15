// server.js — ShopSphere backend (Express + SQLite)
const express = require('express');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const path = require('path');
const db = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.use(session({
  secret: process.env.SESSION_SECRET || 'shopsphere-dev-secret-change-me',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 1000 * 60 * 60 * 24 * 7 } // 7 days
}));

// ---------- Auth helpers ----------
function requireAuth(req, res, next) {
  if (!req.session.userId) return res.status(401).json({ error: 'Please log in first.' });
  next();
}

// ---------- Auth routes ----------
app.post('/api/register', (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password || password.length < 6) {
    return res.status(400).json({ error: 'Name, valid email, and a password of 6+ characters are required.' });
  }
  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email.toLowerCase());
  if (existing) return res.status(409).json({ error: 'An account with that email already exists.' });

  const hash = bcrypt.hashSync(password, 10);
  const info = db.prepare('INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)')
    .run(name, email.toLowerCase(), hash);

  req.session.userId = info.lastInsertRowid;
  req.session.userName = name;
  res.json({ id: info.lastInsertRowid, name, email });
});

app.post('/api/login', (req, res) => {
  const { email, password } = req.body;
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get((email || '').toLowerCase());
  if (!user || !bcrypt.compareSync(password || '', user.password_hash)) {
    return res.status(401).json({ error: 'Invalid email or password.' });
  }
  req.session.userId = user.id;
  req.session.userName = user.name;
  res.json({ id: user.id, name: user.name, email: user.email });
});

app.post('/api/logout', (req, res) => {
  req.session.destroy(() => res.json({ ok: true }));
});

app.get('/api/me', (req, res) => {
  if (!req.session.userId) return res.json(null);
  res.json({ id: req.session.userId, name: req.session.userName });
});

// ---------- Product routes ----------
app.get('/api/products', (req, res) => {
  const { category, q } = req.query;
  let sql = 'SELECT * FROM products WHERE 1=1';
  const params = [];
  if (category) { sql += ' AND category = ?'; params.push(category); }
  if (q) { sql += ' AND (name LIKE ? OR description LIKE ?)'; params.push(`%${q}%`, `%${q}%`); }
  res.json(db.prepare(sql).all(...params));
});

app.get('/api/products/:id', (req, res) => {
  const product = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);
  if (!product) return res.status(404).json({ error: 'Product not found.' });
  res.json(product);
});

// ---------- Order processing ----------
app.post('/api/orders', requireAuth, (req, res) => {
  const { items, shippingName, shippingAddress } = req.body; // items: [{productId, quantity}]
  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'Cart is empty.' });
  }
  if (!shippingName || !shippingAddress) {
    return res.status(400).json({ error: 'Shipping name and address are required.' });
  }

  const getProduct = db.prepare('SELECT * FROM products WHERE id = ?');
  const updateStock = db.prepare('UPDATE products SET stock = stock - ? WHERE id = ?');
  const insertOrder = db.prepare(`
    INSERT INTO orders (user_id, total, shipping_name, shipping_address)
    VALUES (?, ?, ?, ?)
  `);
  const insertItem = db.prepare(`
    INSERT INTO order_items (order_id, product_id, quantity, price)
    VALUES (?, ?, ?, ?)
  `);

  const placeOrder = db.transaction(() => {
    let total = 0;
    const resolved = [];
    for (const item of items) {
      const product = getProduct.get(item.productId);
      if (!product) throw new Error(`Product ${item.productId} not found.`);
      if (product.stock < item.quantity) throw new Error(`Not enough stock for ${product.name}.`);
      total += product.price * item.quantity;
      resolved.push({ product, quantity: item.quantity });
    }
    const orderInfo = insertOrder.run(req.session.userId, total, shippingName, shippingAddress);
    for (const r of resolved) {
      insertItem.run(orderInfo.lastInsertRowid, r.product.id, r.quantity, r.product.price);
      updateStock.run(r.quantity, r.product.id);
    }
    return { orderId: orderInfo.lastInsertRowid, total };
  });

  try {
    const result = placeOrder();
    res.json({ ok: true, ...result });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.get('/api/orders', requireAuth, (req, res) => {
  const orders = db.prepare('SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC').all(req.session.userId);
  const itemsStmt = db.prepare(`
    SELECT oi.quantity, oi.price, p.name, p.image
    FROM order_items oi JOIN products p ON p.id = oi.product_id
    WHERE oi.order_id = ?
  `);
  const withItems = orders.map((o) => ({ ...o, items: itemsStmt.all(o.id) }));
  res.json(withItems);
});

app.listen(PORT, () => {
  console.log(`ShopSphere running at http://localhost:${PORT}`);
});
