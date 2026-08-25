import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import api, { getStoredUser, getToken, setSession } from '../../api/client';
import { hasUpcomingBooking } from '../../utils/bookingGate';
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
    const token = getToken();
    const user = getStoredUser();
    if (token && user && user.role !== 'admin') {
      hasUpcomingBooking().then((has) =>
        navigate(has ? '/dashboard' : '/booking-gate', { replace: true })
      );
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
      const hasBooking = await hasUpcomingBooking();
      navigate(hasBooking ? '/dashboard' : '/booking-gate', { replace: true });
    } catch (err) {
      const msg =
        err.response?.data?.message ||
        err.response?.data?.error ||
        (err.response?.status === 401
          ? 'Invalid phone or password. Use the same phone registered with your farmer account.'
          : 'Login failed. Please check phone and password.');
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.inner}>
        {/* Header Branding */}
        <div className={styles.headerSection}>
          <div className={styles.logoRing}>🌾</div>
          <h1 className={styles.brandTitle}>TrackNow Farmer Portal</h1>
          <p className={styles.brandSub}>
            Sericulture Logistics, Live Harvest Pickup Tracking & Payout Ledger
          </p>
        </div>

        {/* Login Form Card */}
        <form className={styles.card} onSubmit={handleSubmit(onSubmit)}>
          <h2 className={styles.formHeaderTitle}>🔑 Sign In to Your Account</h2>

          {/* Phone Field */}
          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel}>📱 Registered Phone Number</label>
            <div className={styles.inputWrap}>
              <span className={styles.inputIcon}>📞</span>
              <input
                className={styles.fieldInput}
                type="tel"
                placeholder="Enter 10-digit phone number"
                {...register('phone', { required: 'Phone number is required' })}
              />
            </div>
            {errors.phone && <p className="form-error">{errors.phone.message}</p>}
          </div>

          {/* Password Field */}
          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel}>🔒 Password</label>
            <div className={styles.passWrap}>
              <span className={styles.inputIcon}>🔑</span>
              <input
                className={styles.fieldInput}
                type={showPass ? 'text' : 'password'}
                placeholder="••••••••"
                {...register('password', {
                  required: 'Password is required',
                  minLength: { value: 6, message: 'Minimum 6 characters' }
                })}
              />
              <button
                type="button"
                className={styles.eyeBtn}
                onClick={() => setShowPass((v) => !v)}
                aria-label="Toggle password visibility"
              >
                {showPass ? '🙈' : '👁'}
              </button>
            </div>
            {errors.password && <p className="form-error">{errors.password.message}</p>}
          </div>

          {error && <p className="form-error">{error}</p>}

          <button type="submit" className={styles.submitBtn} disabled={loading}>
            {loading ? 'Authenticating Account…' : '✓ Sign In to Portal'}
          </button>
        </form>

        {/* Footer & Registration Cues */}
        <div className={styles.footerSection}>
          <div className={styles.signupCard}>
            Don't have a farmer account yet?{' '}
            <a href="/register" className={styles.signupLink}>
              Register New Farmer Account →
            </a>
          </div>

          <p className={styles.forgotText}>
            Forgotten your credentials? Contact your local admin or logistics manager for account assistance.
          </p>
        </div>
      </div>
    </div>
  );
}
