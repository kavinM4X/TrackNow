import { useState, useEffect } from 'react';
import { logsAPI } from '../../../shared/api';

function Logs() {
  const [logs, setLogs] = useState([]);
  const [stats, setStats] = useState({ total: 0, success: 0, failure: 0, warning: 0 });
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ action: '', entity: '', status: '', startDate: '', endDate: '' });

  useEffect(() => {
    fetchLogs();
    fetchStats();
  }, [filters]);

  const fetchLogs = async () => {
    try {
      const params = {};
      if (filters.action) params.action = filters.action;
      if (filters.entity) params.entity = filters.entity;
      if (filters.status) params.status = filters.status;
      if (filters.startDate) params.startDate = filters.startDate;
      if (filters.endDate) params.endDate = filters.endDate;

      const response = await logsAPI.getAll(params);
      setLogs(response.data.logs);
    } catch (error) {
      console.error('Error fetching logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await logsAPI.getStats();
      setStats(response.data.stats);
    } catch (error) {
      console.error('Error fetching log stats:', error);
    }
  };

  const handleClearOldLogs = async () => {
    const days = prompt('Delete logs older than how many days?', '30');
    if (!days) return;

    try {
      await logsAPI.clearOldLogs({ days: parseInt(days) });
      alert('Old logs cleared successfully');
      fetchLogs();
      fetchStats();
    } catch (error) {
      console.error('Error clearing logs:', error);
      alert('Failed to clear old logs');
    }
  };

  if (loading) {
    return <div className="loading">Loading logs...</div>;
  }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">System Logs</h1>
        <button className="btn btn-danger" onClick={handleClearOldLogs}>
          Clear Old Logs
        </button>
      </div>

      <div className="dashboard-grid">
        <div className="stat-card">
          <h3>Total Logs</h3>
          <div className="value">{stats.total}</div>
        </div>
        <div className="stat-card" style={{ borderLeftColor: '#4CAF50' }}>
          <h3>Success</h3>
          <div className="value">{stats.success}</div>
        </div>
        <div className="stat-card" style={{ borderLeftColor: '#f44336' }}>
          <h3>Failures</h3>
          <div className="value">{stats.failure}</div>
        </div>
        <div className="stat-card" style={{ borderLeftColor: '#ff9800' }}>
          <h3>Warnings</h3>
          <div className="value">{stats.warning}</div>
        </div>
      </div>

      <div className="filter-bar">
        <div className="filter-group">
          <label>Action</label>
          <select value={filters.action} onChange={(e) => setFilters({ ...filters, action: e.target.value })}>
            <option value="">All Actions</option>
            <option value="login">Login</option>
            <option value="register">Register</option>
            <option value="create_booking">Create Booking</option>
            <option value="update_booking">Update Booking</option>
            <option value="create_batch">Create Batch</option>
            <option value="update_batch">Update Batch</option>
            <option value="create_user">Create User</option>
            <option value="update_user">Update User</option>
          </select>
        </div>
        <div className="filter-group">
          <label>Entity</label>
          <select value={filters.entity} onChange={(e) => setFilters({ ...filters, entity: e.target.value })}>
            <option value="">All Entities</option>
            <option value="User">User</option>
            <option value="Booking">Booking</option>
            <option value="Batch">Batch</option>
            <option value="MarketRate">Market Rate</option>
            <option value="TrackerConfig">Tracker</option>
          </select>
        </div>
        <div className="filter-group">
          <label>Status</label>
          <select value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })}>
            <option value="">All Status</option>
            <option value="success">Success</option>
            <option value="failure">Failure</option>
            <option value="warning">Warning</option>
          </select>
        </div>
        <div className="filter-group">
          <label>Start Date</label>
          <input
            type="date"
            value={filters.startDate}
            onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
          />
        </div>
        <div className="filter-group">
          <label>End Date</label>
          <input
            type="date"
            value={filters.endDate}
            onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
          />
        </div>
      </div>

      <div className="card">
        <table className="table">
          <thead>
            <tr>
              <th>Timestamp</th>
              <th>User</th>
              <th>Action</th>
              <th>Entity</th>
              <th>Details</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {logs.length === 0 ? (
              <tr>
                <td colSpan="6" style={{ textAlign: 'center', padding: '40px' }}>
                  No logs found
                </td>
              </tr>
            ) : (
              logs.map((log) => (
                <tr key={log._id}>
                  <td>{new Date(log.timestamp).toLocaleString()}</td>
                  <td>{log.user?.name || 'System'}</td>
                  <td style={{ textTransform: 'capitalize' }}>{log.action.replace('_', ' ')}</td>
                  <td>{log.entity}</td>
                  <td style={{ fontSize: '12px', color: '#666', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {JSON.stringify(log.details)}
                  </td>
                  <td>
                    <span className={`status-badge status-${log.status === 'success' ? 'active' : log.status === 'failure' ? 'inactive' : 'pending'}`}>
                      {log.status}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default Logs;
