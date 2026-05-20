# TrackNow - Sericulture Management System

A comprehensive full-stack MERN application for managing silk production, bookings, market rates, and vehicle tracking with separate client and admin interfaces.

## 🌟 Features

### Client Application (Farmers/Users)
- **Dashboard**: Overview of bookings, batches, and market rates
- **Bookings Management**: Create, view, and manage silk shipment bookings
- **Batch Management**: Track silk production batches from production to sale
- **Market Rates**: View live silk market rates and trends
- **Live Tracking**: Enable and track vehicle shipments in real-time
- **Profile Management**: Update personal information and farm details

### Admin Application
- **Dashboard**: System-wide analytics and recent activity
- **User Management**: Create, edit, disable users, and reset passwords
- **Bookings Management**: View and manage all bookings, update status
- **Batch Management**: Monitor and manage all production batches
- **Market Rates**: Add, update, and manage silk market rates
- **Tracker Management**: Configure GPS/RFID tracking devices
- **System Logs**: View and audit all system activities

## 🏗️ Project Structure

```
trackNow/
├── backend/                 # Express.js API Server
│   ├── models/             # MongoDB Mongoose Models
│   │   ├── User.js
│   │   ├── Booking.js
│   │   ├── Batch.js
│   │   ├── MarketRate.js
│   │   ├── TrackerConfig.js
│   │   └── Log.js
│   ├── controllers/        # API Controllers
│   ├── routes/            # API Routes
│   ├── middleware/        # Authentication Middleware
│   ├── config/            # Configuration Files
│   ├── server.js          # Express Server Entry
│   └── .env               # Environment Variables
├── frontend-client/       # Client React App (Port 5173)
│   ├── src/
│   │   ├── components/    # React Components
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── index.html
│   ├── vite.config.js
│   └── package.json
├── frontend-admin/        # Admin React App (Port 5174)
│   ├── src/
│   │   ├── components/    # Admin Components
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── index.html
│   ├── vite.config.js
│   └── package.json
├── shared/                # Shared Utilities
│   └── api.js            # Shared API Layer
├── package.json          # Root Package.json
└── README.md
```

## 🛠️ Tech Stack

### Backend
- **Node.js** - Runtime environment
- **Express.js** - Web framework
- **MongoDB** - Database
- **Mongoose** - ODM for MongoDB
- **JWT** - Authentication
- **bcryptjs** - Password hashing
- **CORS** - Cross-origin resource sharing

### Frontend (Both)
- **React 18** - UI library
- **Vite** - Build tool
- **React Router** - Routing
- **Axios** - HTTP client
- **CSS Modules** - Styling

### Admin Frontend Additional
- **Recharts** - Data visualization

## 📋 Prerequisites

- Node.js (v16 or higher)
- MongoDB (installed and running)
- npm or yarn

## 🚀 Installation & Setup

### 1. Clone the Repository

```bash
git clone <repository-url>
cd trackNow
```

### 2. Install Dependencies

Install all dependencies for backend and both frontends:

```bash
npm run install:all
```

Or install separately:

```bash
# Backend
cd backend
npm install

# Client Frontend
cd ../frontend-client
npm install

# Admin Frontend
cd ../frontend-admin
npm install
```

### 3. Configure Environment Variables

#### Backend (`backend/.env`)
```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/tracknow
JWT_SECRET=your_jwt_secret_key_change_this_in_production
NODE_ENV=development
```

#### Client Frontend (`frontend-client/.env`)
```env
VITE_API_URL=http://localhost:5000/api
```

#### Admin Frontend (`frontend-admin/.env`)
```env
VITE_API_URL=http://localhost:5000/api
```

**Important**: Change the `JWT_SECRET` to a secure random string in production!

### 4. Start MongoDB

Make sure MongoDB is running on your system:

```bash
# On Windows
net start MongoDB

# On Mac/Linux
sudo systemctl start mongod
# or
mongod
```

### 5. Run the Application

#### Development Mode (All Services)

```bash
npm run dev
```

This will start:
- Backend API on http://localhost:5000
- Client Frontend on http://localhost:5173
- Admin Frontend on http://localhost:5174

#### Individual Services

