import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import api, { getStoredUser, getToken, setSession } from '../api/client';
import styles from './Auth.module.css';

export default function Login({ onLogin }) {
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { register, handleSubmit } = useForm();

  useEffect(() => {
    const user = getStoredUser();
    if (user && ['driver', 'staff'].includes(user.role) && getToken()) {
      navigate('/dashboard', { replace: true });
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
      if (!['driver', 'staff'].includes(user.role)) {
        setError('Access denied. Driver credentials required.');
        return;
      }
      setSession(token, user);
      onLogin(token, user);
      navigate('/dashboard', { replace: true });
    } catch (err) {
      if (err.code === 'ERR_NETWORK' || !err.response) {
        setError('Cannot reach API server. Check VITE_API_URL or start the backend.');
      } else {
        setError(err.response?.data?.message || err.response?.data?.error || 'Invalid driver credentials');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.authPage}>
      <div className={styles.authCard}>
        {/* Brand Header */}
        <div className={styles.brandHeader}>
          <div className={styles.brandIconCircle}>🚚</div>
          <h1 className={styles.brandTitle}>SilkRoute</h1>
          <span className={styles.brandSubtitlePill}>Driver Portal v2.4</span>
        </div>

        {/* Login Form */}
        <form className={styles.formGrid} onSubmit={handleSubmit(onSubmit)}>
          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel}>📱 Phone Number</label>
            <input
              className={styles.fieldInput}
              type="tel"
              placeholder="Enter registered phone number"
              {...register('phone', { required: true })}
            />
          </div>

          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel}>🔒 Password</label>
            <input
              className={styles.fieldInput}
              type="password"
              placeholder="Enter account password"
              {...register('password', { required: true })}
            />
          </div>

          {error && <p className="form-error">{error}</p>}

          <button type="submit" className={styles.submitBtn} disabled={loading}>
            {loading ? 'Signing in…' : '🚚 Sign In to Driver Account'}
          </button>
        </form>

        <p className={styles.authSwitch}>
          New driver?{' '}
          <Link to="/register" className={styles.authLink}>
            Create an account
          </Link>
        </p>

        <div className={styles.hintBox}>
          💡 Assigned trip vehicles and expense balances will automatically load upon sign-in.
        </div>
      </div>
    </div>
  );
}
