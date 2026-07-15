// db.js — SQLite connection, schema creation, and seed data
const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, 'shopsphere.db'));
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// ---------- Schema ----------
db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS products (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  description TEXT,
  price REAL NOT NULL,
  category TEXT,
  image TEXT,
  stock INTEGER DEFAULT 100
);

CREATE TABLE IF NOT EXISTS orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  total REAL NOT NULL,
  status TEXT DEFAULT 'placed',
  shipping_name TEXT,
  shipping_address TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS order_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id INTEGER NOT NULL,
  product_id INTEGER NOT NULL,
  quantity INTEGER NOT NULL,
  price REAL NOT NULL,
  FOREIGN KEY (order_id) REFERENCES orders(id),
  FOREIGN KEY (product_id) REFERENCES products(id)
);
`);

// ---------- Seed products (only if table is empty) ----------
const count = db.prepare('SELECT COUNT(*) AS c FROM products').get().c;
if (count === 0) {
  const insert = db.prepare(`
    INSERT INTO products (name, description, price, category, image, stock)
    VALUES (@name, @description, @price, @category, @image, @stock)
  `);
  const products = [
    { name: 'Pro Carbon Cricket Bat', description: 'English willow, carbon-fiber bound handle for extra power and control.', price: 8999, category: 'Bats', image: 'https://images.unsplash.com/photo-1595435742656-5272d0b3fa82?w=600', stock: 25 },
    { name: 'Elite Batting Gloves', description: 'Premium leather palm with high-density foam knuckle protection.', price: 2499, category: 'Protective Gear', image: 'https://images.unsplash.com/photo-1593766787879-e8c26f7c4d8f?w=600', stock: 40 },
    { name: 'Aero Cricket Helmet', description: 'Titanium grille, adjustable fit, lightweight ventilated shell.', price: 3999, category: 'Protective Gear', image: 'https://images.unsplash.com/photo-1531415074968-036ba1b575da?w=600', stock: 15 },
    { name: 'Match Leather Ball (Red)', description: 'Hand-stitched four-piece leather ball, tournament grade.', price: 799, category: 'Balls', image: 'https://images.unsplash.com/photo-1531574595306-de2c9e2ea5e2?w=600', stock: 100 },
    { name: 'Performance Cricket Shoes', description: 'Spiked outsole for grip on grass pitches, breathable mesh upper.', price: 4499, category: 'Footwear', image: 'https://images.unsplash.com/photo-1600185365483-26d7a4cc7519?w=600', stock: 30 },
    { name: 'Training Kit Bag', description: 'Wheeled duffel with dedicated bat compartment and shoe pocket.', price: 3299, category: 'Accessories', image: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=600', stock: 20 },
    { name: 'Pro Batting Pads', description: 'Lightweight foam-core leg guards with reinforced knee rolls.', price: 2999, category: 'Protective Gear', image: 'https://images.unsplash.com/photo-1622279457486-62dcc4a431d6?w=600', stock: 35 },
    { name: 'Wicket-Keeping Gloves', description: 'Extra padded pittard palm for safe, sure catches.', price: 2199, category: 'Protective Gear', image: 'https://images.unsplash.com/photo-1608245449230-4ac19066d2d0?w=600', stock: 22 },
    { name: 'All-Rounder Kit Combo', description: 'Bat + pads + gloves + helmet bundle at a bundled price.', price: 15999, category: 'Bundles', image: 'https://images.unsplash.com/photo-1622279457486-62dcc4a431d6?w=600', stock: 10 }
  ];
  const insertMany = db.transaction((items) => items.forEach((p) => insert.run(p)));
  insertMany(products);
  console.log(`Seeded ${products.length} products.`);
}

module.exports = db;
