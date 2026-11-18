# Inventory & Warehouse Management Frontend

## Run locally

1. Use Node.js 20.19 or newer. Copy `.env.example` to `.env` and set `VITE_API_URL` if the backend is not at `http://localhost:5000/api`.
2. From this directory run `npm install`, then `npm run dev`.
3. Configure the backend `CORS_ORIGINS` to include the Vite origin, then sign in with an account created by the backend.

The browser uses the backend's HTTP-only authentication cookie (`withCredentials`); no JWT is stored in local storage. Supplier and product image files upload directly to ImageKit using short-lived credentials returned by the authenticated `/api/upload/auth` endpoint. The ImageKit private key is never sent to the browser.

## Source structure

- `src/api/`: centralized Axios client, response/error helpers, and ImageKit uploads.
- `src/context/`: session state and toast notifications.
- `src/components/`: responsive application shell, protected-route checks, dialogs, loading/error states, and common fields.
- `src/pages/`: login/registration, role-based overview, catalog/order workspace, warehouse inventory, supplier portal, and admin/manager data pages.

The API client expects the backend response envelope `{ success, data, message }`. Role permissions remain enforced by the backend; the frontend route checks only control navigation and presentation.
