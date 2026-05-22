import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import AppShell from '../../components/layout/AppShell';
import api from '../../api/client';
import vr from './VehicleRental.module.css';

export default function CreateUser() {
  const navigate = useNavigate();
  const [trackerOn, setTrackerOn] = useState(false);
  const [error, setError] = useState('');
  const [invite, setInvite] = useState(null);
  const [inviteLoading, setInviteLoading] = useState(false);

  const { register, handleSubmit, watch } = useForm({ defaultValues: { role: 'user' } });
  const password = watch('password');

  const loadInvite = () => {
    api
      .get('/admin/user-invite')
      .then((r) => setInvite(r.data.hasLink ? r.data : null))
      .catch(console.error);
  };

  useEffect(() => {
    loadInvite();
  }, []);

  const generateInviteLink = async () => {
    setInviteLoading(true);
    try {
      const res = await api.post('/admin/user-invite');
      setInvite(res.data);
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to generate link');
    } finally {
      setInviteLoading(false);
    }
  };

  const copyInviteLink = async () => {
    if (!invite?.registerUrl) return;
    try {
      await navigator.clipboard.writeText(invite.registerUrl);
      alert('Link copied');
    } catch {
      alert('Could not copy link');
    }
  };

  const shareInviteLink = async () => {
    if (!invite?.registerUrl) return;
    const title = 'TrackNow — Create account';
    const text = 'Register your TrackNow farmer account (no expiry)';
    if (navigator.share) {
      try {
        await navigator.share({ title, text, url: invite.registerUrl });
        return;
      } catch (err) {
        if (err?.name === 'AbortError') return;
      }
    }
    await copyInviteLink();
  };

  const onSubmit = async (data) => {
    setError('');
    if (data.password !== data.confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    try {
      await api.post('/admin/users', {
        name: data.name,
        phone: data.phone,
        email: data.email,
        role: data.role,
        password: data.password,
        trackerEnabled: trackerOn,
        vehicleId: trackerOn ? data.vehicleId : null
      });
      navigate('/admin/users', { state: { success: 'User created successfully' } });
    } catch (err) {
      setError(err.response?.data?.error || 'Create failed');
    }
  };

  return (
    <AppShell title="Create User" backPath="/admin/users">
      <div className="card" style={{ marginBottom: 12 }}>
        <p className={vr.sectionTitle}>
          <span className={vr.sectionBar} />
          Share registration link
        </p>
        <p style={{ fontSize: 12, color: '#666', margin: '0 0 10px' }}>
          Anyone with this link can create a <strong>farmer (user)</strong> account — no login, no expiry.
        </p>
        <button
          type="button"
          className="btn-primary"
          disabled={inviteLoading}
          onClick={generateInviteLink}
        >
          {inviteLoading
            ? 'Generating…'
            : invite?.registerUrl
              ? 'Regenerate link'
              : 'Generate registration link'}
        </button>
        {invite?.registerUrl && (
          <div className={vr.linkBox} style={{ marginTop: 10 }}>
            <span className={vr.linkText}>{invite.registerUrl}</span>
            <div className={vr.linkActions}>
              <button type="button" className={vr.shareBtn} onClick={shareInviteLink}>
                Share
              </button>
              <button type="button" className={vr.copyBtn} onClick={copyInviteLink}>
                Copy
              </button>
            </div>
          </div>
        )}
      </div>

      <p className="section-title">Or create user manually</p>

      <form className="card" onSubmit={handleSubmit(onSubmit)}>
        <label className="field-label">Full Name</label>
        <input className="field-input" {...register('name', { required: true })} />
        <label className="field-label">Phone</label>
        <input
          className="field-input"
          type="tel"
          placeholder="e.g. 9876543210 or +919876543210"
          {...register('phone', { required: true })}
        />
        <p style={{ fontSize: 11, color: '#888', margin: '-8px 0 12px' }}>
          Client login uses this exact phone number (spaces are removed automatically).
        </p>
        <label className="field-label">Email</label>
        <input className="field-input" type="email" {...register('email')} />
        <label className="field-label">Role</label>
        <select className="field-select" {...register('role')}>
          <option value="user">user</option>
          <option value="admin">admin</option>
        </select>
        <label className="field-label">Password</label>
        <input type="password" className="field-input" {...register('password', { required: true, minLength: 6 })} />
        <label className="field-label">Confirm Password</label>
        <input
          type="password"
          className="field-input"
          {...register('confirmPassword', { required: true, validate: (v) => v === password })}
        />
        <hr style={{ border: 'none', borderTop: '1px solid #eee', margin: '12px 0' }} />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <div>
            <div style={{ fontWeight: 500 }}>Enable Tracker</div>
            <div style={{ fontSize: 11, color: '#aaa' }}>GPS tracking</div>
          </div>
          <button
            type="button"
            className={`toggle ${trackerOn ? 'on' : 'off'}`}
            onClick={() => setTrackerOn((v) => !v)}
          >
            <span />
          </button>
        </div>
        {trackerOn && (
          <div>
            <label className="field-label">Vehicle ID</label>
            <input className="field-input" {...register('vehicleId', { required: trackerOn })} />
          </div>
        )}
        {error && <p className="form-error">{error}</p>}
        <button type="submit" className="btn-primary">
          Create User
        </button>
      </form>
    </AppShell>
  );
}
