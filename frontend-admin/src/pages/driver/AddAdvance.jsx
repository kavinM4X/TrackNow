import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import AppShell from '../../components/layout/AppShell';
import api from '../../api/client';
import { formatINR, todayISO } from '../../utils/format';
import dr from './Driver.module.css';

export default function AddAdvance() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [vehicle, setVehicle] = useState(null);
  const [error, setError] = useState('');
  const { register, handleSubmit, watch, reset } = useForm();
  const amount = Number(watch('amount')) || 0;

  useEffect(() => {
    api.get('/admin/driver/vehicles').then((r) => {
      const v = r.data.find((x) => x._id === id);
      setVehicle(v);
      reset({ vehicleId: id, date: todayISO(), amount: '' });
    });
  }, [id, reset]);

  const onSubmit = async (data) => {
    setError('');
    try {
      await api.post('/admin/driver/advances', {
        vehicleId: id,
        amount: Number(data.amount),
        date: data.date,
        remarks: data.remarks
      });
      navigate('/admin/driver/vehicles');
    } catch (err) {
      setError(err.response?.data?.error || 'Save failed');
    }
  };

  const prevBalance = vehicle?.balance ?? 0;
  const newBalance = prevBalance + amount;

  return (
    <AppShell title="Add Advance" backPath="/admin/driver/vehicles" driverSection hideNav>
      <form className="card" onSubmit={handleSubmit(onSubmit)}>
        <label className="field-label">Vehicle</label>
        <input className="field-input" readOnly value={vehicle?.vehicleNumber || ''} />
        <label className="field-label">Driver (auto-filled)</label>
        <input className="field-input" readOnly value={vehicle?.driverName || ''} />
        <label className="field-label">Advance Amount (₹)</label>
        <input type="number" min={1} className="field-input" {...register('amount', { required: true })} />
        <label className="field-label">Date</label>
        <input type="date" className="field-input" {...register('date', { required: true })} />
        <label className="field-label">Remarks</label>
        <input className="field-input" {...register('remarks')} />
        <div className={dr.previewBox}>
          <strong style={{ fontSize: 11 }}>Balance Preview</strong>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
            <span>Previous Balance</span>
            <span className={dr.pos}>{formatINR(prevBalance)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>+ New Advance</span>
            <span className={dr.bal}>{formatINR(amount)}</span>
          </div>
          <hr style={{ border: 'none', borderTop: '1px solid #ccc', margin: '8px 0' }} />
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <strong>New Balance</strong>
            <strong className={dr.pos}>{formatINR(newBalance)}</strong>
          </div>
        </div>
        {error && <p className="form-error">{error}</p>}
        <button type="submit" className="btn-primary">
          Save Advance
        </button>
      </form>
    </AppShell>
  );
}