```bash
# Backend only
npm run dev:backend

# Client only
npm run dev:client

# Admin only
npm run dev:admin
```

## 👤 Default Admin User

To access the admin panel, you need to create an admin user. You can do this via the API or by manually inserting into the database:

**Option 1: Via API (using Postman/curl)**
```bash
POST http://localhost:5000/api/auth/register
{
  "name": "Admin User",
  "email": "admin@tracknow.com",
  "password": "admin123",
  "role": "admin"
}
```

**Option 2: Via MongoDB Shell**
```javascript
use tracknow
db.users.insertOne({
  name: "Admin User",
  email: "admin@tracknow.com",
  password: "$2a$10$hashed_password_here", // Use bcrypt to hash
  role: "admin",
  isActive: true,
  createdAt: new Date()
})
```

## 📱 Usage

### Client Application

1. Navigate to http://localhost:5173
2. Register a new account or login
3. Access dashboard, create bookings, manage batches, view market rates
4. Enable tracking for shipments to monitor in real-time

### Admin Application

1. Navigate to http://localhost:5174
2. Login with admin credentials
3. Manage users, view analytics, update market rates
4. Configure tracking devices and monitor system logs

## 🔐 Authentication

- JWT-based authentication
- Role-based access control (user/admin)
- Protected routes for authenticated users
- Admin-only endpoints for sensitive operations

## 🗄️ Database Collections

- **users**: User accounts and profiles
- **bookings**: Shipment bookings
- **batches**: Silk production batches
- **marketrates**: Market rate data
- **trackerconfigs**: GPS/RFID tracker configurations
- **logs**: System activity logs

## 🌐 API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user
- `PUT /api/auth/profile` - Update profile
- `PUT /api/auth/change-password` - Change password

### Users (Admin Only)
- `GET /api/users` - Get all users
- `POST /api/users` - Create user
- `PUT /api/users/:id` - Update user
- `DELETE /api/users/:id` - Delete user
- `PUT /api/users/:id/reset-password` - Reset password

### Bookings
- `GET /api/bookings` - Get bookings
- `POST /api/bookings` - Create booking
- `PUT /api/bookings/:id` - Update booking
- `DELETE /api/bookings/:id` - Delete booking

### Batches
- `GET /api/batches` - Get batches
- `POST /api/batches` - Create batch
- `PUT /api/batches/:id` - Update batch
- `DELETE /api/batches/:id` - Delete batch

### Market Rates
- `GET /api/marketrates` - Get market rates
- `GET /api/marketrates/latest` - Get latest rates
- `POST /api/marketrates` - Create rate (Admin)
- `PUT /api/marketrates/:id` - Update rate (Admin)

### Trackers
- `GET /api/tracker` - Get trackers (Admin)
- `POST /api/tracker` - Create tracker (Admin)
- `PUT /api/tracker/:id/location` - Update location

### Logs (Admin Only)
- `GET /api/logs` - Get system logs
- `POST /api/logs/clear` - Clear old logs

## 🧪 Testing

```bash
# Run backend tests (if configured)
cd backend
npm test

# Run frontend tests (if configured)
cd frontend-client
npm test
```

## 📦 Build for Production

```bash
# Build client frontend
npm run build:client

# Build admin frontend
npm run build:admin

# Start backend in production
cd backend
npm start
```

## 🔧 Configuration

### Port Configuration
- Backend: 5000
- Client Frontend: 5173
- Admin Frontend: 5174

### MongoDB Connection
Update `MONGODB_URI` in `backend/.env` to match your MongoDB setup.

## 🚨 Troubleshooting

### MongoDB Connection Error
- Ensure MongoDB is running
- Check connection string in `.env`
- Verify MongoDB is accessible on the specified port

### CORS Errors
- Check backend CORS configuration
- Verify frontend API URL in `.env`

### Authentication Issues
- Clear browser localStorage
- Verify JWT_SECRET is set correctly
- Check token expiration

## 📝 License

ISC

## 👥 Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Open a Pull Request

## 📧 Support

For support and questions, please open an issue in the repository.

---

**TrackNow** - Empowering Sericulture Management with Technology
#   T r a c k N o w  
 