# Use TrackNow on Android (mobile)

Your apps are **web apps** hosted on Netlify. On Android you install them like apps — **no Play Store required** for farmers and staff.

You get **two separate home-screen apps**:

| App | Netlify site | Who uses it |
|-----|----------------|-------------|
| **TrackNow** (client) | `tracknow-client` URL | Farmers |
| **TrackNow Admin** | `tracknow-admin` URL | Office / admin |

---

## 1. Deploy latest code

After PWA files are pushed, **redeploy both Netlify sites** (or wait for auto-deploy from `main`).

---

## 2. Install on Android — Client (farmers)

1. On the phone, open **Chrome**.
2. Go to your **client** Netlify URL (e.g. `https://tracknow-client.netlify.app`).
3. Log in once to confirm it works.
4. Install:
   - **Chrome menu (⋮)** → **Install app** or **Add to Home screen**,  
   - or accept the **“Install TrackNow”** banner if shown.
5. Open **TrackNow** from the home screen — it runs full screen like an app.

**Tip:** Send farmers the client URL by WhatsApp; they only need to install once.

---

## 3. Install on Android — Admin

1. Chrome → **admin** Netlify URL (e.g. `https://tracknow-admin.netlify.app`).
2. **Menu** → **Install app** / **Add to Home screen**.
3. Home screen icon: **TrackNow Admin**.

---

## 4. Requirements

| Requirement | Notes |
|-------------|--------|
| **HTTPS** | Netlify provides this |
| **Internet** | App talks to Render API; offline mode is not supported |
| **CORS** | Render `CORS_ORIGIN` must include both Netlify URLs |
| **Chrome** | Best install experience; Samsung Internet also supports “Add page to” |

---

## 5. Regenerate icons (optional)

512px icon for Play Store–quality install prompt:

```bash
cd backend
npm install sharp
cd ..
node scripts/generate-app-icons.js
```

Then commit `favicon-512.png` in both `public/` folders and redeploy.

---

## 6. Play Store later (optional)

If you need apps on **Google Play**:

1. **Bubblewrap / TWA** — wrap your Netlify URL in a thin Android app (good for client-only).
2. **Capacitor** — package the built `dist` folder; more control, more setup.

For most sericulture use cases, **Install app from Chrome** is enough.

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| No “Install app” menu | Use Chrome; visit site twice; check HTTPS URL |
| Login fails on phone | Update Render `CORS_ORIGIN` with Netlify URLs |
| White screen after install | Redeploy Netlify; clear Chrome site data and reinstall |
| Wrong app opens | Client and admin are **two URLs** — install each separately |
