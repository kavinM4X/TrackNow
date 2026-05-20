# TrackNow - Sericulture Management System

A comprehensive full-stack MERN application for managing silk production, bookings, market rates, and vehicle tracking with separate client and admin interfaces.

---

## 🌟 Features

### 👨‍🌾 Client Application (Farmers/Users)

- Dashboard Overview
- Booking Management
- Batch Tracking
- Live Market Rates
- Vehicle Live Tracking
- Profile Management

### 🛠️ Admin Application

- Admin Dashboard
- User Management
- Booking Monitoring
- Batch Management
- Market Rate Management
- GPS/RFID Tracker Configuration
- System Activity Logs

---

## 🏗️ Project Structure

```bash
trackNow/
│
├── backend/
│   ├── models/
│   ├── controllers/
│   ├── routes/
│   ├── middleware/
│   ├── config/
│   ├── server.js
│   └── .env
│
├── frontend-client/
│   ├── src/
│   ├── index.html
│   ├── vite.config.js
│   └── package.json
│
├── frontend-admin/
│   ├── src/
│   ├── index.html
│   ├── vite.config.js
│   └── package.json
│
├── shared/
│   └── api.js
│
├── package.json
└── README.md
```

---

## 🛠️ Tech Stack

### Backend
- Node.js
- Express.js
- MongoDB
- Mongoose
- JWT Authentication
- bcryptjs
- CORS

### Frontend
- React 18
- Vite
- React Router
- Axios
- CSS Modules

### Admin Dashboard
- Recharts

---

## 📋 Prerequisites

Before running the project, make sure you have:

- Node.js v16+
- MongoDB Installed
- npm or yarn

---

## 🚀 Installation

### 1️⃣ Clone Repository

```bash
git clone https://github.com/kavinM4X/TrackNow.git
cd TrackNow
```

### 2️⃣ Install Dependencies

```bash
npm run install:all
```

---

## ⚙️ Environment Variables

### Backend `.env`

```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/tracknow
JWT_SECRET=your_secret_key
NODE_ENV=development
```

### Frontend `.env`

```env
VITE_API_URL=http://localhost:5000/api
```

---

## ▶️ Run Application

### Run All Services

```bash
npm run dev
```

### Individual Services

```bash
npm run dev:backend
npm run dev:client
npm run dev:admin
```

---

## 🌐 Application URLs

| Service | URL |
|---|---|
| Backend API | http://localhost:5000 |
| Client Frontend | http://localhost:5173 |
| Admin Frontend | http://localhost:5174 |

---

## 🔐 Authentication

- JWT Based Authentication
- Role Based Access Control
- Protected Routes
- Admin Authorization

---

## 🗄️ Database Collections

- users
- bookings
- batches
- marketrates
- trackerconfigs
- logs

---

## 📡 API Endpoints

### Authentication

```http
POST /api/auth/register
POST /api/auth/login
GET  /api/auth/me
```

### Bookings

```http
GET    /api/bookings
POST   /api/bookings
PUT    /api/bookings/:id
DELETE /api/bookings/:id
```

### Batches

```http
GET    /api/batches
POST   /api/batches
PUT    /api/batches/:id
DELETE /api/batches/:id
```

---

## 📦 Build for Production

```bash
npm run build:client
npm run build:admin
```

---

## 🚨 Troubleshooting

### MongoDB Connection Error

- Ensure MongoDB is running
- Check `.env` configuration
- Verify MongoDB URI

### CORS Error

- Verify backend CORS settings
- Check frontend API URL

---

## 👨‍💻 Author

**Kavin**

GitHub:
https://github.com/kavinM4X

---

## 📄 License

ISC License

---

# 🚀 TrackNow

Empowering Sericulture Management with Technology
