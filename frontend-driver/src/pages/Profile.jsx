import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import DriverShell from '../components/layout/DriverShell';
import api, { clearSession, getStoredUser, getToken, setSession } from '../api/client';
import styles from '../components/layout/DriverShell.module.css';

export default function Profile({ onLogout }) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saveMsg, setSaveMsg] = useState('');
  const [saveErr, setSaveErr] = useState('');
  const { register, handleSubmit, reset } = useForm();

  useEffect(() => {
    api
      .get('/auth/me')
      .then((res) => {
        const u = res.data.user;
        reset({
          name: u.name || '',
          phone: u.phone || '',
          email: u.email || ''
        });
      })
      .catch(() => {
        const stored = getStoredUser();
        if (stored) {
          reset({
            name: stored.name || '',
            phone: stored.phone || '',
            email: stored.email || ''
          });
        }
      })
      .finally(() => setLoading(false));
  }, [reset]);

  const onSave = async (data) => {
    setSaveErr('');
    setSaveMsg('');
    try {
      const res = await api.put('/auth/profile', {
        name: data.name.trim(),
        phone: data.phone.trim(),
        email: data.email?.trim() || ''
      });
      const u = res.data.user;
      const stored = getStoredUser() || {};
      setSession(getToken(), { ...stored, ...u });
      setSaveMsg('Profile updated');
    } catch (err) {
      setSaveErr(err.response?.data?.message || 'Update failed');
    }
  };

  const handleLogout = () => {
    if (!window.confirm('Sign out?')) return;
    clearSession();
    onLogout();
    navigate('/login', { replace: true });
  };

  return (
    <DriverShell title="Profile">
      {loading ? (
        <div className="spinner" />
      ) : (
        <form className="card" onSubmit={handleSubmit(onSave)}>
          <label className="field-label">Name</label>
          <input className="field-input" {...register('name', { required: true })} />

          <label className="field-label">Phone Number</label>
          <input className="field-input" type="tel" {...register('phone', { required: true })} />

          <label className="field-label">Email ID (optional)</label>
          <input className="field-input" type="email" {...register('email')} />

          {saveErr && <p className={styles.err}>{saveErr}</p>}
          {saveMsg && <p className="form-success">{saveMsg}</p>}

          <button type="submit" className="btn-outline">
            Save Changes
          </button>
        </form>
      )}

      <button
        type="button"
        className="btn-amber"
        style={{ marginTop: 4, background: '#a93226' }}
        onClick={handleLogout}
      >
        Logout
      </button>
    </DriverShell>
  );
}
