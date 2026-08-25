import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import AppShell from '../../components/layout/AppShell';
import api from '../../api/client';
import { initials, shortUserId } from '../../utils/format';
import styles from './EditUser.module.css';

export default function EditUser() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [showReset, setShowReset] = useState(false);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [saving, setSaving] = useState(false);
  const form = useForm();
  const resetForm = useForm();

  useEffect(() => {
    api.get(`/admin/users/${userId}`).then((res) => {
      const u = res.data.user;
      setUser(u);
      form.reset({
        name: u.name,
        phone: u.phone,
        isActive: u.isActive,
        trackerEnabled: u.trackerEnabled,
        vehicleId: res.data.trackerConfig?.vehicleId || u.vehicleId || ''
      });
    });
  }, [userId, form]);

  const save = async (data) => {
    setErr('');
    setMsg('');
    setSaving(true);
    try {
      const res = await api.put(`/admin/users/${userId}`, data);
      setUser(res.data);
      setMsg('✓ Account changes saved successfully');
    } catch (e) {
      setErr(e.response?.data?.error || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const resetPass = async (data) => {
    setErr('');
    setMsg('');
    if (data.newPassword !== data.confirmPassword) {
      setErr('New password and confirmation do not match.');
      return;
    }
    try {
      await api.post(`/admin/users/${userId}/reset-password`, {
        newPassword: data.newPassword
      });
      setMsg('✓ Password reset successfully');
      setShowReset(false);
      resetForm.reset();
    } catch (e) {
      setErr(e.response?.data?.error || 'Password reset failed');
    }
  };

  if (!user) {
    return (
      <AppShell title="Edit Farmer User" backPath="/admin/users">
        <div className="app-loading">
          <div className="spinner" />
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell title={`Edit ${user.name}`} backPath="/admin/users">
      <div className={styles.container}>
        {/* User Hero Header */}
        <div className={styles.profileHeroCard}>
          <div className={styles.profileLeft}>
            <div className={styles.avatarRing}>{initials(user.name)}</div>
            <div className={styles.userMeta}>
              <h2 className={styles.userName}>{user.name}</h2>
              <div className={styles.userSub}>
                ID: <strong>{shortUserId(user._id)}</strong>
                {user.phone && <span> · 📞 {user.phone}</span>}
              </div>
            </div>
          </div>

          <button
            type="button"
            className={styles.historyShortcutBtn}
            onClick={() => navigate(`/admin/batch-history/user/${userId}`)}
          >
            <span>📜</span> View Batch History
          </button>
        </div>

        {/* Main Form */}
        <form className={styles.formCard} onSubmit={form.handleSubmit(save)}>
          <h3 className={styles.cardSectionTitle}>👤 Personal Profile Details</h3>

          {/* Full Name */}
          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel}>Full Name</label>
            <input
              className={styles.fieldInput}
              placeholder="Enter farmer full name"
              {...form.register('name', { required: 'Name is required' })}
            />
          </div>

          {/* Phone Number */}
          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel}>Phone Number</label>
            <input
              className={styles.fieldInput}
              placeholder="Enter phone number"
              {...form.register('phone', { required: 'Phone is required' })}
            />
          </div>

          {/* Email Address (Read Only) */}
          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel}>Email Address (Read-only)</label>
            <input
              className={`${styles.fieldInput} ${styles.fieldInputDisabled}`}
              value={user.email || 'No email registered'}
              disabled
            />
          </div>

          <h3 className={styles.cardSectionTitle}>⚙️ Account Status & Feature Access</h3>

          {/* Account Active Toggle Box */}
          <label className={styles.toggleBox}>
            <div className={styles.toggleMeta}>
              <span className={styles.toggleTitle}>Account Status (Active)</span>
              <span className={styles.toggleSub}>
                Allow this farmer to log in and create harvest pickup bookings
              </span>
            </div>
            <input
              type="checkbox"
              className={styles.checkboxInput}
              {...form.register('isActive')}
            />
          </label>

          {/* Tracker Enabled Toggle Box */}
          <label className={styles.toggleBox}>
            <div className={styles.toggleMeta}>
              <span className={styles.toggleTitle}>Live GPS Tracker Enabled</span>
              <span className={styles.toggleSub}>
                Enable real-time vehicle logistics tracking for this user
              </span>
            </div>
            <input
              type="checkbox"
              className={styles.checkboxInput}
              {...form.register('trackerEnabled')}
            />
          </label>

          {/* Vehicle ID Assignment */}
          {form.watch('trackerEnabled') && (
            <div className={styles.fieldGroup}>
              <label className={styles.fieldLabel}>Assigned Logistics Vehicle ID</label>
              <input
                className={styles.fieldInput}
                placeholder="Enter assigned vehicle license or ID (e.g. TN-37-AB-1234)"
                {...form.register('vehicleId')}
              />
            </div>
          )}

          {err && <p className="form-error">{err}</p>}
          {msg && <p className="form-success">{msg}</p>}

          <button type="submit" className={styles.saveBtn} disabled={saving}>
            <span>💾</span> {saving ? 'Saving Changes…' : 'Save Changes'}
          </button>
        </form>

        {/* Security / Reset Password Card */}
        <div className={styles.formCard}>
          <h3 className={styles.cardSectionTitle}>🔒 Account Security</h3>

          <button
            type="button"
            className={styles.resetBtnToggle}
            onClick={() => setShowReset(!showReset)}
          >
            {showReset ? '▲ Hide Password Reset' : '🔑 Reset Farmer Password'}
          </button>

          {showReset && (
            <form
              className={styles.resetCard}
              onSubmit={resetForm.handleSubmit(resetPass)}
            >
              <h4 className={styles.resetTitle}>Reset Password for {user.name}</h4>
              <div className={styles.fieldGroup}>
                <label className={styles.fieldLabel}>New Password</label>
                <input
                  type="password"
                  className={styles.fieldInput}
                  placeholder="Enter new password (min 6 chars)"
                  {...resetForm.register('newPassword', { required: true, minLength: 6 })}
                />
              </div>
              <div className={styles.fieldGroup}>
                <label className={styles.fieldLabel}>Confirm New Password</label>
                <input
                  type="password"
                  className={styles.fieldInput}
                  placeholder="Confirm new password"
                  {...resetForm.register('confirmPassword', { required: true })}
                />
              </div>
              <button type="submit" className={styles.saveBtn}>
                Confirm Password Reset
              </button>
            </form>
          )}
        </div>
      </div>
    </AppShell>
  );
}
