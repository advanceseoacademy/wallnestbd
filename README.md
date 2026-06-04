# WallNest BD — E-commerce (Next.js + Supabase)

Bangladesh-focused online store with **manual bKash / Rocket / Nagad** payments, **VPS image uploads**, and a **dynamic admin dashboard**.

## Stack

| Layer | Tech |
|-------|------|
| Framework | **Next.js 15** (Pages + App Router API) |
| Database | **Supabase** |
| Views | EJS templates (server-rendered) |
| Session | `iron-session` (cart + login + admin) |

Legacy Express server is still available: `npm run dev:express`

## Quick start

```bash
npm install
npm run setup:db    # first time only
npm run migrate     # payment + admin schema
npm run seed
npm run dev         # Next.js — http://localhost:3000
```

- Store: http://localhost:3000  
- Account: http://localhost:3000/account  
- Admin: http://localhost:3000/admin (default `admin` / `wallnest123` — change in `.env`)

## Features

| Feature | Details |
|---------|---------|
| Storefront | Your original shop UI — brand **WallNest BD**, prices in **৳ BDT** |
| Checkout | Customer pays via bKash/Rocket/Nagad, submits Trx ID |
| Admin | Dashboard, orders (verify payment), products + image upload, payment numbers |
| Images | Saved on VPS at `public/uploads/products/` (served as static files) |

## VPS deployment

1. Clone project to server, set `.env` (`BASE_URL`, Supabase keys, `ADMIN_PASSWORD`)
2. `npm install && npm run setup:db && npm run migrate && npm run seed`
3. Use **PM2** or systemd: `npm run build && npm run start`
4. Nginx reverse proxy to port 3000
5. Ensure `public/uploads/` is writable and included in backups

## Admin payment setup

1. Login → **পেমেন্ট** menu  
2. Enter your real **bKash / Rocket / Nagad** numbers  
3. Customers see these at checkout  

## Verify orders

1. **অর্ডার** page → orders with `submitted` payment  
2. Click **Verify** after checking mobile banking  
3. Order moves to confirmed / verified  

## Environment

See `.env.example` for all variables.
