import { useState, useEffect } from 'react';
import { usersAPI, bookingsAPI, batchesAPI, logsAPI } from '../../../shared/api';

function Dashboard() {
  const [stats, setStats] = useState({
    users: { total: 0, active: 0, inactive: 0 },
    bookings: { total: 0, pending: 0, inTransit: 0, delivered: 0 },
    batches: { total: 0, inProduction: 0, harvested: 0, sold: 0 },
    logs: { total: 0, success: 0, failure: 0 }
  });
  const [recentActivity, setRecentActivity] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const [usersRes, bookingsRes, batchesRes, logsRes] = await Promise.all([
        usersAPI.getStats(),
        bookingsAPI.getStats(),
        batchesAPI.getStats(),
        logsAPI.getStats()
      ]);

      setStats({
        users: usersRes.data.stats,
        bookings: bookingsRes.data.stats,
        batches: batchesRes.data.stats,
        logs: logsRes.data.stats
      });
      setRecentActivity(logsRes.data.recentLogs);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="loading">Loading dashboard...</div>;
  }

  return (
    <div>
      <h1 className="page-title">Admin Dashboard</h1>
      <p style={{ color: '#666', marginBottom: '30px' }}>Overview of TrackNow system</p>

      <div className="dashboard-grid">
        <div className="stat-card">
          <h3>Total Users</h3>
          <div className="value">{stats.users.total}</div>
          <p style={{ color: '#666', marginTop: '10px' }}>
            {stats.users.active} active, {stats.users.inactive} inactive
          </p>
        </div>

        <div className="stat-card">
          <h3>Total Bookings</h3>
          <div className="value">{stats.bookings.total}</div>
          <p style={{ color: '#666', marginTop: '10px' }}>
            {stats.bookings.pending} pending, {stats.bookings.delivered} delivered
          </p>
        </div>

        <div className="stat-card">
          <h3>Total Batches</h3>
          <div className="value">{stats.batches.total}</div>
          <p style={{ color: '#666', marginTop: '10px' }}>
            {stats.batches.inProduction} in production, {stats.batches.sold} sold
          </p>
        </div>

        <div className="stat-card">
          <h3>System Logs</h3>
          <div className="value">{stats.logs.total}</div>
          <p style={{ color: '#666', marginTop: '10px' }}>
            {stats.logs.success} success, {stats.logs.failure} failures
          </p>
        </div>
      </div>

      <div style={{ marginTop: '30px' }}>
        <h2 style={{ marginBottom: '20px', color: '#333' }}>Recent Activity</h2>
        <div className="card">
          {recentActivity.length === 0 ? (
            <p style={{ color: '#666', textAlign: 'center', padding: '20px' }}>No recent activity</p>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>User</th>
                  <th>Action</th>
                  <th>Entity</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {recentActivity.map((log) => (
                  <tr key={log._id}>
                    <td>{new Date(log.timestamp).toLocaleString()}</td>
                    <td>{log.user?.name || 'System'}</td>
                    <td style={{ textTransform: 'capitalize' }}>{log.action.replace('_', ' ')}</td>
                    <td>{log.entity}</td>
                    <td>
                      <span className={`status-badge status-${log.status === 'success' ? 'active' : log.status === 'failure' ? 'inactive' : 'pending'}`}>
                        {log.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
