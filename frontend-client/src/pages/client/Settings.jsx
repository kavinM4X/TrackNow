import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import AppShell from '../../components/layout/AppShell';
import Spinner from '../../components/common/Spinner';
import api, { clearSession, getStoredUser, getToken, setSession } from '../../api/client';
import { initials, shortUserId } from '../../utils/format';

export default function Settings({ onLogout }) {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [profileMsg, setProfileMsg] = useState('');
  const [profileErr, setProfileErr] = useState('');

  const profileForm = useForm();

  useEffect(() => {
    api
      .get('/auth/me')
      .then((res) => {
        const u = res.data.user;
        setUser(u);
        profileForm.reset({
          name: u.name,
          phone: u.phone,
          email: u.email || ''
        });
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [profileForm]);

  const saveProfile = async (data) => {
    setProfileErr('');
    setProfileMsg('');
    try {
      const res = await api.put('/auth/profile', data);
      setUser(res.data.user);
      const stored = getStoredUser() || {};
      setSession(getToken(), { ...stored, ...res.data.user });
      setProfileMsg('✓ Profile updated');
    } catch (err) {
      setProfileErr(err.response?.data?.message || 'Update failed');
    }
  };

  const logout = () => {
    if (!window.confirm('Are you sure you want to logout?')) return;
    clearSession();
    onLogout();
    navigate('/login', { replace: true });
  };

  if (loading) {
    return (
      <AppShell title="Settings">
        <Spinner />
      </AppShell>
    );
  }

  return (
    <AppShell title="Settings">
      <div className="card" style={{ textAlign: 'center' }}>
        <div
          style={{
            width: 48,
            height: 48,
            borderRadius: '50%',
            background: 'var(--green)',
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 8px',
            fontWeight: 600
          }}
        >
          {initials(user?.name)}
        </div>
        <strong>{user?.name}</strong>
        <div style={{ fontSize: 12, color: '#888' }}>ID: {shortUserId(user?.id)}</div>
      </div>

      <form className="card" onSubmit={profileForm.handleSubmit(saveProfile)}>
        <p className="section-title">Edit Profile</p>
        <label className="field-label">Name</label>
        <input className="field-input" {...profileForm.register('name', { required: true })} />
        <label className="field-label">Phone</label>
        <input className="field-input" {...profileForm.register('phone', { required: true })} />
        <label className="field-label">Email</label>
        <input className="field-input" type="email" {...profileForm.register('email')} />
        {profileErr && <p className="form-error">{profileErr}</p>}
        {profileMsg && <p className="form-success">{profileMsg}</p>}
        <button type="submit" className="btn-outline">
          Save Changes
        </button>
      </form>

      <button type="button" className="btn-danger" onClick={logout}>
        Logout
      </button>
    </AppShell>
  );
}
