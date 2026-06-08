import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import AppShell from '../../components/layout/AppShell';
import api from '../../api/client';

export default function RateSettings() {
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const { register, handleSubmit, reset } = useForm();

  useEffect(() => {
    api.get('/admin/driver/rates').then((r) => reset(r.data));
  }, [reset]);

  const onSubmit = async (data) => {
    setError('');
    try {
      await api.put('/admin/driver/rates', {
        goodRate: Number(data.goodRate),
        wasteRate: Number(data.wasteRate),
        doubleRate: Number(data.doubleRate)
      });
      navigate('/admin/driver/parties');
    } catch (err) {
      setError(err.response?.data?.error || 'Save failed');
    }
  };

  return (
    <AppShell title="Rate Management" backPath="/admin/driver/parties" driverSection hideNav>
      <form className="card" onSubmit={handleSubmit(onSubmit)}>
        <p className="section-title">Global Rates (₹ per kg)</p>
        <label className="field-label">Good Silk</label>
        <input type="number" className="field-input" {...register('goodRate', { required: true })} />
        <label className="field-label">Waste Silk</label>
        <input type="number" className="field-input" {...register('wasteRate', { required: true })} />
        <label className="field-label">Double Silk</label>
        <input type="number" className="field-input" {...register('doubleRate', { required: true })} />
        {error && <p className="form-error">{error}</p>}
        <button type="submit" className="btn-primary">
          Save Global Rates
        </button>
      </form>
    </AppShell>
  );
}
