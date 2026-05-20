import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import AppShell from '../../components/layout/AppShell';
import api from '../../api/client';

export default function CreateUser() {
  const navigate = useNavigate();
  const [trackerOn, setTrackerOn] = useState(false);
  const [error, setError] = useState('');
  const { register, handleSubmit, watch } = useForm({ defaultValues: { role: 'user' } });
  const password = watch('password');

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
        <button type="submit" className="btn-primary">Create User</button>
      </form>
    </AppShell>
  );
}
