import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import AppShell from '../../components/layout/AppShell';
import api from '../../api/client';
import { MARKETS, todayISO } from '../../utils/format';
import dr from './Driver.module.css';

const PAYMENT_METHODS = [
  { value: 'cash', label: 'Cash' },
  { value: 'upi', label: 'UPI' }
];

export default function VehicleForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id && id !== 'new');
  const [error, setError] = useState('');
  const [driverUsers, setDriverUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const { register, handleSubmit, reset, watch, setValue } = useForm({
    defaultValues: {
      status: 'active',
      tripLeg: 'go',
      driverUserId: '',
      city: '',
      advanceAmount: '',
      paymentMethod: 'cash',
      advanceDate: todayISO()
    }
  });
  const paymentMethod = watch('paymentMethod');

  useEffect(() => {
    api
      .get('/admin/driver/driver-users')
      .then((r) => setDriverUsers(r.data))
      .catch(console.error)
      .finally(() => setLoadingUsers(false));
  }, []);

  useEffect(() => {
    if (isEdit) {
      api.get('/admin/driver/vehicles').then((r) => {
        const v = r.data.find((x) => x._id === id);
        if (v) {
          reset({
            vehicleNumber: v.vehicleNumber,
            status: v.status,
            tripLeg: v.tripLeg || 'go',
            city: v.city || '',
            driverUserId: v.driverUserId?._id || v.driverUserId || ''
          });
        }
      });
    }
  }, [id, isEdit, reset]);

  const onSubmit = async (data) => {
    setError('');
    const driver = driverUsers.find((u) => u._id === data.driverUserId);
    if (!driver) {
      setError('Please select a driver');
      return;
    }
    if (!data.city) {
      setError('Please select a city');
      return;
    }
    const payload = {
      vehicleNumber: data.vehicleNumber,
      driverName: driver.name,
      driverUserId: driver._id,
      city: data.city,
      tripLeg: data.tripLeg === 'come' ? 'come' : 'go',
      status: data.status
    };
    if (!isEdit) {
      payload.advanceAmount = data.advanceAmount ? Number(data.advanceAmount) : 0;
      payload.paymentMethod = data.paymentMethod;
      payload.advanceDate = data.advanceDate || todayISO();
    }
    try {
      if (isEdit) {
        await api.put(`/admin/driver/vehicles/${id}`, payload);
      } else {
        await api.post('/admin/driver/vehicles', payload);
      }
      navigate('/admin/driver/vehicles');
    } catch (err) {
      setError(err.response?.data?.error || 'Save failed');
    }
  };

  return (
    <AppShell title={isEdit ? 'Edit Vehicle' : 'Add Vehicle'} backPath="/admin/driver/vehicles" driverSection hideNav>
      <form className="card" onSubmit={handleSubmit(onSubmit)}>
        <label className="field-label">Vehicle Number</label>
        <input className="field-input" {...register('vehicleNumber', { required: true })} />
        <p style={{ fontSize: 11, color: '#888', marginTop: -6, marginBottom: 10 }}>
          Same vehicle number can be used for multiple trips — each assignment gets a unique Trip ID.
        </p>

        <label className="field-label">Driver Name</label>
        <select className="field-select" {...register('driverUserId', { required: true })} disabled={loadingUsers}>
          <option value="">
            {loadingUsers ? 'Loading drivers…' : '— Select driver —'}
          </option>
          {driverUsers.map((u) => (
            <option key={u._id} value={u._id}>
              {u.name} · {u.phone}
              {u.role !== 'driver' ? ` (${u.role})` : ''}
            </option>
          ))}
        </select>
        {!loadingUsers && driverUsers.length === 0 && (
          <p style={{ fontSize: 11, color: '#888', marginTop: -6, marginBottom: 10 }}>
            No drivers yet. They can register in the Driver app, or create one under Users → Create
            (role: driver).
          </p>
        )}

        <label className="field-label">Trip</label>
        <select className="field-select" {...register('tripLeg')}>
          <option value="go">Go (outbound)</option>
          <option value="come">Come (return)</option>
        </select>

        <label className="field-label">City</label>
        <select className="field-select" {...register('city', { required: true })}>
          <option value="">— Select city —</option>
          {MARKETS.map((m) => (
            <option key={m.key} value={m.label}>
              {m.label}
            </option>
          ))}
        </select>

        {!isEdit && (
          <>
            <label className="field-label">Advance Amount (₹)</label>
            <input
              type="number"
              min="0"
              step="1"
              className="field-input"
              placeholder="Enter amount (optional)"
              {...register('advanceAmount')}
            />

            <label className="field-label">Payment Method</label>
            <div className={dr.filterRow}>
              {PAYMENT_METHODS.map((m) => (
                <button
                  key={m.value}
                  type="button"
                  className={`${dr.filterChip} ${paymentMethod === m.value ? dr.filterChipOn : ''}`}
                  onClick={() => setValue('paymentMethod', m.value)}
                >
                  {m.label}
                </button>
              ))}
            </div>
            <input type="hidden" {...register('paymentMethod')} />

            <label className="field-label">Advance Date</label>
            <input type="date" className="field-input" {...register('advanceDate')} />
          </>
        )}

        <label className="field-label">Status</label>
        <select className="field-select" {...register('status')}>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
        {error && <p className="form-error">{error}</p>}
        <button type="submit" className="btn-primary" disabled={loadingUsers || driverUsers.length === 0}>
          Save Vehicle
        </button>
      </form>
    </AppShell>
  );
}
