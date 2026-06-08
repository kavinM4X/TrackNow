import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import AppShell from '../../components/layout/AppShell';
import api from '../../api/client';

export default function PartyForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id && id !== 'new');
  const [error, setError] = useState('');
  const { register, handleSubmit, reset } = useForm();

  useEffect(() => {
    if (isEdit) {
      api.get('/admin/driver/parties').then((r) => {
        const p = r.data.find((x) => x._id === id);
        if (p) reset(p);
      });
    }
  }, [id, isEdit, reset]);

  const onSubmit = async (data) => {
    setError('');
    const body = {
      name: data.name,
      phone: data.phone,
      village: data.village,
      goodRateOverride: data.goodRateOverride ? Number(data.goodRateOverride) : null,
      wasteRateOverride: data.wasteRateOverride ? Number(data.wasteRateOverride) : null,
      doubleRateOverride: data.doubleRateOverride ? Number(data.doubleRateOverride) : null
    };
    try {
      if (isEdit) {
        await api.put(`/admin/driver/parties/${id}`, body);
      } else {
        await api.post('/admin/driver/parties', body);
      }
      navigate('/admin/driver/parties');
    } catch (err) {
      setError(err.response?.data?.error || 'Save failed');
    }
  };

  return (
    <AppShell title={isEdit ? 'Edit Party' : 'Add Party'} backPath="/admin/driver/parties" driverSection hideNav>
      <form className="card" onSubmit={handleSubmit(onSubmit)}>
        <label className="field-label">Name</label>
        <input className="field-input" {...register('name', { required: true })} />
        <label className="field-label">Phone</label>
        <input className="field-input" type="tel" {...register('phone')} />
        <label className="field-label">Village</label>
        <input className="field-input" {...register('village')} />
        <p className="section-title">Rate overrides (optional)</p>
        <label className="field-label">Good rate ₹/kg</label>
        <input type="number" className="field-input" {...register('goodRateOverride')} />
        <label className="field-label">Waste rate ₹/kg</label>
        <input type="number" className="field-input" {...register('wasteRateOverride')} />
        <label className="field-label">Double rate ₹/kg</label>
        <input type="number" className="field-input" {...register('doubleRateOverride')} />
        {error && <p className="form-error">{error}</p>}
        <button type="submit" className="btn-primary">
          Save Party
        </button>
      </form>
    </AppShell>
  );
}
