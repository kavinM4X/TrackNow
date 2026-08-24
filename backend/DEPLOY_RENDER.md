# Deploy TrackNow backend on Render

## 1. MongoDB Atlas (before Render)

1. Atlas → **Network Access** → **Add IP Address** → **Allow Access from Anywhere** (`0.0.0.0/0`)  
   (Render uses dynamic IPs; required for cloud hosting.)
2. Use database **`Tracknow`** in your connection string (match your Atlas DB name).
3. Copy `MONGODB_URI` from Atlas → Connect → Drivers.

Example:

```env
MONGODB_URI=mongodb+srv://tracknowapp:PASSWORD@cluster0.xxxxx.mongodb.net/Tracknow?retryWrites=true&w=majority
```

---

## 2. Push code to GitHub

Ensure latest code is on GitHub (`main` branch).

---

## 3. Create Web Service on Render

1. Go to [https://dashboard.render.com](https://dashboard.render.com)
2. **New +** → **Web Service**
3. Connect repository **TrackNow** (GitHub)
4. Settings:

| Field | Value |
|--------|--------|
| **Name** | `tracknow-api` |
| **Root Directory** | `backend` |
| **Runtime** | Node |
| **Build Command** | `npm install` |
| **Start Command** | `npm start` |
| **Plan** | Free (or paid) |

---

## 4. Environment variables (Render → Environment)

Add these in the Render dashboard:

| Key | Value |
|-----|--------|
| `NODE_ENV` | `production` |
| `MONGODB_URI` | Your full Atlas URI (database `Tracknow`) |
| `JWT_SECRET` | Long random string (32+ chars) |
| `CORS_ORIGIN` | Your frontend URLs, comma-separated (when hosted), e.g. `https://your-admin.onrender.com,https://your-client.onrender.com` |
| `BACKUP_ENABLED` | `false` (Render disk is ephemeral; use Atlas backup instead) |

Do **not** paste secrets in `render.yaml` or commit `.env`.

---

## 5. Deploy

Click **Create Web Service**. Wait for build → **Live**.

Your API URL will be like:

```text
https://tracknow-api.onrender.com
```

Test:

```text
https://tracknow-api.onrender.com/api/health
```

Should return: `{"status":"OK","message":"TrackNow API is running"}`

---

## 6. Seed admin on Atlas (once)

From your PC (with `.env` pointing to same Atlas DB):

```bash
cd backend
node seedAdmin.js
```

Admin login: phone `9999999999`, password `admin123`

---

## 7. Point frontends to Render API

When you host admin/client, set:

**frontend-admin/.env**

```env
VITE_API_URL=https://tracknow-api.onrender.com/api
```

**frontend-client/.env**

```env
VITE_API_URL=https://tracknow-api.onrender.com/api
```

Update `src/api/client.js` to use `import.meta.env.VITE_API_URL || '/api'` as `baseURL`.

---

## Free tier notes

- Service **spins down** after ~15 min idle; first request may take 30–60s.
- Use **Starter** plan for always-on production.
