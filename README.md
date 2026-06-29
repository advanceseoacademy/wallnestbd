# WallNest BD — E-commerce (Next.js + Supabase)

Bangladesh-focused online store with **manual bKash / Rocket / Nagad** payments, **VPS image uploads**, and a **dynamic admin dashboard**.

**GitHub:** [advanceseoacademy/wallnestbd](https://github.com/advanceseoacademy/wallnestbd)

## Stack

| Layer | Tech |
|-------|------|
| Storefront | **Next.js 15** (Pages + EJS) |
| Admin API | **NestJS** (`admin-api/`, port 3002) |
| Database | **Supabase** |
| Admin UI | EJS templates (Next.js SSR) |
| Session | `iron-session` (cart + login + admin) |

`npm run dev` runs **Next.js (3000)** + **NestJS admin API (3002)** together.

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
npm install && npm install --prefix admin-api
npm run dev         # Next :3000 + Nest admin API :3002
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

## Deploy on VPS (CyberPanel + wallnestbd.com)

Repo: **https://github.com/advanceseoacademy/wallnestbd**

### 1) CyberPanel — website

1. **Websites → Create Website** — domain: `wallnestbd.com`, PHP not required.
2. Delete the default `index.html` (the “CyberPanel Installed” page).
3. **SSL → Issue SSL** for `wallnestbd.com` (Let’s Encrypt).

### 2) SSH — clone & build

```bash
mkdir -p /home/wallnestbd.com/app
cd /home/wallnestbd.com/app
git clone https://github.com/advanceseoacademy/wallnestbd.git .
npm install
npm install --prefix admin-api
cp .env.example .env
nano .env
```

Set at minimum:

| Variable | Production example |
|----------|-------------------|
| `BASE_URL` | `https://wallnestbd.com` |
| `SESSION_SECRET` | long random string (32+ chars) |
| `SUPABASE_URL` | your Supabase URL |
| `SUPABASE_PUBLISHABLE_KEY` | anon key |
| `ADMIN_USERNAME` / `ADMIN_PASSWORD` | admin login |
| `SMTP_*` | Gmail app password (optional) |

First-time database (from your laptop or VPS):

```bash
npm run setup:db
npm run migrate
npm run seed          # optional demo data
npm run build
chmod -R 775 public/uploads
```

### 3) PM2 — keep app running

```bash
npm install -g pm2
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup
```

App listens on **port 3010** (CyberPanel often uses 3000 internally — do not use 3000).

### 4) CyberPanel — reverse proxy to Node

**Websites → List Websites → wallnestbd.com → Manage → vHost Conf** — add at the **end**, proxy to `http://127.0.0.1:3010`:

```apache
maxReqHeaderSize        65536

extprocessor node_app {
  type                    proxy
  address                 127.0.0.1:3010
  maxConns                100
  initTimeout             60
  retryTimeout            0
  respBuffer              0
}

context / {
  type                    proxy
  handler                 node_app
  addDefaultCharset       off
}
```

Save and **graceful restart** OpenLiteSpeed from CyberPanel.

Alternative: **Websites → Setup Node.js App** (if available) — app root = `/home/wallnestbd.com/app`, startup file `npm start`, port `3010`.

### 5) Fix “431 Request Header Fields Too Large” (nghttpx)

1. **Browser:** clear cookies for `wallnestbd.com` (old/large session cookies are a common cause).
2. **OpenLiteSpeed:** **Server Configuration → Tuning** — set **Max Request Header Size** to `65536`, then graceful restart.
3. **vHost Conf:** include `maxReqHeaderSize 65536` at the top (see section 4).
4. Confirm the proxy points to **3010**, not 3000 (`curl -I http://127.0.0.1:3010` should show your app, not `nghttpx` alone).

### 6) Updates after code changes

```bash
cd /home/wallnestbd.com/app
git pull
npm install
npm install --prefix admin-api
npm run build
pm2 restart wallnestbd
```

Ensure `public/uploads/` is writable and backed up.

## Google sign-in (Gmail)

1. **Supabase** → Authentication → Providers → **Google** → Enable  
2. **Google Cloud Console** → APIs & Services → Credentials → OAuth 2.0 Client  
   - Authorized redirect URI: `https://<project-ref>.supabase.co/auth/v1/callback`
3. Paste Google **Client ID** + **Client Secret** into Supabase Google provider  
4. **Supabase** → Authentication → URL Configuration → Redirect URLs:
   - `https://wallnestbd.com/auth/callback`
   - `http://localhost:3000/auth/callback` (local dev)

Users see **“Google দিয়ে চালিয়ে যান”** on login/register modals.

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
