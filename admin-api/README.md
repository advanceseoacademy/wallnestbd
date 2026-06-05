# WallNest Admin API (NestJS)

Admin dashboard **REST API** for WallNest BD.

- **Port:** `3002` (override with `ADMIN_API_PORT`)
- **Prefix:** `/api/admin`
- **Auth:** Same `iron-session` cookie as Next.js (`wn_session`)

## Run

```bash
npm install --prefix admin-api
npm run start:dev --prefix admin-api
```

Or from repo root: `npm run dev` (starts with Next.js).

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/stats` | Dashboard stats |
| GET/POST/PUT/DELETE | `/products` | Products CRUD |
| GET/POST/PUT/DELETE | `/categories` | Categories CRUD |
| GET/PATCH | `/orders` | Orders |
| GET/PUT | `/settings/payments` | Payment numbers |
| POST | `/upload` | Product image |
| POST | `/upload/category-hero` | Homepage hero image |

Business logic lives in `../lib/adminApiBridge.js` (shared with legacy Express).
