import { useState, useEffect } from 'react';
import axios from 'axios';

function MarketRates({ user }) {
  const [rates, setRates] = useState([]);
  const [trends, setTrends] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedSilkType, setSelectedSilkType] = useState('');

  useEffect(() => {
    fetchRates();
    fetchTrends();
  }, []);

  const fetchRates = async () => {
    try {
      const response = await axios.get('/api/marketrates/latest');
      setRates(response.data.latestRates);
    } catch (error) {
      console.error('Error fetching market rates:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTrends = async () => {
    try {
      const response = await axios.get('/api/marketrates/trends', { params: { days: 30 } });
      setTrends(response.data.trends);
    } catch (error) {
      console.error('Error fetching trends:', error);
    }
  };

  const filteredRates = selectedSilkType 
    ? rates.filter(rate => rate.silkType === selectedSilkType)
    : rates;

  if (loading) {
    return <div className="loading">Loading market rates...</div>;
  }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Market Rates</h1>
      </div>

      <div className="filter-bar">
        <div className="filter-group">
          <label>Filter by Silk Type</label>
          <select 
            value={selectedSilkType} 
            onChange={(e) => setSelectedSilkType(e.target.value)}
          >
            <option value="">All Types</option>
            {[...new Set(rates.map(r => r.silkType))].map(type => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="dashboard-grid">
        {filteredRates.map((rate) => (
          <div key={rate._id} className="stat-card">
            <h3>{rate.silkType}</h3>
            <div className="value">₹{rate.rate}</div>
            <p style={{ color: '#666', marginTop: '10px' }}>
              {rate.market} - {rate.location}
            </p>
            <div style={{ marginTop: '15px' }}>
              <span className={`status-badge status-${rate.trend === 'up' ? 'confirmed' : rate.trend === 'down' ? 'cancelled' : 'pending'}`}>
                {rate.trend === 'up' ? '↑' : rate.trend === 'down' ? '↓' : '→'} {rate.trend}
              </span>
              {rate.changePercentage !== 0 && (
                <span style={{ marginLeft: '10px', color: rate.changePercentage > 0 ? '#4CAF50' : '#f44336' }}>
                  ({rate.changePercentage > 0 ? '+' : ''}{rate.changePercentage}%)
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      {filteredRates.length === 0 && (
        <div className="card" style={{ textAlign: 'center', padding: '40px' }}>
          <p style={{ color: '#666' }}>No market rates available</p>
        </div>
      )}

      <div style={{ marginTop: '30px' }}>
        <h2 style={{ marginBottom: '20px', color: '#333' }}>30-Day Trend Analysis</h2>
        <div className="card">
          {trends.length > 0 ? (
            <table className="table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Silk Type</th>
                  <th>Rate (₹/kg)</th>
                  <th>Market</th>
                  <th>Trend</th>
                </tr>
              </thead>
              <tbody>
                {trends.slice(0, 20).map((trend) => (
                  <tr key={trend._id}>
                    <td>{new Date(trend.date).toLocaleDateString()}</td>
                    <td>{trend.silkType}</td>
                    <td>₹{trend.rate}</td>
                    <td>{trend.market}</td>
                    <td>
                      <span className={`status-badge status-${trend.trend === 'up' ? 'confirmed' : trend.trend === 'down' ? 'cancelled' : 'pending'}`}>
                        {trend.trend}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p style={{ color: '#666', textAlign: 'center', padding: '20px' }}>
              No trend data available
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export default MarketRates;
