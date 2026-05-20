import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import AppShell from '../../components/layout/AppShell';
import api from '../../api/client';
import { initials, shortUserId } from '../../utils/format';

export default function EditUser() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [showReset, setShowReset] = useState(false);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
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
    try {
      const res = await api.put(`/admin/users/${userId}`, data);
      setUser(res.data);
      setMsg('✓ Changes saved');
    } catch (e) {
      setErr(e.response?.data?.error || 'Save failed');
    }
  };

  const resetPass = async (data) => {
    if (data.newPassword !== data.confirmPassword) return;
    await api.post(`/admin/users/${userId}/reset-password`, {
      newPassword: data.newPassword
    });
    setMsg('✓ Password reset');
    setShowReset(false);
    resetForm.reset();
  };

  if (!user) {
    return (
      <AppShell title="Edit User" backPath="/admin/users">
        <div className="spinner" />
      </AppShell>
    );
  }

  return (
    <AppShell title="Edit User" backPath="/admin/users">
      <div className="card" style={{ textAlign: 'center' }}>
        <div
          style={{
            width: 48,
            height: 48,
            borderRadius: '50%',
            background: 'var(--blue)',
            color: '#fff',
            margin: '0 auto 8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 600
          }}
        >
          {initials(user.name)}
        </div>
        <strong>{user.name}</strong>
        <div style={{ fontSize: 12, color: '#888' }}>{shortUserId(user._id)}</div>
      </div>

      <form className="card" onSubmit={form.handleSubmit(save)}>
        <label className="field-label">Name</label>
        <input className="field-input" {...form.register('name')} />
        <label className="field-label">Phone</label>
        <input className="field-input" {...form.register('phone')} />
        <label className="field-label">Email (read-only)</label>
        <input className="field-input" value={user.email || ''} disabled style={{ background: '#ededeb' }} />
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <input type="checkbox" {...form.register('isActive')} />
          Account active
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <input type="checkbox" {...form.register('trackerEnabled')} />
          Tracker enabled
        </label>
        {form.watch('trackerEnabled') && (
          <>
            <label className="field-label">Vehicle ID</label>
            <input className="field-input" {...form.register('vehicleId')} />
          </>
        )}
        {err && <p className="form-error">{err}</p>}
        {msg && <p className="form-success">{msg}</p>}
        <button
          type="button"
          className="btn-outline"
          style={{ marginBottom: 8 }}
          onClick={() => navigate(`/admin/batch-history/user/${userId}`)}
        >
          View Batch History
        </button>
        <button type="button" className="btn-outline" style={{ marginBottom: 8 }} onClick={() => setShowReset(!showReset)}>
          Reset Password
        </button>
        {showReset && (
          <div style={{ marginBottom: 12 }}>
            <input type="password" className="field-input" placeholder="New password" {...resetForm.register('newPassword')} />
            <input type="password" className="field-input" placeholder="Confirm" {...resetForm.register('confirmPassword')} />
            <button type="button" className="btn-primary" onClick={resetForm.handleSubmit(resetPass)}>
              Reset
            </button>
          </div>
        )}
        <button type="submit" className="btn-primary">Save Changes</button>
      </form>
    </AppShell>
  );
}
