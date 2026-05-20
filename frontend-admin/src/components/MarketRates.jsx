import { useState, useEffect } from 'react';
import { marketRatesAPI } from '../../../shared/api';

function MarketRates() {
  const [rates, setRates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editRate, setEditRate] = useState(null);
  const [formData, setFormData] = useState({
    silkType: '',
    variety: '',
    rate: '',
    unit: 'per kg',
    market: '',
    location: '',
    trend: 'stable',
    changePercentage: 0,
    qualityGrade: 'B',
    source: '',
    isActive: true
  });

  useEffect(() => {
    fetchRates();
  }, []);

  const fetchRates = async () => {
    try {
      const response = await marketRatesAPI.getAll();
      setRates(response.data.marketRates);
    } catch (error) {
      console.error('Error fetching market rates:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = { ...formData, rate: parseFloat(formData.rate), changePercentage: parseFloat(formData.changePercentage) };

      if (editRate) {
        await marketRatesAPI.update(editRate._id, payload);
      } else {
        await marketRatesAPI.create(payload);
      }

      setShowModal(false);
      setEditRate(null);
      resetForm();
      fetchRates();
    } catch (error) {
      console.error('Error saving market rate:', error);
      alert('Failed to save market rate');
    }
  };

  const handleEdit = (rate) => {
    setEditRate(rate);
    setFormData({
      silkType: rate.silkType,
      variety: rate.variety || '',
      rate: rate.rate,
      unit: rate.unit,
      market: rate.market,
      location: rate.location,
      trend: rate.trend,
      changePercentage: rate.changePercentage,
      qualityGrade: rate.qualityGrade,
      source: rate.source || '',
      isActive: rate.isActive
    });
    setShowModal(true);
  };

  const handleDelete = async (rateId) => {
    if (!window.confirm('Are you sure you want to delete this market rate?')) return;

    try {
      await marketRatesAPI.delete(rateId);
      fetchRates();
    } catch (error) {
      console.error('Error deleting market rate:', error);
      alert('Failed to delete market rate');
    }
  };

  const resetForm = () => {
    setFormData({
      silkType: '',
      variety: '',
      rate: '',
      unit: 'per kg',
      market: '',
      location: '',
      trend: 'stable',
      changePercentage: 0,
      qualityGrade: 'B',
      source: '',
      isActive: true
    });
  };

  if (loading) {
    return <div className="loading">Loading market rates...</div>;
  }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Market Rates Management</h1>
        <button className="btn btn-primary" onClick={() => { resetForm(); setEditRate(null); setShowModal(true); }}>
          + Add Rate
        </button>
      </div>

      <div className="card">
        <table className="table">
          <thead>
            <tr>
              <th>Silk Type</th>
              <th>Variety</th>
              <th>Rate</th>
              <th>Market</th>
              <th>Location</th>
              <th>Trend</th>
              <th>Quality</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {rates.length === 0 ? (
              <tr>
                <td colSpan="9" style={{ textAlign: 'center', padding: '40px' }}>
                  No market rates found
                </td>
              </tr>
            ) : (
              rates.map((rate) => (
                <tr key={rate._id}>
                  <td>{rate.silkType}</td>
                  <td>{rate.variety || '-'}</td>
                  <td>₹{rate.rate}/{rate.unit}</td>
                  <td>{rate.market}</td>
                  <td>{rate.location}</td>
                  <td>
                    <span className={`status-badge status-${rate.trend === 'up' ? 'active' : rate.trend === 'down' ? 'inactive' : 'pending'}`}>
                      {rate.trend} {rate.changePercentage !== 0 && `(${rate.changePercentage}%)`}
                    </span>
                  </td>
                  <td>Grade {rate.qualityGrade}</td>
                  <td>
                    <span className={`status-badge status-${rate.isActive ? 'active' : 'inactive'}`}>
                      {rate.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td>
                    <button
                      className="btn btn-secondary"
                      style={{ padding: '5px 10px', fontSize: '12px', marginRight: '5px' }}
                      onClick={() => handleEdit(rate)}
                    >
                      Edit
                    </button>
                    <button
                      className="btn btn-danger"
                      style={{ padding: '5px 10px', fontSize: '12px' }}
                      onClick={() => handleDelete(rate._id)}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000
        }}>
          <div className="card" style={{ maxWidth: '500px', width: '90%', maxHeight: '90vh', overflowY: 'auto' }}>
            <h2 style={{ marginBottom: '20px' }}>{editRate ? 'Edit Market Rate' : 'Add New Market Rate'}</h2>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="label">Silk Type</label>
                <input type="text" className="input" value={formData.silkType} onChange={(e) => setFormData({ ...formData, silkType: e.target.value })} required />
              </div>
              <div className="form-group">
                <label className="label">Variety</label>
                <input type="text" className="input" value={formData.variety} onChange={(e) => setFormData({ ...formData, variety: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="label">Rate (₹)</label>
                <input type="number" className="input" value={formData.rate} onChange={(e) => setFormData({ ...formData, rate: e.target.value })} required />
              </div>
              <div className="form-group">
                <label className="label">Unit</label>
                <input type="text" className="input" value={formData.unit} onChange={(e) => setFormData({ ...formData, unit: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="label">Market</label>
                <input type="text" className="input" value={formData.market} onChange={(e) => setFormData({ ...formData, market: e.target.value })} required />
              </div>
              <div className="form-group">
                <label className="label">Location</label>
                <input type="text" className="input" value={formData.location} onChange={(e) => setFormData({ ...formData, location: e.target.value })} required />
              </div>
              <div className="form-group">
                <label className="label">Trend</label>
                <select className="input" value={formData.trend} onChange={(e) => setFormData({ ...formData, trend: e.target.value })}>
                  <option value="up">Up</option>
                  <option value="down">Down</option>
                  <option value="stable">Stable</option>
                </select>
              </div>
              <div className="form-group">
                <label className="label">Change Percentage (%)</label>
                <input type="number" className="input" value={formData.changePercentage} onChange={(e) => setFormData({ ...formData, changePercentage: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="label">Quality Grade</label>
                <select className="input" value={formData.qualityGrade} onChange={(e) => setFormData({ ...formData, qualityGrade: e.target.value })}>
                  <option value="A">Grade A</option>
                  <option value="B">Grade B</option>
                  <option value="C">Grade C</option>
                  <option value="D">Grade D</option>
                </select>
              </div>
              <div className="form-group">
                <label className="label">Source</label>
                <input type="text" className="input" value={formData.source} onChange={(e) => setFormData({ ...formData, source: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="label">Status</label>
                <select className="input" value={formData.isActive} onChange={(e) => setFormData({ ...formData, isActive: e.target.value === 'true' })}>
                  <option value="true">Active</option>
                  <option value="false">Inactive</option>
                </select>
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button type="submit" className="btn btn-primary">{editRate ? 'Update Rate' : 'Add Rate'}</button>
                <button type="button" className="btn btn-secondary" onClick={() => { setShowModal(false); setEditRate(null); }}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default MarketRates;
