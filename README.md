# WallNest BD — E-commerce (Next.js + Supabase)

Bangladesh-focused online store with **manual bKash / Rocket / Nagad** payments, **VPS image uploads**, and a **dynamic admin dashboard**.

**GitHub:** [advanceseoacademy/wallnestbd](https://github.com/advanceseoacademy/wallnestbd)

## Stack

| Layer | Tech |
|-------|------|
| Framework | **Next.js 15** (Pages + App Router API) |
| Database | **Supabase** |
| Views | EJS templates (server-rendered) |
| Session | `iron-session` (cart + login + admin) |

Legacy Express server: `npm run dev:express` (port 3001)

## Quick start (local)

```bash
git clone https://github.com/advanceseoacademy/wallnestbd.git
cd wallnestbd
npm install
cp .env.example .env
# Edit .env — Supabase keys, SESSION_SECRET, ADMIN_PASSWORD
npm run setup:db    # first time only
npm run migrate
npm run seed
npm run dev         # http://localhost:3000
```

| URL | Purpose |
|-----|---------|
| http://localhost:3000 | Store |
| http://localhost:3000/account | Customer account |
| http://localhost:3000/admin | Admin panel |

Default admin (change in `.env`): `ADMIN_USERNAME` / `ADMIN_PASSWORD`

## Environment variables

Copy `.env.example` → `.env`:

| Variable | Required | Notes |
|----------|----------|-------|
| `SESSION_SECRET` | Yes | Min 32 characters |
| `BASE_URL` | Yes | e.g. `https://yourdomain.com` |
| `SUPABASE_URL` | Yes | Project URL |
| `SUPABASE_PUBLISHABLE_KEY` | Yes | Anon/publishable key |
| `SUPABASE_PROJECT_REF` | For scripts | Management API |
| `SUPABASE_ACCESS_TOKEN` | For scripts | `setup:db`, `migrate` |
| `ADMIN_USERNAME` / `ADMIN_PASSWORD` | Yes | Admin login |

**Never commit `.env`** — it is in `.gitignore`.

## Deploy on Vercel

1. Import repo: [github.com/advanceseoacademy/wallnestbd](https://github.com/advanceseoacademy/wallnestbd)
2. Framework: **Next.js** (auto-detected)
3. Add all env vars from `.env.example`
4. Deploy

Note: Product image uploads use `public/uploads/` on disk — on Vercel use Supabase Storage or a VPS for uploads.

## Deploy on VPS (recommended for uploads)

```bash
git clone https://github.com/advanceseoacademy/wallnestbd.git
cd wallnestbd
npm install
cp .env.example .env && nano .env
npm run setup:db && npm run migrate && npm run seed
npm run build
```

**PM2:**

```bash
npm install -g pm2
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup
```

**Nginx** (example) — proxy port 3000, serve `public/` static files, SSL via Certbot.

Ensure `public/uploads/products/` is writable and backed up.

## Features

| Feature | Details |
|---------|---------|
| Storefront | WallNest BD branding, prices in **৳ BDT** |
| Checkout | bKash / Rocket / Nagad + Trx ID |
| Admin | Orders, products, image upload, payment numbers |
| Account | Profile, orders, wishlist, coupons |
| Performance | Server cache, fast client navigation |

## Admin workflow

1. **পেমেন্ট** — set bKash / Rocket / Nagad numbers  
2. **অর্ডার** — verify Trx ID after checking mobile banking  
3. **পণ্য** — add products and upload images  

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Next.js dev (port 3000) |
| `npm run build` | Production build |
| `npm run start` | Production server |
| `npm run setup:db` | Run `schema.sql` on Supabase |
| `npm run migrate` | Extra migrations |
| `npm run seed` | Sample data |

## License

Private project — WallNest BD.
