import { useState, useEffect } from 'react';
import axios from 'axios';

function Tracking({ user }) {
  const [trackerConfig, setTrackerConfig] = useState(null);
  const [loading, setLoading] = useState(true);

  const token = localStorage.getItem('silktrack_token');

  useEffect(() => {
    fetchTrackerConfig();
  }, []);

  const fetchTrackerConfig = async () => {
    try {
      const response = await axios.get('/api/tracker/my', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setTrackerConfig(response.data);
    } catch (error) {
      console.error('Error fetching tracker config:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  if (loading) {
    return <div className="loading">Loading tracker data...</div>;
  }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Tracker</h1>
      </div>

      <div className="card">
        {!trackerConfig ? (
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <h3 style={{ color: '#666', marginBottom: '10px' }}>Tracker Not Enabled</h3>
            <p style={{ color: '#999' }}>
              Your tracker has not been activated yet. Contact the administrator to enable tracking for your vehicle.
            </p>
          </div>
        ) : (
          <div>
            <div style={{ marginBottom: '30px' }}>
              <h2 style={{ marginBottom: '20px', color: '#333' }}>Tracker Status</h2>
              <div className="dashboard-grid">
                <div className="stat-card">
                  <h3>Status</h3>
                  <div className="value">
                    <span className={`status-badge status-${trackerConfig.isEnabled ? 'completed' : 'cancelled'}`}>
                      {trackerConfig.isEnabled ? 'Enabled' : 'Disabled'}
                    </span>
                  </div>
                </div>

                <div className="stat-card">
                  <h3>Vehicle ID</h3>
                  <div className="value">{trackerConfig.vehicleId || 'Not assigned'}</div>
                </div>

                <div className="stat-card">
                  <h3>Activated By</h3>
                  <div className="value">{trackerConfig.activatedBy || 'N/A'}</div>
                </div>

                <div className="stat-card">
                  <h3>Activated At</h3>
                  <div className="value" style={{ fontSize: '16px' }}>
                    {trackerConfig.activatedAt ? formatDate(trackerConfig.activatedAt) : 'N/A'}
                  </div>
                </div>
              </div>
            </div>

            <div>
              <h2 style={{ marginBottom: '20px', color: '#333' }}>Last Updated</h2>
              <p style={{ color: '#666', fontSize: '16px' }}>
                {trackerConfig.lastUpdated ? formatDate(trackerConfig.lastUpdated) : 'N/A'}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default Tracking;
