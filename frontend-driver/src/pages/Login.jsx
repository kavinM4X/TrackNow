import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import api, { getStoredUser, getToken, setSession } from '../api/client';
import styles from '../components/layout/DriverShell.module.css';

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
        setError(err.response?.data?.message || err.response?.data?.error || 'Invalid credentials');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.loginPage}>
      <div className={styles.loginCard}>
        <h1 className={styles.loginTitle}>SilkRoute</h1>
        <p className={styles.loginSub}>Driver Portal</p>
        <form onSubmit={handleSubmit(onSubmit)}>
          <label className="field-label">Phone</label>
          <input className="field-input" type="tel" {...register('phone', { required: true })} />
          <label className="field-label">Password</label>
          <input
            className="field-input"
            type="password"
            {...register('password', { required: true })}
          />
          {error && <p className={styles.err}>{error}</p>}
          <button type="submit" className="btn-amber" disabled={loading}>
            {loading ? 'Signing in…' : 'Sign In'}
          </button>
        </form>
        <p className={styles.authSwitch}>
          New driver? <Link to="/register">Create account</Link>
        </p>
      </div>
    </div>
  );
}
