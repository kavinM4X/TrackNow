# Deploy TrackNow API on Netlify (replace Render)

The backend runs as a **Netlify Function** (serverless Express), not a 24/7 server like Render.

**MongoDB stays on Atlas** — only the API host moves to Netlify.

---

## Before you switch

| Topic | Notes |
|--------|--------|
| **Cold starts** | First request after idle can take a few seconds |
| **Timeout** | 26s max per request (Pro); free tier is shorter |
| **Backups** | Set `BACKUP_ENABLED=false` — cron does not run on serverless |
| **Atlas IP** | Allow `0.0.0.0/0` (or Netlify’s ranges) in Network Access |

---

## 1. Create Netlify site — API

1. [app.netlify.com](https://app.netlify.com) → **Add new project** → GitHub → **TrackNow**
2. Settings:

| Field | Value |
|--------|--------|
| **Project name** | `tracknow-api` |
| **Base directory** | `backend` |
| **Build command** | `npm install` |
| **Publish directory** | `public` |
| **Functions directory** | `netlify/functions` (auto from `netlify.toml`) |

3. **Environment variables** (copy from Render):

| Key | Value |
|-----|--------|
| `MONGODB_URI` | Your Atlas connection string |
| `JWT_SECRET` | Same secret as Render (or new — users must re-login) |
| `NODE_ENV` | `production` |
| `BACKUP_ENABLED` | `false` |
| `CORS_ORIGIN` | Your two frontend Netlify URLs + localhost |

Example:

```text
CORS_ORIGIN=http://localhost:5173,http://localhost:5174,https://tracknow-client.netlify.app,https://tracknow-admin.netlify.app
```

4. **Deploy** → copy site URL, e.g. `https://tracknow-api.netlify.app`

5. Test: open `https://tracknow-api.netlify.app/api/health` → should return JSON `{ status: "OK" }`

---

## 2. Point frontends to Netlify API

On **both** Netlify frontend sites → **Environment variables**:

| Key | Value |
|-----|--------|
| `VITE_API_URL` | `https://tracknow-api.netlify.app/api` |

Use your real API hostname. **Trigger deploy** on client and admin.

Update local `.env` files the same way if you test against production.

---

## 3. Turn off Render (optional)

After everything works:

1. Stop or delete the Render web service (saves free-tier usage).
2. Remove old `VITE_API_URL` pointing to `onrender.com`.

---

## 4. Local development (unchanged)

```bash
cd backend
npm start
```

Runs normal Express on port 5000 (not serverless).

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| 502 / function crash | Check Netlify **Functions** log; verify `MONGODB_URI` |
| CORS error | Add frontend URLs to `CORS_ORIGIN` on API site |
| Login worked on Render, fails now | Same `JWT_SECRET` on Netlify API |
| Slow first request | Normal cold start on serverless |

---

## Architecture (all Netlify)

```
frontend-client  →  Netlify
frontend-admin   →  Netlify
backend          →  Netlify Functions (this guide)
MongoDB          →  Atlas
```
