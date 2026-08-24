import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import api, { getStoredUser, getToken, setSession } from '../api/client';
import styles from '../components/layout/DriverShell.module.css';

export default function Register({ onLogin }) {
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { register, handleSubmit, watch } = useForm();
  const password = watch('password');

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
      const res = await api.post('/auth/register', {
        name: data.name.trim(),
        phone: data.phone.trim(),
        email: data.email?.trim() || undefined,
        password: data.password,
        role: 'driver'
      });
      const { token, user } = res.data;
      if (user.role !== 'driver') {
        setError('Registration failed. Driver account required.');
        return;
      }
      setSession(token, user);
      onLogin(token, user);
      navigate('/dashboard', { replace: true });
    } catch (err) {
      if (err.code === 'ERR_NETWORK' || !err.response) {
        setError('Cannot reach API server. Check VITE_API_URL or start the backend.');
      } else {
        setError(err.response?.data?.message || err.response?.data?.error || 'Registration failed');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.loginPage}>
      <div className={styles.loginCard}>
        <h1 className={styles.loginTitle}>SilkRoute</h1>
        <p className={styles.loginSub}>Create driver account</p>
        <form onSubmit={handleSubmit(onSubmit)}>
          <label className="field-label">Full Name</label>
          <input className="field-input" {...register('name', { required: true })} />

          <label className="field-label">Phone</label>
          <input className="field-input" type="tel" {...register('phone', { required: true })} />

          <label className="field-label">Email (optional)</label>
          <input className="field-input" type="email" {...register('email')} />

          <label className="field-label">Password</label>
          <input
            className="field-input"
            type="password"
            {...register('password', { required: true, minLength: 6 })}
          />

          <label className="field-label">Confirm Password</label>
          <input
            className="field-input"
            type="password"
            {...register('confirmPassword', {
              required: true,
              validate: (v) => v === password || 'Passwords do not match'
            })}
          />

          {error && <p className={styles.err}>{error}</p>}
          <button type="submit" className="btn-amber" disabled={loading}>
            {loading ? 'Creating account…' : 'Register'}
          </button>
        </form>
        <p className={styles.authSwitch}>
          Already have an account? <Link to="/login">Sign in</Link>
        </p>
        <p className={styles.authHint}>
          After registering, ask admin to assign your vehicle under Driver → Vehicles.
        </p>
      </div>
    </div>
  );
}
