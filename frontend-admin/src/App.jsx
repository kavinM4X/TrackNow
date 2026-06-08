import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import api, { getStoredUser, clearSession, setSession, getToken } from './api/client';
import AdminLogin from './pages/admin/AdminLogin';
import AdminDashboard from './pages/admin/AdminDashboard';
import Users from './pages/admin/Users';
import CreateUser from './pages/admin/CreateUser';
import EditUser from './pages/admin/EditUser';
import MarketRates from './pages/admin/MarketRates';
import UpdateMarketRate from './pages/admin/UpdateMarketRate';
import Bookings from './pages/admin/Bookings';
import BookingDetail from './pages/admin/BookingDetail';
import BatchEntry from './pages/admin/BatchEntry';
import BatchEntryManual from './pages/admin/BatchEntryManual';
import VehicleRentalResults from './pages/admin/VehicleRentalResults';
import AllBatchHistory from './pages/admin/AllBatchHistory';
import PerUserBatchHistory from './pages/admin/PerUserBatchHistory';
import TrackerControl from './pages/admin/TrackerControl';
import Logs from './pages/admin/Logs';
import DriverDashboard from './pages/driver/DriverDashboard';
import Vehicles from './pages/driver/Vehicles';
import VehicleForm from './pages/driver/VehicleForm';
import AddAdvance from './pages/driver/AddAdvance';
import Ledger from './pages/driver/Ledger';
import VehicleExpenses from './pages/driver/VehicleExpenses';
import Entries from './pages/driver/Entries';
import Parties from './pages/driver/Parties';
import PartyForm from './pages/driver/PartyForm';
import Reports from './pages/driver/Reports';
import RateSettings from './pages/driver/RateSettings';
import './styles/tracknow.css';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = getToken();
    const stored = getStoredUser();
    if (!token || stored?.role !== 'admin') {
      clearSession();
      setLoading(false);
      return;
    }
    api
      .get('/auth/me')
      .then((res) => {
        const u = res.data?.user;
        if (u?.role === 'admin') {
          setSession(token, u);
          setUser(u);
        } else {
          clearSession();
        }
      })
      .catch(() => clearSession())
      .finally(() => setLoading(false));
  }, []);

  const handleLogin = (_t, u) => setUser(u);
  const handleLogout = () => {
    clearSession();
    setUser(null);
  };

  if (loading) {
    return <div className="app-loading">Loading…</div>;
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/admin/login"
          element={
            user ? (
              <Navigate to="/admin/dashboard" replace />
            ) : (
              <AdminLogin onLogin={handleLogin} />
            )
          }
        />
        {user ? (
          <>
            <Route path="/" element={<Navigate to="/admin/dashboard" replace />} />
            <Route path="/admin/dashboard" element={<AdminDashboard onLogout={handleLogout} />} />
            <Route path="/admin/users" element={<Users />} />
            <Route path="/admin/users/create" element={<CreateUser />} />
            <Route path="/admin/users/:userId/edit" element={<EditUser />} />
            <Route path="/admin/bookings" element={<Bookings />} />
            <Route path="/admin/bookings/:bookingId" element={<BookingDetail />} />
            <Route path="/admin/market-rates" element={<MarketRates />} />
            <Route path="/admin/market-rates/update" element={<UpdateMarketRate />} />
            <Route path="/admin/batch-entry" element={<BatchEntry />} />
            <Route path="/admin/batch-entry/manual" element={<BatchEntryManual />} />
            <Route path="/admin/vehicle-rental/:sessionId" element={<VehicleRentalResults />} />
            <Route path="/admin/batch-history" element={<AllBatchHistory />} />
            <Route path="/admin/batch-history/user/:userId" element={<PerUserBatchHistory />} />
            <Route path="/admin/tracker-control" element={<TrackerControl />} />
            <Route path="/admin/logs" element={<Logs />} />
            <Route path="/admin/driver/dashboard" element={<DriverDashboard />} />
            <Route path="/admin/driver/vehicles" element={<Vehicles />} />
            <Route path="/admin/driver/vehicles/new" element={<VehicleForm />} />
            <Route path="/admin/driver/vehicles/:id/edit" element={<VehicleForm />} />
            <Route path="/admin/driver/vehicles/:id/advance" element={<AddAdvance />} />
            <Route path="/admin/driver/vehicles/:id/ledger" element={<Ledger />} />
            <Route path="/admin/driver/vehicles/:id/expenses" element={<VehicleExpenses />} />
            <Route path="/admin/driver/entries" element={<Entries />} />
            <Route path="/admin/driver/parties" element={<Parties />} />
            <Route path="/admin/driver/parties/new" element={<PartyForm />} />
            <Route path="/admin/driver/parties/:id/edit" element={<PartyForm />} />
            <Route path="/admin/driver/reports" element={<Reports />} />
            <Route path="/admin/driver/rates" element={<RateSettings />} />
            <Route path="*" element={<Navigate to="/admin/dashboard" replace />} />
          </>
        ) : (
          <Route path="*" element={<Navigate to="/admin/login" replace />} />
        )}
      </Routes>
    </BrowserRouter>
  );
}

export default App;
