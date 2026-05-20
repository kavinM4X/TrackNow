import { useState, useEffect } from 'react';
import { batchesAPI } from '../../../shared/api';

function Batches() {
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ status: '', silkType: '' });

  useEffect(() => {
    fetchBatches();
  }, [filters]);

  const fetchBatches = async () => {
    try {
      const params = {};
      if (filters.status) params.status = filters.status;
      if (filters.silkType) params.silkType = filters.silkType;

      const response = await batchesAPI.getAll(params);
      setBatches(response.data.batches);
    } catch (error) {
      console.error('Error fetching batches:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (batchId, newStatus) => {
    try {
      await batchesAPI.update(batchId, { status: newStatus });
      fetchBatches();
    } catch (error) {
      console.error('Error updating batch:', error);
      alert('Failed to update batch status');
    }
  };

  const handleDelete = async (batchId) => {
    if (!window.confirm('Are you sure you want to delete this batch?')) return;

    try {
      await batchesAPI.delete(batchId);
      fetchBatches();
    } catch (error) {
      console.error('Error deleting batch:', error);
      alert('Failed to delete batch');
    }
  };

  if (loading) {
    return <div className="loading">Loading batches...</div>;
  }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Batch Management</h1>
      </div>

      <div className="filter-bar">
        <div className="filter-group">
          <label>Status</label>
          <select value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })}>
            <option value="">All Status</option>
            <option value="in_production">In Production</option>
            <option value="harvested">Harvested</option>
            <option value="processed">Processed</option>
            <option value="sold">Sold</option>
            <option value="disposed">Disposed</option>
          </select>
        </div>
        <div className="filter-group">
          <label>Silk Type</label>
          <input
            type="text"
            placeholder="Filter by silk type..."
            value={filters.silkType}
            onChange={(e) => setFilters({ ...filters, silkType: e.target.value })}
          />
        </div>
      </div>

      <div className="card">
        <table className="table">
          <thead>
            <tr>
              <th>Batch #</th>
              <th>User</th>
              <th>Silk Type</th>
              <th>Variety</th>
              <th>Quantity</th>
              <th>Production Date</th>
              <th>Quality</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {batches.length === 0 ? (
              <tr>
                <td colSpan="9" style={{ textAlign: 'center', padding: '40px' }}>
                  No batches found
                </td>
              </tr>
            ) : (
              batches.map((batch) => (
                <tr key={batch._id}>
                  <td>{batch.batchNumber}</td>
                  <td>{batch.user?.name || 'Unknown'}</td>
                  <td>{batch.silkType}</td>
                  <td>{batch.variety || '-'}</td>
                  <td>{batch.quantity} {batch.unit}</td>
                  <td>{new Date(batch.productionDate).toLocaleDateString()}</td>
                  <td>Grade {batch.qualityGrade}</td>
                  <td>
                    <select
                      className="input"
                      style={{ padding: '5px', fontSize: '12px', marginBottom: 0 }}
                      value={batch.status}
                      onChange={(e) => handleStatusUpdate(batch._id, e.target.value)}
                    >
                      <option value="in_production">In Production</option>
                      <option value="harvested">Harvested</option>
                      <option value="processed">Processed</option>
                      <option value="sold">Sold</option>
                      <option value="disposed">Disposed</option>
                    </select>
                  </td>
                  <td>
                    <button
                      className="btn btn-danger"
                      style={{ padding: '5px 10px', fontSize: '12px' }}
                      onClick={() => handleDelete(batch._id)}
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
    </div>
  );
}

export default Batches;
