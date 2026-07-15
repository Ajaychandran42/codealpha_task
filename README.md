# ShopSphere 🏏

A full-stack e-commerce site for cricket gear, built with **Express.js** and **SQLite**. Plain HTML/CSS/JS on the frontend — no build step, no framework, just a fast single-page app.

![Node](https://img.shields.io/badge/node-%3E%3D18-brightgreen)
![Express](https://img.shields.io/badge/backend-Express.js-black)
![SQLite](https://img.shields.io/badge/database-SQLite-blue)

## Features

- 🛍️ **Product catalog** with category filtering
- 📄 **Product detail pages** with quantity selection
- 🛒 **Shopping cart** (persisted in `localStorage`, synced at checkout)
- 🔐 **User registration & login** (hashed passwords, server-side sessions)
- 📦 **Order processing** with stock deduction and order history
- 🎨 Premium dark UI with a brass/pitch-green accent palette and a stitched-seam signature motif

## Tech Stack

| Layer    | Technology |
|----------|------------|
| Frontend | HTML5, CSS3, vanilla JavaScript (hash-based router) |
| Backend  | Node.js, Express.js |
| Database | SQLite (via `better-sqlite3`) |
| Auth     | `express-session` + `bcryptjs` password hashing |

## Project Structure

```
shopsphere/
├── server.js          # Express app: all API routes (auth, products, orders)
├── db.js              # SQLite connection, schema, and seed data
├── package.json
├── public/
│   ├── index.html      # Single HTML shell for the whole app
│   ├── style.css        # All styling
│   └── app.js            # All frontend logic (routing, cart, API calls)
└── README.md
```

Just **3 frontend files** and **2 backend files** — everything else is config.

## Getting Started

### 1. Prerequisites
- [Node.js](https://nodejs.org/) v18 or later

### 2. Install dependencies
```bash
npm install
```

### 3. Run the server
```bash
npm start
```

The app will be available at **http://localhost:3000**. A `shopsphere.db` SQLite file is created automatically on first run and seeded with sample cricket-gear products.

## API Reference

| Method | Endpoint              | Description                          | Auth required |
|--------|------------------------|---------------------------------------|:--------------:|
| GET    | `/api/products`        | List products (`?category=`, `?q=`)   | No |
| GET    | `/api/products/:id`    | Get a single product                  | No |
| POST   | `/api/register`        | Create an account                     | No |
| POST   | `/api/login`           | Log in                                | No |
| POST   | `/api/logout`          | Log out                               | No |
| GET    | `/api/me`               | Get the current session's user        | No |
| POST   | `/api/orders`           | Place an order (`items`, `shippingName`, `shippingAddress`) | Yes |
| GET    | `/api/orders`           | List the logged-in user's orders      | Yes |

## Database Schema

- **users** — `id, name, email, password_hash, created_at`
- **products** — `id, name, description, price, category, image, stock`
- **orders** — `id, user_id, total, status, shipping_name, shipping_address, created_at`
- **order_items** — `id, order_id, product_id, quantity, price`

## Notes on Design Decisions

- **Cart storage**: kept client-side in `localStorage` and sent to the server only at checkout. This keeps browsing fast and avoids needing a session just to add items to a cart.
- **Sessions over JWT**: simpler to reason about for a small app, and cookies are handled automatically by the browser.
- **Stock deduction**: happens inside a single SQLite transaction on order placement, so partial/inconsistent orders can't occur.

## Deploying

This is a standard Node.js app, so it deploys cleanly to **Render**, **Railway**, or **Fly.io**. A couple of things to change for production:

1. Set `SESSION_SECRET` as an environment variable (don't use the default dev secret).
2. SQLite works fine for small-to-medium traffic, but on platforms with an ephemeral filesystem (like some free tiers), the `.db` file will reset on redeploy — for anything long-lived, mount a persistent disk or migrate to Postgres.

## Possible Next Steps

- Admin panel for adding/editing products
- Product image upload instead of external URLs
- Order status updates (shipped/delivered) with an admin route
- Pagination for large catalogs
- Email confirmation on order placement

## License

MIT — free to use and modify.
