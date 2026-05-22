# TrackNow — Sericulture Management System

A full-stack **MERN** application for managing silk production, bookings, market rates, batch settlements, vehicle rental workflows, and GPS tracking — with separate **farmer (client)** and **admin** web apps.

**Live deployment (Netlify)**

| App | URL |
|-----|-----|
| Client (farmers) | https://tracknow-client.netlify.app |
| Admin | https://tracknow-admin.netlify.app |
| API | https://tracknow-backend.netlify.app |

---

## Features

### Client app (farmers / users)

- Dashboard overview
- Booking management
- Batch tracking with vehicle rental deductions on batch detail
- Live market rates
- Vehicle live tracking (when enabled)
- Profile management
- **Public driver portal** — vehicle rental entry via shared link (`/driver/rental/:token`)
- **Public self-registration** — create account via admin-shared link (`/register/:token`, 18-hour expiry)
- **PWA** — installable on Android / Add to Home screen

### Admin app

- Admin dashboard
- User management + **shareable registration link** (18h expiry, regenerate anytime)
- Booking monitoring
- **Vehicle rental batch entry** — select users, rental amount, link expiry (6/8/10h), driver portal link
- Manual batch entry
- Vehicle rental results
- Market rate management
- GPS / tracker configuration
- System activity logs

---

## Project structure

```text
TrackNow/
├── backend/
│   ├── app.js                 # Express app (local + serverless)
│   ├── server.js              # Local dev server (port 5000)
│   ├── db.js                  # MongoDB connection
│   ├── models/
│   ├── routes/
│   ├── middleware/
│   ├── utils/
│   ├── netlify/
│   │   └── functions/api.js   # Netlify serverless handler
│   ├── netlify.toml
│   └── .env.example
├── frontend-client/           # Farmer PWA (Vite + React)
│   ├── public/                # sw.js, manifest, icons
│   ├── src/
│   └── netlify.toml
├── frontend-admin/            # Admin dashboard (Vite + React)
│   ├── public/
│   ├── src/
│   └── netlify.toml
├── DEPLOY_NETLIFY.md          # Two frontend sites on Netlify
├── DEPLOY_NETLIFY_API.md      # API on Netlify Functions
├── MIGRATE_RENDER_TO_NETLIFY.md
├── MOBILE_ANDROID.md          # PWA install notes
├── package.json               # Root scripts (dev all apps)
└── README.md
```

---

## Tech stack

| Layer | Technologies |
|-------|----------------|
| **Backend** | Node.js, Express, MongoDB Atlas, Mongoose, JWT, bcryptjs, CORS, serverless-http (Netlify) |
| **Client / Admin** | React 18, Vite, React Router, Axios, CSS Modules |
| **Admin charts** | Recharts |
| **Hosting** | Netlify (2 frontends + 1 API site), MongoDB Atlas |

---

## Prerequisites

