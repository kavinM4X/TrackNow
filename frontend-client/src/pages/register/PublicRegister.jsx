import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import publicApi from '../../api/publicClient';
import styles from './PublicRegister.module.css';

export default function PublicRegister() {
  const { token } = useParams();
  const [valid, setValid] = useState(null);
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
      .then(() => setValid(true))
      .catch((err) => {
        setValid(false);
        setError(err.response?.data?.error || 'Invalid registration link');
      });
  }, [token]);

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
