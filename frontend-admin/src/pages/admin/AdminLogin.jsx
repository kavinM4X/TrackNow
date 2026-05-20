import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import api, { getStoredUser, setSession } from '../../api/client';
import styles from './AdminLogin.module.css';

export default function AdminLogin({ onLogin }) {
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { register, handleSubmit } = useForm();

  useEffect(() => {
    const user = getStoredUser();
    if (user?.role === 'admin' && localStorage.getItem('silktrack_token')) {
      navigate('/admin/dashboard', { replace: true });
    }
  }, [navigate]);

  const onSubmit = async (data) => {
    setError('');
    setLoading(true);
    try {
      const res = await api.post('/auth/login', {
        phone: data.phone.trim(),
        password: data.password
      });
      const { token, user } = res.data;
      if (user.role !== 'admin') {
        setError('Access denied. Admin credentials required.');
        return;
      }
      setSession(token, user);
      onLogin(token, user);
      navigate('/admin/dashboard', { replace: true });
    } catch (err) {
      setError(
        err.response?.data?.message || 'Invalid credentials'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.inner}>
        <div className={styles.logo}>🔒</div>
        <h1>Admin Portal</h1>
        <p className={styles.sub}>SilkTrack Administration</p>
        <form className={styles.card} onSubmit={handleSubmit(onSubmit)}>
          <label className="field-label">Phone</label>
          <input className="field-input" type="tel" {...register('phone', { required: true })} />
          <label className="field-label">Password</label>
          <input
            className="field-input"
            type="password"
            {...register('password', { required: true, minLength: 6 })}
          />
          {error && <p className="form-error">{error}</p>}
          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? 'Logging in…' : 'Admin Login'}
          </button>
        </form>
      </div>
    </div>
  );
}