- **Node.js** 18+ (recommended)
- **npm**
- **MongoDB** — local or [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
- Git

---

## Installation

### 1. Clone the repository

```bash
git clone https://github.com/kavinM4X/TrackNow.git
cd TrackNow
```

### 2. Install dependencies

```bash
npm run install:all
```

---

## Environment variables

### Backend (`backend/.env`)

Copy from `backend/.env.example`:

```env
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb+srv://USER:PASSWORD@CLUSTER.mongodb.net/tracknow?retryWrites=true&w=majority
JWT_SECRET=your_long_random_secret

# Public links built by API (registration, driver rental)
FRONTEND_CLIENT_URL=http://localhost:5173

# Comma-separated allowed origins
CORS_ORIGIN=http://localhost:5173,http://localhost:5174
```

**Production (Netlify API site)** — also set:

- `FRONTEND_CLIENT_URL` → `https://tracknow-client.netlify.app`
- `CORS_ORIGIN` → client + admin Netlify URLs + localhost ports
- `BACKUP_ENABLED=false` (optional on serverless)

Mark **only** `MONGODB_URI` and `JWT_SECRET` as secrets in the Netlify UI.

### Client (`frontend-client/.env`)

```env
# Omit for local dev — Vite proxies /api to localhost:5000
# VITE_API_URL=http://localhost:5000/api
VITE_API_URL=https://tracknow-backend.netlify.app/api
```

### Admin (`frontend-admin/.env`)

```env
VITE_API_URL=https://tracknow-backend.netlify.app/api
VITE_CLIENT_APP_URL=https://tracknow-client.netlify.app
```

---

## Run locally

### All services (backend + client + admin)

```bash
npm run dev
```

### Individual services

```bash
npm run dev:backend   # http://localhost:5000
npm run dev:client    # http://localhost:5173
npm run dev:admin     # http://localhost:5174
```

### Seed admin user (first time)

```bash
cd backend
npm run seed:admin
```

Default credentials are defined in the seed script / `.env.example` comments.

---

## Local URLs

| Service | URL |
|---------|-----|
| Backend API | http://localhost:5000 |
| API health | http://localhost:5000/api/health |
| Client | http://localhost:5173 |
| Admin | http://localhost:5174 |
| Admin login | http://localhost:5174/admin/login |

---

## Authentication

- JWT-based auth (30-day token)
- Role-based access: `user` (farmer) vs `admin`
- Protected API routes via middleware
- Client login uses **phone number** + password

---

## Key workflows

### Vehicle rental (admin → driver → batch)

1. Admin: **Batch Entry** → enter vehicle owner, rental ₹, users, link expiry (6/8/10h) → **Generate link**
2. Driver opens client link → enters silk weights per user → submits
3. System creates **batches** with rental deduction; farmers see details in the client app

### Public user registration (admin)

1. Admin: **Create User** → **Generate / Regenerate registration link**
2. Link valid for **18 hours**; hosted on client app: `/register/:token`
3. Farmer self-registers (no admin login required)

---

## Database collections

| Collection | Purpose |
|------------|---------|
| `users` | Farmers and admins |
| `bookings` | Cocoon / booking records |
| `batches` | Production batches (incl. vehicle rental fields) |
| `marketrates` | Market rate history |
| `trackerconfigs` | GPS tracker settings |
| `trackerdays` | Tracker day records |
| `vehiclerentalsessions` | Vehicle rental sessions + driver entries |
| `publicuserinvitelinks` | Active registration invite tokens |
| `logs` | Admin activity logs |

---

## API overview

Base URL (production): `https://tracknow-backend.netlify.app/api`

### Health

```http
GET /api/health
```

### Auth

```http
POST /api/auth/login
POST /api/auth/register
GET  /api/auth/me
```

### Core resources

```http
GET/POST/PUT/DELETE  /api/bookings
GET/POST/PUT/DELETE  /api/batches
GET/POST             /api/market-rates
GET/POST             /api/tracker
GET                  /api/logs
```

### Admin

```http
GET/POST  /api/admin/users
GET/POST  /api/admin/user-invite          # Registration link (18h)
GET/POST  /api/admin/vehicle-rentals      # Vehicle rental sessions
...       /api/admin/*                    # Dashboard, bookings, rates, tracker
```

### Public (no login)

```http
GET/POST  /api/public/register-user/:token
GET/PATCH/POST  /api/public/vehicle-rental/:token
```

---

## Production build

```bash
npm run build:client
npm run build:admin
cd backend && npm install
```

Deploy guides:

- **Frontends:** [DEPLOY_NETLIFY.md](./DEPLOY_NETLIFY.md)
- **API (Netlify Functions):** [DEPLOY_NETLIFY_API.md](./DEPLOY_NETLIFY_API.md)
- **Render → Netlify migration:** [MIGRATE_RENDER_TO_NETLIFY.md](./MIGRATE_RENDER_TO_NETLIFY.md)
- **Android install:** [MOBILE_ANDROID.md](./MOBILE_ANDROID.md)

---

## Troubleshooting

### MongoDB connection error

- Confirm Atlas IP allowlist (or `0.0.0.0/0` for dev)
- URL-encode special characters in the password
- Check `MONGODB_URI` in `backend/.env` or Netlify env

### CORS error

- Set `CORS_ORIGIN` on the API to include exact frontend URLs (no trailing slash)
- Match `VITE_API_URL` on both frontends to the live API `/api` base

### Registration / driver links show `localhost`

- Set `FRONTEND_CLIENT_URL` on the API (and `VITE_CLIENT_APP_URL` on admin)
- Redeploy API + admin; click **Regenerate link**

### Registration link expired

- Links expire after **18 hours** — regenerate from **Create User** in admin

### Service worker / offline errors

- Hard refresh or unregister service worker (DevTools → Application)
- Latest `sw.js` does not intercept API requests

---

## Author

**Kavin**

- GitHub: [https://github.com/kavinM4X](https://github.com/kavinM4X)
- Repository: [https://github.com/kavinM4X/TrackNow](https://github.com/kavinM4X/TrackNow)

---

## License

ISC License

---

**TrackNow** — Empowering sericulture management with technology.
