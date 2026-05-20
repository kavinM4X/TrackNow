import { useState, useEffect } from 'react';
import { trackerAPI, usersAPI, bookingsAPI } from '../../../shared/api';

function Trackers() {
  const [trackers, setTrackers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    user: '',
    booking: '',
    vehicleNumber: '',
    deviceId: '',
    deviceType: 'gps',
    updateInterval: 30,
    geofenceEnabled: false,
    geofenceRadius: 100
  });
  const [users, setUsers] = useState([]);
  const [bookings, setBookings] = useState([]);

  useEffect(() => {
    fetchTrackers();
    fetchUsers();
    fetchBookings();
  }, []);

  const fetchTrackers = async () => {
    try {
      const response = await trackerAPI.getAll();
      setTrackers(response.data.trackers);
    } catch (error) {
      console.error('Error fetching trackers:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await usersAPI.getAll();
      setUsers(response.data.users);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const fetchBookings = async () => {
    try {
      const response = await bookingsAPI.getAll();
      setBookings(response.data.bookings);
    } catch (error) {
      console.error('Error fetching bookings:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        user: formData.user,
        booking: formData.booking,
        vehicleNumber: formData.vehicleNumber,
        deviceId: formData.deviceId,
        deviceType: formData.deviceType,
        updateInterval: parseInt(formData.updateInterval),
        geofence: {
          enabled: formData.geofenceEnabled,
          radius: parseInt(formData.geofenceRadius)
        }
      };

      await trackerAPI.create(payload);
      setShowModal(false);
      resetForm();
      fetchTrackers();
    } catch (error) {
      console.error('Error creating tracker:', error);
      alert('Failed to create tracker');
    }
  };

  const handleDelete = async (trackerId) => {
    if (!window.confirm('Are you sure you want to delete this tracker?')) return;

    try {
      await trackerAPI.delete(trackerId);
      fetchTrackers();
    } catch (error) {
      console.error('Error deleting tracker:', error);
      alert('Failed to delete tracker');
    }
  };

  const resetForm = () => {
    setFormData({
      user: '',
      booking: '',
      vehicleNumber: '',
      deviceId: '',
      deviceType: 'gps',
      updateInterval: 30,
      geofenceEnabled: false,
      geofenceRadius: 100
    });
  };

  if (loading) {
    return <div className="loading">Loading trackers...</div>;
  }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Tracker Management</h1>
        <button className="btn btn-primary" onClick={() => { resetForm(); setShowModal(true); }}>
          + Add Tracker
        </button>
      </div>

      <div className="card">
        <table className="table">
          <thead>
            <tr>
              <th>Vehicle #</th>
              <th>Device ID</th>
              <th>User</th>
              <th>Booking</th>
              <th>Type</th>
              <th>Status</th>
              <th>Battery</th>
              <th>Last Location</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {trackers.length === 0 ? (
              <tr>
                <td colSpan="9" style={{ textAlign: 'center', padding: '40px' }}>
                  No trackers found
                </td>
              </tr>
            ) : (
              trackers.map((tracker) => (
                <tr key={tracker._id}>
                  <td>{tracker.vehicleNumber}</td>
                  <td>{tracker.deviceId}</td>
                  <td>{tracker.user?.name || 'Unknown'}</td>
                  <td>{tracker.booking?.batchNumber || '-'}</td>
                  <td style={{ textTransform: 'capitalize' }}>{tracker.deviceType}</td>
                  <td>
                    <span className={`status-badge status-${tracker.isEnabled ? 'active' : 'inactive'}`}>
                      {tracker.isEnabled ? 'Enabled' : 'Disabled'}
                    </span>
                  </td>
                  <td>{tracker.batteryLevel ? `${tracker.batteryLevel}%` : '-'}</td>
                  <td>
                    {tracker.lastLocation ? (
                      <span style={{ fontSize: '12px', color: '#666' }}>
                        {tracker.lastLocation.latitude?.toFixed(4)}, {tracker.lastLocation.longitude?.toFixed(4)}
                      </span>
                    ) : (
                      <span style={{ color: '#999' }}>No data</span>
                    )}
                  </td>
                  <td>
                    <button
                      className="btn btn-danger"
                      style={{ padding: '5px 10px', fontSize: '12px' }}
                      onClick={() => handleDelete(tracker._id)}
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
            <h2 style={{ marginBottom: '20px' }}>Add New Tracker</h2>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="label">User</label>
                <select className="input" value={formData.user} onChange={(e) => setFormData({ ...formData, user: e.target.value })} required>
                  <option value="">Select User</option>
                  {users.map((user) => (
                    <option key={user._id} value={user._id}>{user.name} ({user.email})</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="label">Booking (Optional)</label>
                <select className="input" value={formData.booking} onChange={(e) => setFormData({ ...formData, booking: e.target.value })}>
                  <option value="">Select Booking</option>
                  {bookings.map((booking) => (
                    <option key={booking._id} value={booking._id}>{booking.batchNumber}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="label">Vehicle Number</label>
                <input type="text" className="input" value={formData.vehicleNumber} onChange={(e) => setFormData({ ...formData, vehicleNumber: e.target.value })} required />
              </div>
              <div className="form-group">
                <label className="label">Device ID</label>
                <input type="text" className="input" value={formData.deviceId} onChange={(e) => setFormData({ ...formData, deviceId: e.target.value })} required />
              </div>
              <div className="form-group">
                <label className="label">Device Type</label>
                <select className="input" value={formData.deviceType} onChange={(e) => setFormData({ ...formData, deviceType: e.target.value })}>
                  <option value="gps">GPS</option>
                  <option value="rfid">RFID</option>
                  <option value="bluetooth">Bluetooth</option>
                  <option value="manual">Manual</option>
                </select>
              </div>
              <div className="form-group">
                <label className="label">Update Interval (seconds)</label>
                <input type="number" className="input" value={formData.updateInterval} onChange={(e) => setFormData({ ...formData, updateInterval: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="label">Enable Geofence</label>
                <select className="input" value={formData.geofenceEnabled} onChange={(e) => setFormData({ ...formData, geofenceEnabled: e.target.value === 'true' })}>
                  <option value="false">No</option>
                  <option value="true">Yes</option>
                </select>
              </div>
              {formData.geofenceEnabled && (
                <div className="form-group">
                  <label className="label">Geofence Radius (meters)</label>
                  <input type="number" className="input" value={formData.geofenceRadius} onChange={(e) => setFormData({ ...formData, geofenceRadius: e.target.value })} />
                </div>
              )}
              <div style={{ display: 'flex', gap: '10px' }}>
                <button type="submit" className="btn btn-primary">Add Tracker</button>
                <button type="button" className="btn btn-secondary" onClick={() => { setShowModal(false); }}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Trackers;
