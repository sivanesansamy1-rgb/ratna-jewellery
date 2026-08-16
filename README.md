# RATNA — Fine Jewellery E-Commerce Platform

A complete jewellery e-commerce website built to the project spec: a customer
storefront (browsing, cart, checkout, orders, wishlist, reviews) and a
separate, secured admin dashboard (products, categories, orders, customers,
reviews, coupons, returns, analytics) — backed by a Node.js/Express/MongoDB
REST API with JWT authentication and role-based access control.

```
jewellery-store/
├── backend/          Node.js + Express + MongoDB REST API
└── frontend/
    ├── user/         Customer storefront (HTML/CSS/vanilla JS)
    ├── admin/         Admin dashboard (HTML/CSS/vanilla JS)
    ├── css/           Shared stylesheets
    └── js/            Shared frontend logic (calls the backend API)
```

## Why a separate backend step is needed

This is a real full-stack app — product data, carts, orders and payments are
handled by a live database and server, not fake/local data. Every page you
open in a browser calls the API described below, so **the backend must be
running (and connected to MongoDB) for the site to actually work.** Opening
the HTML files alone will show empty product grids and "could not reach the
server" messages — that's expected until step 2 is done.

## 1. Prerequisites

- Node.js 18+ and npm
- A MongoDB database — either:
  - A free [MongoDB Atlas](https://www.mongodb.com/cloud/atlas/register) cluster (recommended, takes ~5 minutes), or
  - A local MongoDB install (`mongodb://localhost:27017/jewellery-store`)
- (Optional, for online payments) A free [Razorpay](https://razorpay.com) test account for API keys
- (Optional, for product image uploads via an admin media picker) A [Cloudinary](https://cloudinary.com) account — the seeded demo uses hotlinked Unsplash images so this isn't required to try the site

## 2. Backend setup

```bash
cd backend
npm install
cp .env.example .env
```

Open `.env` and fill in at minimum:

```
MONGO_URI=<your MongoDB connection string>
JWT_SECRET=<any long random string>
```

Add Razorpay test keys if you want to try online payment (Card/UPI/Net
Banking/Wallet) end-to-end. Without them, **Cash on Delivery still works
fully** since it skips the payment gateway.

Seed the database with sample categories, 8 jewellery products, and an admin
account:

```bash
npm run seed #don't run
```

This prints the admin login it created, e.g.:
```
Admin account created -> email: sivanesansamy1@gmail.com/ password: Siva@2005
```

Start the API:

```bash
npm run dev      # with auto-reload (nodemon)
# or
npm start
```

The API runs at `http://localhost:5000/api` by default. Visit
`http://localhost:5000/api/health` to confirm it's up.

## 3. Frontend setup

The frontend is plain HTML/CSS/JS — no build step. Serve the `frontend`
folder with any static file server (opening the files directly with
`file://` will hit CORS restrictions in most browsers, so a local server is
recommended):

```bash
cd frontend
npx serve -l 5500 .  # or: python3 -m http.server 5500
```

Then open:
- Storefront: `http://localhost:5500/user/index.html`
- Admin dashboard: `http://localhost:5500/admin/login.html`

If your API isn't on `http://localhost:5000/api` (e.g. you deployed it),
open your browser console on any page and run:
```js
localStorage.setItem('ratna_api_base', 'https://your-api-url.com/api')
```

Also update `CLIENT_URL` / `ADMIN_URL` in the backend's `.env` to match
wherever you're serving the frontend from, so CORS allows the requests.

## 4. Try it out

**As a customer:**
1. Register an account, browse the shop, filter by metal type/price/rating.
2. Add a ring to your cart, choose a metal/size variant.
3. Apply a coupon (create one from the admin panel first, see below).
4. Checkout with Cash on Delivery (works immediately) or Card/UPI (needs Razorpay test keys).
5. Track your order status and request a return once it's marked "Delivered" (toggle status from the admin panel to test this).

**As an admin:**
1. Log in at `/admin/login.html` with the seeded admin credentials.
2. Add/edit products with multiple metal & size variants and live stock counts.
3. Create a coupon (e.g. `FESTIVE10`, 10% off, min order ₹2,000).
4. Move orders through their status flow (Order Placed → ... → Delivered).
5. Approve/reject customer reviews before they appear on product pages.
6. Check the dashboard for revenue, low-stock alerts, and top sellers.

## Security notes (backend-enforced, not just hidden in the UI)

- Passwords are hashed with bcrypt; the password field is never returned in
  any API response.
- Every account/cart/order/wishlist route requires a valid JWT (`protect` middleware).
- Every `/api/admin/*` route requires the JWT **and** re-checks `role === 'admin'`
  against the database on the server (`requireAdmin` middleware) — the admin
  UI hiding buttons is a convenience, not the actual security boundary.
- Cart totals, discounts, tax and shipping are always recalculated server-side;
  the frontend only displays what the server returns.
- For online payments, the Razorpay payment signature is verified with HMAC-SHA256
  on the backend before an order is ever marked "Paid" — a modified frontend
  cannot mark an unpaid order as paid.
- Stock is checked and decremented atomically at order placement, and restored
  automatically if an order is cancelled or a return is completed.
- Basic rate limiting is applied globally and more tightly on login/register
  routes to slow brute-force attempts, plus `helmet` and NoSQL-injection
  sanitisation on all input.

## Tech stack

- **Backend:** Node.js, Express, MongoDB/Mongoose, JSON Web Tokens, bcrypt, Razorpay SDK, Helmet, express-rate-limit
- **Frontend:** Vanilla HTML/CSS/JS (no framework/build step), `fetch` against the REST API, Razorpay https://127.0.0.1:64391/static/artifacts/7325292c-82f3-4c05-8570-088005d81d3e/.user_uploaded/media_1786786277924.png?csrf=2db91aa6-8591-476c-a13c-0e499df56d15Checkout.js for payments

## Extending this further

- Swap the hotlinked Unsplash images for Cloudinary uploads via an admin media picker (the `cloudinary` package is already in `package.json`, ready to wire up in `adminProductController.js`).
- Add email/SMS notifications on order status changes (e.g. with Nodemailer or an SMS API).
- Add pagination to the admin Orders/Users tables if your catalogue grows large (the API already supports `page`/`limit`).
