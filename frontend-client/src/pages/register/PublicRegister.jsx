import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import publicApi from '../../api/publicClient';
import styles from './PublicRegister.module.css';

function formatCountdown(ms) {
  if (ms <= 0) return '00:00:00';
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return [h, m, sec].map((n) => String(n).padStart(2, '0')).join(':');
}

export default function PublicRegister() {
  const { token } = useParams();
  const [valid, setValid] = useState(null);
  const [expiresAt, setExpiresAt] = useState(null);
  const [countdown, setCountdown] = useState('');
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    name: '',
    phone: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    publicApi
      .get(`/public/register-user/${token}`)
      .then((r) => {
        setValid(true);
        setExpiresAt(r.data.expiresAt);
        setError('');
      })
      .catch((err) => {
        setValid(false);
        const msg = err.response?.data?.error || 'Invalid registration link';
        setError(msg);
      });
  }, [token]);

  useEffect(() => {
    if (!expiresAt) return undefined;
    const tick = () => {
      const ms = new Date(expiresAt) - Date.now();
      setCountdown(formatCountdown(ms));
      if (ms <= 0) {
        setValid(false);
        setError('This registration link has expired');
      }
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [expiresAt]);

  const set = (key, val) => setForm((f) => ({ ...f, [key]: val }));

  const onSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    setSubmitting(true);
    try {
      await publicApi.post(`/public/register-user/${token}`, form);
      setDone(true);
    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed');
      if (err.response?.status === 410) setValid(false);
    } finally {
      setSubmitting(false);
    }
  };

  if (valid === null) {
    return (
      <div className={styles.wrap}>
        <p className={styles.center}>Loading…</p>
      </div>
    );
  }

  if (!valid) {
    return (
      <div className={styles.wrap}>
        <div className={styles.card}>
          <h1>Registration unavailable</h1>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  if (done) {
    return (
      <div className={styles.wrap}>
        <div className={styles.card}>
          <h1>Account created</h1>
          <p>You can now log in to TrackNow with your phone number and password.</p>
          <a href="/login" className={styles.loginBtn}>
            Go to login
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.header}>
        <h1>Create your account</h1>
        <p>Register as a farmer — no admin login needed</p>
        {expiresAt && (
          <div className={styles.expiryBar}>
            <span>Link expires in</span>
            <span className={styles.expiryTime}>{countdown}</span>
          </div>
        )}
      </div>
      <form className={styles.card} onSubmit={onSubmit}>
        <label className={styles.label}>Full name</label>
        <input
          className={styles.input}
          required
          value={form.name}
          onChange={(e) => set('name', e.target.value)}
        />

        <label className={styles.label}>Phone</label>
        <input
          className={styles.input}
          type="tel"
          required
          placeholder="e.g. 9876543210"
          value={form.phone}
          onChange={(e) => set('phone', e.target.value)}
        />
        <p className={styles.hint}>Use this phone to log in later.</p>

        <label className={styles.label}>Email (optional)</label>
        <input
          className={styles.input}
          type="email"
          value={form.email}
          onChange={(e) => set('email', e.target.value)}
        />

        <label className={styles.label}>Password</label>
        <input
          className={styles.input}
          type="password"
          required
          minLength={6}
          value={form.password}
          onChange={(e) => set('password', e.target.value)}
        />

        <label className={styles.label}>Confirm password</label>
        <input
          className={styles.input}
          type="password"
          required
          value={form.confirmPassword}
          onChange={(e) => set('confirmPassword', e.target.value)}
        />

        {error && <p className={styles.error}>{error}</p>}

        <button type="submit" className={styles.submitBtn} disabled={submitting}>
          {submitting ? 'Creating…' : 'Create account'}
        </button>
      </form>
    </div>
  );
}
