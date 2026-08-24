import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import AppShell from '../../components/layout/AppShell';
import Spinner from '../../components/common/Spinner';
import api, { clearSession, deduplicatedGet, getStoredUser, getToken, setSession } from '../../api/client';
import { initials, shortUserId } from '../../utils/format';
import styles from './Settings.module.css';

export default function Settings({ onLogout }) {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [profileMsg, setProfileMsg] = useState('');
  const [profileErr, setProfileErr] = useState('');

  const profileForm = useForm();

  useEffect(() => {
    deduplicatedGet('/auth/me', {}, 15_000)
      .then((res) => {
        const u = res.data.user;
        setUser(u);
        profileForm.reset({
          name: u.name,
          phone: u.phone,
          email: u.email || ''
        });
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [profileForm]);

  const saveProfile = async (data) => {
    setProfileErr('');
    setProfileMsg('');
    try {
      const res = await api.put('/auth/profile', data);
      setUser(res.data.user);
      const stored = getStoredUser() || {};
      setSession(getToken(), { ...stored, ...res.data.user });
      setProfileMsg('✓ Profile details saved successfully');
    } catch (err) {
      setProfileErr(err.response?.data?.message || 'Update failed');
    }
  };

  const logout = () => {
    if (!window.confirm('Are you sure you want to log out of your farmer account?')) return;
    clearSession();
    onLogout();
    navigate('/login', { replace: true });
  };

  return (
    <AppShell title="Account Settings" subtitle="Manage profile, preferences & session security">
      <div className={styles.container}>
        {/* User Profile Header Card */}
        {loading ? (
          <div className={`${styles.skeleton} ${styles.skeletonHero}`} />
        ) : (
          <div className={styles.profileHeroCard}>
            <div className={styles.avatarRing}>
              {initials(user?.name)}
            </div>
            <h2 className={styles.userName}>{user?.name}</h2>
            <div className={styles.userSub}>
              Farmer ID: <strong>{shortUserId(user?.id)}</strong> · 📞 {user?.phone}
            </div>
            <span className={styles.roleChip}>Farmer Account</span>
          </div>
        )}

        {/* Edit Profile Form */}
        <form className={styles.formCard} onSubmit={profileForm.handleSubmit(saveProfile)}>
          <h3 className={styles.cardTitle}>👤 Edit Personal Profile</h3>

          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel}>Full Name</label>
            <input
              className={styles.fieldInput}
              placeholder="Enter full name"
              {...profileForm.register('name', { required: 'Name is required' })}
            />
          </div>

          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel}>Phone Number</label>
            <input
              className={styles.fieldInput}
              placeholder="Enter phone number"
              {...profileForm.register('phone', { required: 'Phone is required' })}
            />
          </div>

          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel}>Email Address (Optional)</label>
            <input
              className={styles.fieldInput}
              type="email"
              placeholder="Enter email address"
              {...profileForm.register('email')}
            />
          </div>

          {profileErr && <p className="form-error">{profileErr}</p>}
          {profileMsg && <p className="form-success">{profileMsg}</p>}

          <button type="submit" className={styles.saveBtn}>
            Save Profile Changes
          </button>
        </form>

        {/* System Info */}
        <div className={styles.infoCard}>
          <h3 className={styles.cardTitle}>ℹ️ Application Details</h3>
          <div className={styles.infoRow}>
            <span className={styles.infoLbl}>System Platform</span>
            <span className={styles.infoVal}>TrackNow Sericulture v2.4.0</span>
          </div>
          <div className={styles.infoRow}>
            <span className={styles.infoLbl}>Database Connection</span>
            <span className={styles.infoVal} style={{ color: 'var(--green, #2e7d52)' }}>
              ● Connected (MongoDB Atlas)
            </span>
          </div>
          <div className={styles.infoRow}>
            <span className={styles.infoLbl}>Session Auth</span>
            <span className={styles.infoVal}>JWT Secured</span>
          </div>
        </div>

        {/* Logout Button */}
        <button type="button" className={styles.logoutBtn} onClick={logout}>
          🚪 Log Out of Account
        </button>
      </div>
    </AppShell>
  );
}
