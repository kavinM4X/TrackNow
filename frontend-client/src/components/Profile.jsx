import { useState, useEffect } from 'react';
import axios from 'axios';

function Profile({ user, onLogout }) {
  const [profile, setProfile] = useState(user);
  const [editMode, setEditMode] = useState(false);
  const [passwordMode, setPasswordMode] = useState(false);
  const [formData, setFormData] = useState({
    name: user.name,
    phone: user.phone || '',
    vehicleId: user.vehicleId || ''
  });
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: ''
  });
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const token = localStorage.getItem('silktrack_token');

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      const payload = {
        name: formData.name,
        phone: formData.phone,
        vehicleId: formData.vehicleId
      };

      const response = await axios.put('/api/users/profile', payload, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setProfile(response.data);
      localStorage.setItem('silktrack_user', JSON.stringify(response.data));
      setEditMode(false);
      setMessage('Profile updated successfully!');
    } catch (error) {
      setMessage(error.response?.data?.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      await axios.put('/api/auth/change-password', passwordData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setPasswordMode(false);
      setPasswordData({ currentPassword: '', newPassword: '' });
      setMessage('Password changed successfully!');
    } catch (error) {
      setMessage(error.response?.data?.message || 'Failed to change password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Settings</h1>
      </div>

      <div className="profile-header">
        <div className="profile-avatar">
          {profile.name.charAt(0).toUpperCase()}
        </div>
        <div className="profile-info">
          <h2>{profile.name}</h2>
          <p>{profile.phone}</p>
          <span className="profile-role">{profile.role}</span>
        </div>
      </div>

      {message && (
        <div className={`card ${message.includes('success') ? 'success' : 'error'}`} style={{ marginBottom: '20px' }}>
          {message}
        </div>
      )}

      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2 style={{ color: '#333' }}>Personal Information</h2>
          {!editMode ? (
            <button className="btn btn-primary" onClick={() => setEditMode(true)}>
              Edit Profile
            </button>
          ) : (
            <button className="btn btn-secondary" onClick={() => {
              setEditMode(false);
              setFormData({
                name: profile.name,
                phone: profile.phone || '',
                vehicleId: profile.vehicleId || ''
              });
            }}>
              Cancel
            </button>
          )}
        </div>

        {editMode ? (
          <form onSubmit={handleProfileUpdate}>
            <div className="form-group">
              <label className="label">Full Name</label>
              <input
                type="text"
                className="input"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label className="label">Phone</label>
              <input
                type="tel"
                className="input"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label className="label">Vehicle ID</label>
              <input
                type="text"
                className="input"
                value={formData.vehicleId}
                onChange={(e) => setFormData({ ...formData, vehicleId: e.target.value })}
                placeholder="Optional - for tracker activation"
              />
            </div>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
          </form>
        ) : (
          <div>
            <div style={{ marginBottom: '15px' }}>
              <label className="label">Full Name</label>
              <p style={{ fontSize: '16px', color: '#333' }}>{profile.name}</p>
            </div>
            <div style={{ marginBottom: '15px' }}>
              <label className="label">Phone</label>
              <p style={{ fontSize: '16px', color: '#333' }}>{profile.phone || 'Not provided'}</p>
            </div>
            <div style={{ marginBottom: '15px' }}>
              <label className="label">Vehicle ID</label>
              <p style={{ fontSize: '16px', color: '#333' }}>{profile.vehicleId || 'Not provided'}</p>
            </div>
            <div style={{ marginBottom: '15px' }}>
              <label className="label">Tracker Status</label>
              <p style={{ fontSize: '16px', color: '#333' }}>
                <span className={`status-badge status-${profile.trackerEnabled ? 'completed' : 'cancelled'}`}>
                  {profile.trackerEnabled ? 'Enabled' : 'Disabled'}
                </span>
              </p>
            </div>
            <div style={{ marginBottom: '15px' }}>
              <label className="label">Member Since</label>
              <p style={{ fontSize: '16px', color: '#333' }}>
                {new Date(profile.createdAt).toLocaleDateString()}
              </p>
            </div>
          </div>
        )}
      </div>

      <div className="card" style={{ marginTop: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2 style={{ color: '#333' }}>Change Password</h2>
          {!passwordMode ? (
            <button className="btn btn-secondary" onClick={() => setPasswordMode(true)}>
              Change Password
            </button>
          ) : (
            <button className="btn btn-secondary" onClick={() => {
              setPasswordMode(false);
              setPasswordData({ currentPassword: '', newPassword: '' });
            }}>
              Cancel
            </button>
          )}
        </div>

        {passwordMode && (
          <form onSubmit={handlePasswordChange}>
            <div className="form-group">
              <label className="label">Current Password</label>
              <input
                type="password"
                className="input"
                value={passwordData.currentPassword}
                onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label className="label">New Password</label>
              <input
                type="password"
                className="input"
                value={passwordData.newPassword}
                onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                required
                minLength="6"
              />
            </div>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Changing...' : 'Change Password'}
            </button>
          </form>
        )}
      </div>

      <div className="card" style={{ marginTop: '20px', backgroundColor: '#fff3cd' }}>
        <h2 style={{ color: '#856404', marginBottom: '10px' }}>Danger Zone</h2>
        <p style={{ color: '#856404', marginBottom: '15px' }}>
          Once you logout, you'll need to login again to access your account.
        </p>
        <button className="btn btn-danger" onClick={onLogout}>
          Logout
        </button>
      </div>
    </div>
  );
}

export default Profile;
