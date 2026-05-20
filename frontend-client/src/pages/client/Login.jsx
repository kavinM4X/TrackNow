import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import api, { getStoredUser, setSession } from '../../api/client';
import styles from './Login.module.css';

export default function Login({ onLogin }) {
  const navigate = useNavigate();
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors }
  } = useForm();

  useEffect(() => {
    const token = localStorage.getItem('silktrack_token');
    const user = getStoredUser();
    if (token && user && user.role !== 'admin') {
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
      if (!token || !user) throw new Error('Invalid response');

      if (user.role === 'admin') {
        setError('Please use the Admin Portal app to sign in as admin.');
        return;
      }

      setSession(token, user);
      try {
        await api.post('/logs', {
          action: 'logged in',
          type: 'login',
          page: 'login'
        });
      } catch {
        /* ignore */
      }
      onLogin(token, user);
      navigate('/dashboard', { replace: true });
    } catch (err) {
      const msg =
        err.response?.data?.message ||
        err.response?.data?.error ||
        (err.response?.status === 401
          ? 'Invalid phone or password. Use the same phone you entered when the admin created your account.'
          : 'Login failed. Check phone and password.');
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.inner}>
        <div className={styles.logo}>
          <svg width="36" height="36" viewBox="0 0 18 18" aria-hidden>
            <ellipse cx="9" cy="9" rx="4" ry="6.5" fill="none" stroke="#2E7D52" strokeWidth="1.5" />
            <path d="M5 9h8M9 2.5v13" stroke="#2E7D52" strokeWidth="1" opacity="0.5" />
            <circle cx="9" cy="9" r="1.5" fill="#2E7D52" />
          </svg>
        </div>
        <h1 className={styles.brand}>SilkTrack</h1>
        <p className={styles.tagline}>Sericulture Management</p>

        <form className={styles.card} onSubmit={handleSubmit(onSubmit)}>
          <label className="field-label">Phone</label>
          <input
            className="field-input"
            type="tel"
            placeholder="Enter phone number"
            {...register('phone', { required: 'Phone is required' })}
          />
          {errors.phone && <p className="form-error">{errors.phone.message}</p>}

          <label className="field-label">Password</label>
          <div className={styles.passWrap}>
            <input
              className="field-input"
              type={showPass ? 'text' : 'password'}
              placeholder="••••••••"
              {...register('password', {
                required: 'Password is required',
                minLength: { value: 6, message: 'Min 6 characters' }
              })}
            />
            <button
              type="button"
              className={styles.eye}
              onClick={() => setShowPass((v) => !v)}
              aria-label="Toggle password"
            >
              {showPass ? '🙈' : '👁'}
            </button>
          </div>
          {errors.password && <p className="form-error">{errors.password.message}</p>}

          {error && <p className="form-error">{error}</p>}

          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? 'Logging in…' : 'Login'}
          </button>
        </form>

        <p className={styles.forgot}>Forgot password? Contact your admin</p>
      </div>
    </div>
  );
}
