import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import AppShell from '../../components/layout/AppShell';
import api from '../../api/client';

export default function VehicleForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id && id !== 'new');
  const [error, setError] = useState('');
  const [driverUsers, setDriverUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const { register, handleSubmit, reset } = useForm({
    defaultValues: { status: 'active', driverUserId: '' }
  });

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
    const payload = {
      vehicleNumber: data.vehicleNumber,
      driverName: driver.name,
      driverUserId: driver._id,
      status: data.status
    };
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
