import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import DriverShell from '../components/layout/DriverShell';
import api, { clearSession, getStoredUser, getToken, setSession } from '../api/client';
import { initials } from '../utils/format';
import styles from './Profile.module.css';

export default function Profile({ onLogout }) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saveMsg, setSaveMsg] = useState('');
  const [saveErr, setSaveErr] = useState('');
  const [driverName, setDriverName] = useState('');
  const { register, handleSubmit, reset } = useForm();

  useEffect(() => {
    api
      .get('/auth/me')
      .then((res) => {
        const u = res.data.user;
        setDriverName(u.name || 'Driver');
        reset({
          name: u.name || '',
          phone: u.phone || '',
          email: u.email || ''
        });
      })
      .catch(() => {
        const stored = getStoredUser();
        if (stored) {
          setDriverName(stored.name || 'Driver');
          reset({
            name: stored.name || '',
            phone: stored.phone || '',
            email: stored.email || ''
          });
        }
      })
      .finally(() => setLoading(false));
  }, [reset]);

  const onSave = async (data) => {
    setSaveErr('');
    setSaveMsg('');
    try {
      const res = await api.put('/auth/profile', {
        name: data.name.trim(),
        phone: data.phone.trim(),
        email: data.email?.trim() || ''
      });
      const u = res.data.user;
      setDriverName(u.name || data.name);
      const stored = getStoredUser() || {};
      setSession(getToken(), { ...stored, ...u });
      setSaveMsg('✓ Profile updated successfully');
    } catch (err) {
      setSaveErr(err.response?.data?.message || 'Update failed');
    }
  };

  const handleLogout = () => {
    if (!window.confirm('Are you sure you want to sign out?')) return;
    clearSession();
    onLogout();
    navigate('/login', { replace: true });
  };

  return (
    <DriverShell title="Driver Profile">
      <div className={styles.container}>
        {loading ? (
          <div className="app-loading">
            <div className="spinner" />
          </div>
        ) : (
          <>
            {/* Driver Hero Header */}
            <div className={styles.heroCard}>
              <div className={styles.avatarRing}>
                {initials(driverName)}
              </div>
              <div className={styles.driverMeta}>
                <h2 className={styles.driverName}>{driverName}</h2>
                <span className={styles.roleBadge}>🚚 Logistics Driver Account</span>
              </div>
            </div>

            {/* Profile Form */}
            <form className={styles.formCard} onSubmit={handleSubmit(onSave)}>
              <h3 className={styles.cardSectionTitle}>👤 Personal Details</h3>

              <div className={styles.fieldGroup}>
                <label className={styles.fieldLabel}>Full Name</label>
                <input
                  className={styles.fieldInput}
                  placeholder="Enter full name"
                  {...register('name', { required: true })}
                />
              </div>

              <div className={styles.fieldGroup}>
                <label className={styles.fieldLabel}>Phone Number</label>
                <input
                  className={styles.fieldInput}
                  type="tel"
                  placeholder="Enter phone number"
                  {...register('phone', { required: true })}
                />
              </div>

              <div className={styles.fieldGroup}>
                <label className={styles.fieldLabel}>Email Address (Optional)</label>
                <input
                  className={styles.fieldInput}
                  type="email"
                  placeholder="Enter email address"
                  {...register('email')}
                />
              </div>

              {saveErr && <p className="form-error">{saveErr}</p>}
              {saveMsg && <p className="form-success">{saveMsg}</p>}

              <button type="submit" className={styles.saveBtn}>
                💾 Save Profile Changes
              </button>
            </form>

            {/* Logout & App Info Card */}
            <div className={styles.logoutCard}>
              <div className={styles.appInfoRow}>
                <span>SilkRoute Driver App</span>
                <strong>v2.4 (Logistics Build)</strong>
              </div>

              <button type="button" className={styles.logoutBtn} onClick={handleLogout}>
                <span>🚪</span> Sign Out of Driver Account
              </button>
            </div>
          </>
        )}
      </div>
    </DriverShell>
  );
}
