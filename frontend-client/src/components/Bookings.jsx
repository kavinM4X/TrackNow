import { useState, useEffect } from 'react';
import axios from 'axios';

function Bookings({ user }) {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    date: '',
    location: 'Coimbatore',
    quantityKg: '',
    notes: ''
  });

  const token = localStorage.getItem('silktrack_token');

  useEffect(() => {
    fetchBookings();
  }, []);

  const fetchBookings = async () => {
    try {
      const response = await axios.get('/api/bookings/my', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setBookings(response.data);
    } catch (error) {
      console.error('Error fetching bookings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post('/api/bookings', formData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setShowModal(false);
      setFormData({
        date: '',
        location: 'Coimbatore',
        quantityKg: '',
        notes: ''
      });
      fetchBookings();
    } catch (error) {
      console.error('Error creating booking:', error);
      alert('Failed to create booking');
    }
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  if (loading) {
    return <div className="loading">Loading bookings...</div>;
  }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Bookings</h1>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          + New Booking
        </button>
      </div>

      <div className="card">
        <table className="table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Location</th>
              <th>Quantity (kg)</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {bookings.length === 0 ? (
              <tr>
                <td colSpan="4" style={{ textAlign: 'center', padding: '40px' }}>
                  No bookings found. Create your first booking!
                </td>
              </tr>
            ) : (
              bookings.map((booking) => (
                <tr key={booking._id}>
                  <td>{formatDate(booking.date)}</td>
                  <td>{booking.location}</td>
                  <td>{booking.quantityKg}</td>
                  <td>
                    <span className={`status-badge status-${booking.status}`}>
                      {booking.status}
                    </span>
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
            <h2 style={{ marginBottom: '20px' }}>Create New Booking</h2>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="label">Date</label>
                <input
                  type="date"
                  name="date"
                  className="input"
                  value={formData.date}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="form-group">
                <label className="label">Location</label>
                <select name="location" className="input" value={formData.location} onChange={handleChange}>
                  <option value="Coimbatore">Coimbatore</option>
                  <option value="Mamballi">Mamballi</option>
                  <option value="Ramnagar">Ramnagar</option>
                  <option value="Dharmapuri">Dharmapuri</option>
                </select>
              </div>
              <div className="form-group">
                <label className="label">Quantity (kg)</label>
                <input
                  type="number"
                  name="quantityKg"
                  className="input"
                  value={formData.quantityKg}
                  onChange={handleChange}
                  min="1"
                  required
                />
              </div>
              <div className="form-group">
                <label className="label">Notes</label>
                <textarea
                  name="notes"
                  className="input"
                  value={formData.notes}
                  onChange={handleChange}
                  rows="3"
                />
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button type="submit" className="btn btn-primary">Create Booking</button>
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Bookings;
