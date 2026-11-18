# Inventory & Warehouse Management API

## Setup

1. Use Node.js 20 or newer and a MongoDB replica set (Atlas clusters are suitable). For local MongoDB, start `mongod` with `--replSet rs0` and initialize it once with `mongosh --eval "rs.initiate()"`.
2. From this directory, copy `.env.example` to `.env` and set `MONGODB_URI`, a random `JWT_SECRET` of at least 32 characters, and the optional ImageKit settings.
3. Run `npm install`, then `npm run dev`. The API listens on port `5000` by default.
4. Set `BOOTSTRAP_ADMIN_USERNAME`, `BOOTSTRAP_ADMIN_EMAIL`, and `BOOTSTRAP_ADMIN_PASSWORD` in `.env`, then run `npm run create-admin`. The script only creates the first administrator and refuses to change an existing admin account. Public registration always creates a sales representative; it never accepts a requested role.

Inventory changes spanning stock, transactions, supply requests, and orders use MongoDB transactions. The database must run as a replica set.

## API structure

- `server.js`, `src/app.js`: load configuration, connect to MongoDB, and mount routes.
- `src/config/`: database connection.
- `src/models/`: Mongoose schemas and references for users, products, warehouses, stock, transactions, orders, and supply requests.
- `src/controllers/`: request validation and business operations.
- `src/routes/`: route-to-controller wiring and role permissions.
- `src/middlewares/`: current-user authentication, role checks, and consistent error responses.
- `src/services/imagekit.service.js`: signs short-lived ImageKit upload parameters without exposing the private key.

Authenticated requests accept either the HTTP-only `token` cookie or an `Authorization: Bearer <token>` header. Cookie clients should send credentials and use an allowed origin listed in `CORS_ORIGINS`.

## Routes

| Route | Access |
| --- | --- |
| `POST /api/auth/register`, `POST /api/auth/login` | Public |
| `POST /api/auth/logout`, `GET /api/auth/me` | Authenticated |
| `/api/users` | Admin CRUD; `PUT /api/users/me` updates the signed-in user's profile |
| `/api/products` | Authenticated reads; admin writes |
| `/api/warehouses` | Admin CRUD; managers see assigned warehouses; suppliers and sales reps can read warehouse choices |
| `/api/stock` | Admin/managers adjust stock; sales reps can read availability; `GET /low-stock` is admin/manager only |
| `/api/transactions` | Admin and assigned warehouse managers |
| `/api/orders` | Sales representatives create and view their own orders; admin/managers process orders |
| `/api/supply-requests` | Suppliers manage their own requests; admins review them |
| `GET /api/upload/auth` | Any authenticated user; returns short-lived ImageKit upload authentication |

Stock-changing order processing and approved supply requests create stock transactions as part of the same MongoDB transaction. Orders require `items` entries with `product`, `warehouse`, and positive integer `quantity`. Products and user profiles store ImageKit uploads as `{ "url": "https://...", "fileId": "..." }`.

ImageKit's private key is used only by the API to sign the upload-authentication response. The frontend uploads with the returned `publicKey`, `urlEndpoint`, `token`, `expire`, and `signature`, then sends the resulting URL and file ID in its product/profile request.
