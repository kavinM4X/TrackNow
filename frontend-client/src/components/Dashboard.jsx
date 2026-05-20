import { useState, useEffect } from 'react';
import axios from 'axios';
import './Dashboard.css';

function Dashboard({ user }) {
  const [marketRate, setMarketRate] = useState(null);
  const [upcomingBooking, setUpcomingBooking] = useState(null);
  const [recentBatches, setRecentBatches] = useState([]);
  const [stats, setStats] = useState({ totalBatches: 0, totalKg: 0 });
  const [loading, setLoading] = useState(true);
  const [showReminder, setShowReminder] = useState(false);

  const token = localStorage.getItem('silktrack_token');

  useEffect(() => {
    fetchDashboardData();
    
    // Auto-refresh market rates every 5 minutes
    const interval = setInterval(() => {
      fetchMarketRates();
    }, 5 * 60 * 1000);

    // Show reminder popup after 3 seconds
    const timer = setTimeout(() => {
      setShowReminder(true);
    }, 3000);

    return () => {
      clearInterval(interval);
      clearTimeout(timer);
    };
  }, []);

  const fetchDashboardData = async () => {
    try {
      const [rateRes, bookingsRes, batchesRes] = await Promise.all([
        axios.get('/api/market-rates/latest', {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get('/api/bookings/my', {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get('/api/batches/my', {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);

      setMarketRate(rateRes.data);
      
      // Get first pending booking as upcoming
      const pending = bookingsRes.data.find(b => b.status === 'pending');
      setUpcomingBooking(pending || bookingsRes.data[0] || null);
      
      // Get last 2 batches
      setRecentBatches(batchesRes.data.slice(0, 2));
      
      // Calculate stats
      const totalBatches = batchesRes.data.length;
      const totalKg = batchesRes.data.reduce((sum, b) => sum + (b.quantityKg || 0), 0);
      setStats({ totalBatches, totalKg });
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMarketRates = async () => {
    try {
      const res = await axios.get('/api/market-rates/latest', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMarketRate(res.data);
    } catch (error) {
      console.error('Error fetching market rates:', error);
    }
  };

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
  };

  if (loading) {
    return <div className="loading">Loading dashboard...</div>;
  }

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h1 className="dashboard-title">Dashboard</h1>
        <p className="dashboard-subtitle">Welcome back, {user.name}!</p>
      </div>

      {showReminder && (
        <div className="reminder-popup">
          <h4>🔔 Reminder</h4>
          <p>Don't forget to check your upcoming bookings and update your batch status!</p>
          <button className="close-btn" onClick={() => setShowReminder(false)}>
            Dismiss
          </button>
        </div>
      )}

      {/* Live Market Rate Block */}
      {marketRate && (
        <div className="market-rate-card">
          <div className="market-rate-header">
            <span className="live-indicator">● Live</span>
            <span className="market-rate-date">Today · {formatDate(marketRate.date)}</span>
          </div>
          <div className="market-rate-grid">
            <div className="rate-item">
              <span className="rate-label">Coimbatore</span>
              <span className="rate-value">₹{marketRate.coimbatore}</span>
            </div>
            <div className="rate-item">
              <span className="rate-label">Mamballi</span>
              <span className="rate-value">₹{marketRate.mamballi}</span>
            </div>
            <div className="rate-item">
              <span className="rate-label">Ramnagar</span>
              <span className="rate-value">₹{marketRate.ramnagar}</span>
            </div>
            <div className="rate-item">
              <span className="rate-label">Dharmapuri</span>
              <span className="rate-value">₹{marketRate.dharmapuri}</span>
            </div>
          </div>
          <div className="market-rate-footer">
            Top: ₹{marketRate.topRate} ({marketRate.topMarket}) | Min Avg: ₹{marketRate.minAvg}
          </div>
        </div>
      )}

      {/* Upcoming Booking Card */}
      {upcomingBooking && (
        <div className="upcoming-booking-card">
          <h3>Upcoming Booking</h3>
          <div className="booking-details">
            <div className="booking-detail">
              <span className="label">Date:</span>
              <span className="value">{formatDate(upcomingBooking.date)}</span>
            </div>
            <div className="booking-detail">
              <span className="label">Location:</span>
              <span className="value">{upcomingBooking.location}</span>
            </div>
            <div className="booking-detail">
              <span className="label">Quantity:</span>
              <span className="value">{upcomingBooking.quantityKg} kg</span>
            </div>
            <div className="booking-detail">
              <span className="label">Status:</span>
              <span className={`status-badge status-${upcomingBooking.status}`}>
                {upcomingBooking.status}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Last 2 Batches Mini Cards */}
      <div className="recent-batches-section">
        <h3>Recent Batches</h3>
        <div className="recent-batches-grid">
          {recentBatches.map((batch) => (
            <div key={batch._id} className="batch-mini-card">
              <div className="batch-date">{formatDate(batch.date)}</div>
              <div className="batch-quantity">{batch.quantityKg} kg</div>
              <div className="batch-location">{batch.location || 'N/A'}</div>
            </div>
          ))}
          {recentBatches.length === 0 && (
            <p className="no-data">No batches yet</p>
          )}
        </div>
      </div>

      {/* Stats Row */}
      <div className="stats-row">
        <div className="stat-item">
          <div className="stat-value">{stats.totalBatches}</div>
          <div className="stat-label">Total Batches</div>
        </div>
        <div className="stat-item">
          <div className="stat-value">{stats.totalKg}</div>
          <div className="stat-label">Total kg</div>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
