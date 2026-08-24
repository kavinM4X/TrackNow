# Move backend from Render to Netlify

You will have **4 Netlify sites** (same GitHub repo):

| Site | Base directory | URL example |
|------|----------------|-------------|
| **API** | `backend` | `https://tracknow-backend.netlify.app` |
| **Client** | `frontend-client` | `https://tracknow-client.netlify.app` |
| **Admin** | `frontend-admin` | `https://tracknow-admin.netlify.app` |
| **Driver** | `frontend-driver` | `https://tracknow-driver.netlify.app` |

MongoDB stays on **Atlas**. Only the API host changes.

---

## Step 1 — Create API site on Netlify

1. [app.netlify.com](https://app.netlify.com) → **Add new project** → **TrackNow** (GitHub)
2. Settings:

| Field | Value |
|--------|--------|
| Project name | `tracknow-backend` |
| Base directory | `backend` |
| Build command | `npm install` |
| Publish directory | `public` |

3. **Environment variables** (copy from Render dashboard):

| Key | Value |
|-----|--------|
| `MONGODB_URI` | Your Atlas URI (same as Render) |
| `JWT_SECRET` | **Same as Render** (so logins keep working) |
| `NODE_ENV` | `production` |
| `BACKUP_ENABLED` | `false` |
| `FRONTEND_CLIENT_URL` | `https://tracknow-client.netlify.app` (your real client URL) |
| `CORS_ORIGIN` | See CORS details below |

**CORS_ORIGIN** (comma-separated, no spaces required):

```text
http://localhost:5173,http://localhost:5174,http://localhost:5175,https://tracknow-client.netlify.app,https://tracknow-admin.netlify.app,https://tracknow-driver.netlify.app
```

4. **Deploy site** → wait until **Published**

5. **Test API:**

Open: `https://tracknow-backend.netlify.app/api/health`

Expected:

```json
{
  "status": "OK",
  "host": "netlify",
  "features": ["vehicle-rental", "user-invite", "public-register"]
}
```

If `host` is `netlify`, the API is on Netlify correctly.

---

## Step 2 — Update frontends (client + admin + driver)

On **each** frontend Netlify site → **Site configuration** → **Environment variables**:

| Key | Value |
|-----|--------|
| `VITE_API_URL` | `https://tracknow-backend.netlify.app/api` |

Use your **real** API hostname from Step 1.

Then **Deploys** → **Trigger deploy** → **Deploy site** (for client, admin, and driver).

---

## Step 3 — Local `.env` (optional)

**frontend-admin/.env**

```env
VITE_API_URL=https://tracknow-backend.netlify.app/api
```

**frontend-client/.env** — same.

**frontend-driver/.env** — same.

Or for local API only:

```env
VITE_API_URL=http://localhost:5000/api
```

Restart `npm run dev` after changing `.env`.

---

## Step 4 — Stop Render

When login, bookings, and driver links work on Netlify:

1. Render dashboard → **tracknow-api** → **Suspend** or **Delete**
2. Remove any `onrender.com` URLs from Netlify env vars

---

## Notes

| Topic | Detail |
|--------|--------|
| Cold start | First API call after idle may take 3–10 seconds |
| Backups | `BACKUP_ENABLED=false` on Netlify (no cron on serverless) |
| Free tier timeout | 10s per request; paid plans allow longer |
| Driver / register links | Need `FRONTEND_CLIENT_URL` on API site |

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| 502 on API | Netlify → Functions → view logs; check `MONGODB_URI` |
| CORS error | Add frontend URLs to `CORS_ORIGIN` on **API** site |
| 404 on `/api/admin/user-invite` | Redeploy API from latest `main` |
| `ERR_NAME_NOT_RESOLVED` | Wrong `VITE_API_URL`; use Netlify API URL, not Render |
| Login fails after move | Use **same** `JWT_SECRET` as Render |

---

## Architecture

```
tracknow-client.netlify.app   →  farmers
tracknow-admin.netlify.app    →  admin
tracknow-driver.netlify.app   →  drivers
tracknow-backend.netlify.app  →  API (Netlify Functions)
MongoDB Atlas                 →  database
```