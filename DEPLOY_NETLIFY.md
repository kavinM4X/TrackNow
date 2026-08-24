# Deploy TrackNow frontends on Netlify (3 separate sites)

Backend is hosted on **Netlify Functions** — see `DEPLOY_NETLIFY_API.md`.  
You will create **three Netlify sites** from the same GitHub repo.

| App | Netlify base directory | Example URL |
|-----|------------------------|-------------|
| **Client** (farmers) | `frontend-client` | `https://tracknow-client.netlify.app` |
| **Admin** | `frontend-admin` | `https://tracknow-admin.netlify.app` |
| **Driver** | `frontend-driver` | `https://tracknow-driver.netlify.app` |

---

## 1. Update Backend CORS (required)

In the Netlify dashboard for your API site (**tracknow-backend**) under **Site configuration** → **Environment variables**:

```env
CORS_ORIGIN=http://localhost:5173,http://localhost:5174,http://localhost:5175,https://tracknow-client.netlify.app,https://tracknow-admin.netlify.app,https://tracknow-driver.netlify.app
```

Use your real Netlify URLs (no trailing slash).  
Save → trigger deploy of the API site if needed.

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
| **Publish directory** | `dist` (relative to base) |

4. **Environment variables** (Site settings → Environment variables):

| Key | Value |
|-----|--------|
| `VITE_API_URL` | `https://tracknow-backend.netlify.app/api` |

5. **Deploy site**
6. Copy the live URL (e.g. `https://tracknow-client.netlify.app`)

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
| `VITE_API_URL` | `https://tracknow-backend.netlify.app/api` |

4. Deploy → rename site (e.g. `tracknow-admin`)

---

## 5. Create Netlify site — Driver app

1. **Add new site** again (third site, same repo)
2. Settings:

| Setting | Value |
|---------|--------|
| **Branch** | `main` |
| **Base directory** | `frontend-driver` |
| **Build command** | `npm run build` |
| **Publish directory** | `dist` |

3. **Environment variables**:

| Key | Value |
|-----|--------|
| `VITE_API_URL` | `https://tracknow-backend.netlify.app/api` |

4. Deploy → rename site (e.g. `tracknow-driver`)

---

## 6. Verify

**Client site**
- Open client URL → login page loads
- Login as farmer → dashboard works

**Admin site**
- Open admin URL → `/admin/login`
- Login as admin → dashboard works

**Driver site**
- Open driver URL (e.g. via invite links generated from admin) → driver forms load

If you see **CORS error** in browser console → fix `CORS_ORIGIN` on the API site (step 1).

---

## 7. Change API URL later

If API URL changes, update `VITE_API_URL` on all Netlify sites → **Trigger deploy** → **Deploy site**.

---

## Local build test (optional)

```bash
cd frontend-client
npm install
npm run build

cd ../frontend-admin
npm install
npm run build

cd ../frontend-driver
npm install
npm run build
```

---

## Summary

```
GitHub (TrackNow)
    ├── frontend-client  →  Netlify Site 1  →  Farmers
    ├── frontend-admin   →  Netlify Site 2  →  Admin
    ├── frontend-driver  →  Netlify Site 3  →  Drivers
    └── backend          →  Netlify Site 4  →  API (Functions)
```
