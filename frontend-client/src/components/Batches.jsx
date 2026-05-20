import { useState, useEffect } from 'react';
import axios from 'axios';

function Batches({ user }) {
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(true);

  const token = localStorage.getItem('silktrack_token');

  useEffect(() => {
    fetchBatches();
  }, []);

  const fetchBatches = async () => {
    try {
      const response = await axios.get('/api/batches/my', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setBatches(response.data);
    } catch (error) {
      console.error('Error fetching batches:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  if (loading) {
    return <div className="loading">Loading batches...</div>;
  }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Batch History</h1>
      </div>

      <div className="card">
        <table className="table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Location</th>
              <th>Quantity (kg)</th>
              <th>Waste (kg)</th>
              <th>Doubles</th>
              <th>Notes</th>
            </tr>
          </thead>
          <tbody>
            {batches.length === 0 ? (
              <tr>
                <td colSpan="6" style={{ textAlign: 'center', padding: '40px' }}>
                  No batches found yet.
                </td>
              </tr>
            ) : (
              batches.map((batch) => (
                <tr key={batch._id}>
                  <td>{formatDate(batch.date)}</td>
                  <td>{batch.location || '-'}</td>
                  <td>{batch.quantityKg}</td>
                  <td>{batch.wasteKg || 0}</td>
                  <td>{batch.doubles || 0}</td>
                  <td>{batch.notes || '-'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default Batches;
