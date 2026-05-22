# TrackNow API on Vercel (backend only)

**Recommended setup:** host only the **API** on Vercel. Keep **client** and **admin** on **Netlify** (no change to those sites except the API URL).

| Component | Host | URL (example) |
|-----------|------|----------------|
| API | **Vercel** | `https://track-now-bay.vercel.app` |
| Client | Netlify | `https://tracknow-client.netlify.app` |
| Admin | Netlify | `https://tracknow-admin.netlify.app` |

---

## Is Vercel faster than Render?

| | Render (free) | Vercel (serverless) |
|--|---------------|---------------------|
| **Cold start** | Service **sleeps** after idle → first request slow (often 30s+) | Function cold start (often **1–5s** on Hobby) |
| **Warm requests** | Fast if instance is awake | Fast |
| **Always on** | Needs paid plan | Serverless only (no always-on on free) |
| **Database** | Same Atlas latency for both | Same |

**Practical answer:** For your app, Vercel is usually **faster than Render free** because Render spins down. After the first request warms up, both are similar; the main delay is often **MongoDB Atlas**, not the host.

If you need **zero cold starts**, use Render **paid** always-on, or Vercel Pro + tuning — not required for most TrackNow usage.

---

## Step 1 — Deploy API on Vercel

1. Push code with `backend/vercel.json` and `backend/api/index.js`.
2. [vercel.com/new](https://vercel.com/new) → Import **TrackNow** → GitHub.
3. **Project name:** `tracknow-backend`
4. **Root Directory:** `backend` ← required
5. Framework: **Express** (or **Other**)
6. **Build settings:**

| Setting | Value |
|---------|--------|
| **Build Command** | `npm run build` |
| **Output Directory** | leave **empty** (not `dist`) |
| **Install Command** | `npm install` |

If deploy fails with `Missing script: "build"`, pull latest `main` (includes a no-op `build` script in `backend/package.json`).

7. **Environment variables** (Production):

| Key | Value |
|-----|--------|
| `MONGODB_URI` | Atlas connection string (**Sensitive**) |
| `JWT_SECRET` | long random secret (**Sensitive**) |
| `NODE_ENV` | `production` |
| `BACKUP_ENABLED` | `false` |
| `FRONTEND_CLIENT_URL` | `https://tracknow-client.netlify.app` |
| `CORS_ORIGIN` | `http://localhost:5173,http://localhost:5174,https://tracknow-client.netlify.app,https://tracknow-admin.netlify.app` |

**Skip on Vercel:** `PORT` (not used). Optional: omit `BACKUP_DIR`, `BACKUP_RETENTION_MONTHS`.

8. **Deploy**
8. Test: `https://track-now-bay.vercel.app/api/health` → `"host": "vercel"`

Copy your real API base URL:

```text
https://track-now-bay.vercel.app/api
```

---

## Step 2 — Point Netlify frontends to Vercel API

Do **not** create Vercel projects for the frontends. Only update env on **existing** Netlify sites.

### Netlify — Client (`frontend-client`)

**Site configuration → Environment variables**

```env
VITE_API_URL=https://track-now-bay.vercel.app/api
```

**Deploys → Trigger deploy** (clear cache if needed).

### Netlify — Admin (`frontend-admin`)

```env
VITE_API_URL=https://track-now-bay.vercel.app/api
VITE_CLIENT_APP_URL=https://tracknow-client.netlify.app
```

(`VITE_CLIENT_APP_URL` stays on **Netlify client** URL — registration links go to the farmer app.)

Redeploy admin.

---

## Step 3 — Local development

**`frontend-client/.env`** and **`frontend-admin/.env`:**

```env
VITE_API_URL=https://track-now-bay.vercel.app/api
```

Admin also:

```env
VITE_CLIENT_APP_URL=https://tracknow-client.netlify.app
```

Restart `npm run dev`.

---

## Step 4 — Turn off old API hosts

After everything works:

- Pause **Render** service (if still running)
- Pause **Netlify API** site (`tracknow-backend` on Netlify) if you had one

Keep only **one** live API URL to avoid confusion.

---

## Verify

- [ ] `GET .../api/health` → `"host": "vercel"`
- [ ] Admin login on Netlify
- [ ] Create User → registration link → `tracknow-client.netlify.app/register/...`
- [ ] Batch Entry → driver link works
- [ ] Farmer client login / batches load

---

## Troubleshooting

### 500 `FUNCTION_INVOCATION_FAILED` on `*.vercel.app`

1. **Root Directory** must be **`backend`** (not repo root).  
   Vercel → Project → Settings → General → Root Directory → `backend` → Redeploy.

2. **Environment variables** (Production):  
   `MONGODB_URI`, `JWT_SECRET`, `NODE_ENV=production`, `BACKUP_ENABLED=false`, `CORS_ORIGIN`, `FRONTEND_CLIENT_URL`.

3. **MongoDB Atlas** → Network Access → **Allow access from anywhere** (`0.0.0.0/0`) or Vercel IPs.

4. **Logs:** Vercel → Project → **Logs** (or Deployments → failed deploy → Function logs).  
   Look for `MONGODB_URI`, `Cannot find module`, or `connect ECONNREFUSED`.

5. Test after fix:  
   `https://YOUR-PROJECT.vercel.app/api/health` → `"host": "vercel"`.

| Issue | Fix |
|-------|-----|
| CORS | `CORS_ORIGIN` must include both Netlify frontend URLs exactly |
| 404 on `/api/...` | Vercel Root Directory = `backend` |
| Still hits Render/Netlify API | Rebuild Netlify frontends after changing `VITE_API_URL` |
| Slow first request | Normal cold start; retry — should be faster than Render free sleep |
| MongoDB error | Atlas Network Access; check `MONGODB_URI` |

---

## Optional: frontends on Vercel later

If you ever move client/admin to Vercel too, see the appendix in git history or add second projects with root `frontend-client` / `frontend-admin`. **Not required** for your current plan.

---

## Files used (backend only)

```text
backend/api/index.js
backend/vercel.json
```

Netlify `netlify.toml` in frontends stays as-is; only **environment variables** change to the Vercel API URL.
