# Deploy TrackNow frontends on Netlify (2 separate sites)

Backend can stay on **Render** or move to **Netlify Functions** — see `DEPLOY_NETLIFY_API.md`.  
You will create **two Netlify sites** from the same GitHub repo.

| App | Netlify base directory | Example URL |
|-----|------------------------|-------------|
| **Client** (farmers) | `frontend-client` | `https://tracknow-client.netlify.app` |
| **Admin** | `frontend-admin` | `https://tracknow-admin.netlify.app` |

---

## 1. Update Render CORS (required)

In [Render Dashboard](https://dashboard.render.com) → **tracknow-api** → **Environment**:

```env
CORS_ORIGIN=https://YOUR-CLIENT-SITE.netlify.app,https://YOUR-ADMIN-SITE.netlify.app
```

Use your real Netlify URLs after you create the sites (no trailing slash).  
Keep `http://localhost:5173,http://localhost:5174` if you still develop locally:

```env
CORS_ORIGIN=http://localhost:5173,http://localhost:5174,https://tracknow-client.netlify.app,https://tracknow-admin.netlify.app
```

Save → wait for redeploy.

---

## 2. Push code to GitHub

Ensure latest code is on `main` (includes `netlify.toml` in each frontend folder).

---

## 3. Create Netlify site — Client app

1. Go to [https://app.netlify.com](https://app.netlify.com) → **Add new site** → **Import an existing project**
2. Connect **GitHub** → select **TrackNow** repo
3. Settings:

| Setting | Value |
|---------|--------|
| **Branch** | `main` |
| **Base directory** | `frontend-client` |
| **Build command** | `npm run build` (auto from `netlify.toml`) |
| **Publish directory** | `frontend-client/dist` or `dist` (relative to base) |

4. **Environment variables** (Site settings → Environment variables):

| Key | Value |
|-----|--------|
| `VITE_API_URL` | `https://tracknow-h0h3.onrender.com/api` |

5. **Deploy site**

6. Copy the live URL (e.g. `https://random-name.netlify.app`) → optional: **Domain settings** → rename to `tracknow-client`

---

## 4. Create Netlify site — Admin app

1. **Add new site** again (second site, same repo)
2. Settings:

| Setting | Value |
|---------|--------|
| **Branch** | `main` |
| **Base directory** | `frontend-admin` |
| **Build command** | `npm run build` |
| **Publish directory** | `dist` |

3. **Environment variables**:

| Key | Value |
|-----|--------|
| `VITE_API_URL` | `https://tracknow-h0h3.onrender.com/api` |

4. Deploy → rename site (e.g. `tracknow-admin`)

---

## 5. Verify

**Client site**

- Open client URL → login page loads
- Login as farmer → dashboard works
- Network tab: API calls go to `https://tracknow-h0h3.onrender.com/api` (not localhost)

**Admin site**

- Open admin URL → `/admin/login`
- Login as admin → dashboard works

If you see **CORS error** in browser console → fix `CORS_ORIGIN` on Render (step 1).

If **blank page on refresh** → `public/_redirects` and `netlify.toml` handle SPA routing (already in repo).

---

## 6. Change API URL later

If Render URL changes, update `VITE_API_URL` on **both** Netlify sites → **Trigger deploy** → **Deploy site**.

---

## Local build test (optional)

```bash
cd frontend-client
npm install
npm run build

cd ../frontend-admin
npm install
npm run build
```

---

## Summary

```
GitHub (TrackNow)
    ├── frontend-client  →  Netlify Site 1  →  Farmers
    ├── frontend-admin   →  Netlify Site 2  →  Admin
    └── backend          →  Render         →  API
```
