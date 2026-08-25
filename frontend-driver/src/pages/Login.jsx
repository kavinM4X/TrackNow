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
        {/* Brand Header with Exact Vector Icon */}
        <div className={styles.brandHeader}>
          <svg
            width="64"
            height="64"
            viewBox="0 0 128 128"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            style={{ borderRadius: 20, boxShadow: '0 8px 20px rgba(91, 43, 0, 0.3)', marginBottom: 4 }}
          >
            <rect width="128" height="128" rx="38" fill="#5b2b00" />
            <path d="M52 44 H82 C88 44 92 48 92 54 V72 C92 78 88 82 82 82 H52 V44 Z" fill="#e89613" />
            <path d="M38 52 C38 48 42 44 46 44 H52 V82 H38 C34 82 34 76 34 72 V62 Z" fill="#ffffff" />
            <rect x="41" y="49" width="10" height="10" rx="2" fill="#0f172a" />
            <circle cx="47" cy="82" r="12" fill="#ffffff" />
            <circle cx="47" cy="82" r="9.5" fill="#0f172a" />
            <circle cx="47" cy="82" r="4" fill="#fbbf24" />
            <circle cx="79" cy="82" r="12" fill="#ffffff" />
            <circle cx="79" cy="82" r="9.5" fill="#0f172a" />
            <circle cx="79" cy="82" r="4" fill="#fbbf24" />
          </svg>

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
