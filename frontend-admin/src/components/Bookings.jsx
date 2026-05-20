import { useState, useEffect } from 'react';
import { bookingsAPI } from '../../../shared/api';

function Bookings() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ status: '', bookingType: '' });

  useEffect(() => {
    fetchBookings();
  }, [filters]);

  const fetchBookings = async () => {
    try {
      const params = {};
      if (filters.status) params.status = filters.status;
      if (filters.bookingType) params.bookingType = filters.bookingType;

      const response = await bookingsAPI.getAll(params);
      setBookings(response.data.bookings);
    } catch (error) {
      console.error('Error fetching bookings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (bookingId, newStatus) => {
    try {
      await bookingsAPI.update(bookingId, { status: newStatus });
      fetchBookings();
    } catch (error) {
      console.error('Error updating booking:', error);
      alert('Failed to update booking status');
    }
  };

  const handleDelete = async (bookingId) => {
    if (!window.confirm('Are you sure you want to delete this booking?')) return;

    try {
      await bookingsAPI.delete(bookingId);
      fetchBookings();
    } catch (error) {
      console.error('Error deleting booking:', error);
      alert('Failed to delete booking');
    }
  };

  if (loading) {
    return <div className="loading">Loading bookings...</div>;
  }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Bookings Management</h1>
      </div>

      <div className="filter-bar">
        <div className="filter-group">
          <label>Status</label>
          <select value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })}>
            <option value="">All Status</option>
            <option value="pending">Pending</option>
            <option value="confirmed">Confirmed</option>
            <option value="in_transit">In Transit</option>
            <option value="delivered">Delivered</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
        <div className="filter-group">
          <label>Type</label>
          <select value={filters.bookingType} onChange={(e) => setFilters({ ...filters, bookingType: e.target.value })}>
            <option value="">All Types</option>
            <option value="pickup">Pickup</option>
            <option value="delivery">Delivery</option>
            <option value="processing">Processing</option>
          </select>
        </div>
      </div>

      <div className="card">
        <table className="table">
          <thead>
            <tr>
              <th>Batch #</th>
              <th>User</th>
              <th>Type</th>
              <th>Silk Type</th>
              <th>Pickup</th>
              <th>Delivery</th>
              <th>Scheduled</th>
              <th>Status</th>
              <th>Tracking</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {bookings.length === 0 ? (
              <tr>
                <td colSpan="10" style={{ textAlign: 'center', padding: '40px' }}>
                  No bookings found
                </td>
              </tr>
            ) : (
              bookings.map((booking) => (
                <tr key={booking._id}>
                  <td>{booking.batchNumber}</td>
                  <td>{booking.user?.name || 'Unknown'}</td>
                  <td style={{ textTransform: 'capitalize' }}>{booking.bookingType}</td>
                  <td>{booking.silkType}</td>
                  <td>{booking.pickupLocation}</td>
                  <td>{booking.deliveryLocation}</td>
                  <td>{new Date(booking.scheduledDate).toLocaleDateString()}</td>
                  <td>
                    <select
                      className="input"
                      style={{ padding: '5px', fontSize: '12px', marginBottom: 0 }}
                      value={booking.status}
                      onChange={(e) => handleStatusUpdate(booking._id, e.target.value)}
                    >
                      <option value="pending">Pending</option>
                      <option value="confirmed">Confirmed</option>
                      <option value="in_transit">In Transit</option>
                      <option value="delivered">Delivered</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </td>
                  <td>
                    {booking.trackingEnabled ? (
                      <span style={{ color: '#4CAF50', fontWeight: 'bold' }}>✓ Active</span>
                    ) : (
                      <span style={{ color: '#666' }}>Disabled</span>
                    )}
                  </td>
                  <td>
                    <button
                      className="btn btn-danger"
                      style={{ padding: '5px 10px', fontSize: '12px' }}
                      onClick={() => handleDelete(booking._id)}
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

export default Bookings;
