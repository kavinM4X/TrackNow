import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import api, { getStoredUser, getToken, setSession } from '../api/client';
import styles from './Auth.module.css';

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
    <div className={styles.authPage}>
      <div className={styles.authCard}>
        {/* Brand Header */}
        <div className={styles.brandHeader}>
          <div className={styles.brandIconCircle}>🚚</div>
          <h1 className={styles.brandTitle}>SilkRoute</h1>
          <span className={styles.brandSubtitlePill}>Create Driver Account</span>
        </div>

        {/* Registration Form */}
        <form className={styles.formGrid} onSubmit={handleSubmit(onSubmit)}>
          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel}>👤 Full Name</label>
            <input
              className={styles.fieldInput}
              placeholder="Enter full name"
              {...register('name', { required: true })}
            />
          </div>

          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel}>📱 Phone Number</label>
            <input
              className={styles.fieldInput}
              type="tel"
              placeholder="Enter 10-digit phone number"
              {...register('phone', { required: true })}
            />
          </div>

          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel}>✉️ Email Address (Optional)</label>
            <input
              className={styles.fieldInput}
              type="email"
              placeholder="Enter email address"
              {...register('email')}
            />
          </div>

          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel}>🔒 Password</label>
            <input
              className={styles.fieldInput}
              type="password"
              placeholder="Create password (min 6 chars)"
              {...register('password', { required: true, minLength: 6 })}
            />
          </div>

          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel}>🔒 Confirm Password</label>
            <input
              className={styles.fieldInput}
              type="password"
              placeholder="Re-enter password"
              {...register('confirmPassword', {
                required: true,
                validate: (v) => v === password || 'Passwords do not match'
              })}
            />
          </div>

          {error && <p className="form-error">{error}</p>}

          <button type="submit" className={styles.submitBtn} disabled={loading}>
            {loading ? 'Creating account…' : '📝 Register Driver Account'}
          </button>
        </form>

        <p className={styles.authSwitch}>
          Already have a driver account?{' '}
          <Link to="/login" className={styles.authLink}>
            Sign in
          </Link>
        </p>

        <div className={styles.hintBox}>
          💡 After registering, ask your logistics admin to assign your vehicle under Driver → Vehicles.
        </div>
      </div>
    </div>
  );
}
