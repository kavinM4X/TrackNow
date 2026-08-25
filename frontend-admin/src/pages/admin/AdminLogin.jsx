import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import api, { getStoredUser, getToken, setSession } from '../../api/client';
import BrandLogo from '../../components/common/BrandLogo';
import styles from './AdminLogin.module.css';

export default function AdminLogin({ onLogin }) {
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { register, handleSubmit } = useForm();

  useEffect(() => {
    const user = getStoredUser();
    if (user?.role === 'admin' && getToken()) {
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
      if (err.code === 'ERR_NETWORK' || !err.response) {
        setError(
          'Cannot reach API server. Start backend (npm start) or verify VITE_API_URL in frontend-admin/.env.'
        );
      } else {
        setError(err.response?.data?.message || err.response?.data?.error || 'Invalid admin credentials');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.inner}>
        {/* Brand Header */}
        <div className={styles.brandHeader}>
          <div className={styles.logoBox}>
            <BrandLogo size={56} />
          </div>
          <h1 className={styles.title}>TrackNow Admin</h1>
          <span className={styles.badgePill}>👑 Administration Console</span>
        </div>

        {/* Login Form */}
        <form className={styles.card} onSubmit={handleSubmit(onSubmit)}>
          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel}>📱 Phone Number</label>
            <input
              className={styles.fieldInput}
              type="tel"
              placeholder="Enter admin phone number"
              {...register('phone', { required: true })}
            />
          </div>

          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel}>🔒 Password</label>
            <input
              className={styles.fieldInput}
              type="password"
              placeholder="Enter password"
              {...register('password', { required: true, minLength: 6 })}
            />
          </div>

          {error && <p className="form-error">{error}</p>}

          <button type="submit" className={styles.submitBtn} disabled={loading}>
            {loading ? 'Logging in…' : '🚀 Sign In to Admin Console'}
          </button>
        </form>

        <div className={styles.securityNote}>
          <span>🔒</span> Secured end-to-end admin session with encrypted JWT authentication
        </div>
      </div>
    </div>
  );
}
