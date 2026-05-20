import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import AppShell from '../../components/layout/AppShell';
import api from '../../api/client';
import { todayISO } from '../../utils/format';

export default function UpdateMarketRate() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const editId = params.get('id');
  const [error, setError] = useState('');
  const { register, handleSubmit, watch, reset } = useForm();

  const c = Number(watch('coimbatore')) || 0;
  const m = Number(watch('mamballi')) || 0;
  const r = Number(watch('ramnagar')) || 0;
  const d = Number(watch('dharmapuri')) || 0;
  const cAvg = Number(watch('coimbatoreAvg')) || 0;
  const mAvg = Number(watch('mamballiAvg')) || 0;
  const rAvg = Number(watch('ramnagarAvg')) || 0;
  const dAvg = Number(watch('dharmapuriAvg')) || 0;
  const rates = [c, m, r, d];
  const avgRates = [cAvg, mAvg, rAvg, dAvg].filter((x) => x > 0);
  const topRate = Math.max(...rates);
  const topMarket = ['Coimbatore', 'Mamballi', 'Ramnagar', 'Dharmapuri'][rates.indexOf(topRate)];
  const minAvg = avgRates.length
    ? Math.round(avgRates.reduce((a, b) => a + b, 0) / avgRates.length)
    : (rates.some((x) => x > 0) ? Math.round((c + m + r + d) / 4) : 0);

  useEffect(() => {
    if (editId) {
      api.get(`/market-rates/${editId}`).then((res) => reset(res.data));
    } else {
      reset({ date: todayISO() });
    }
  }, [editId, reset]);

  const onSubmit = async (data) => {
    setError('');
    const body = {
      date: data.date,
      coimbatore: Number(data.coimbatore),
      coimbatoreAvg: Number(data.coimbatoreAvg) || null,
      mamballi: Number(data.mamballi),
      mamballiAvg: Number(data.mamballiAvg) || null,
      ramnagar: Number(data.ramnagar),
      ramnagarAvg: Number(data.ramnagarAvg) || null,
      dharmapuri: Number(data.dharmapuri),
      dharmapuriAvg: Number(data.dharmapuriAvg) || null
    };
    try {
      if (editId) {
        await api.put(`/market-rates/${editId}`, body);
      } else {
        try {
          await api.post('/market-rates', body);
        } catch (err) {
          if (err.response?.status === 409) {
            const existingId = err.response.data.id;
            if (window.confirm(`A rate for ${data.date} already exists. Update it?`)) {
              await api.put(`/market-rates/${existingId}`, body);
            } else return;
          } else throw err;
        }
      }
      navigate('/admin/market-rates');
    } catch (err) {
      setError(err.response?.data?.error || 'Save failed');
    }
  };

  return (
    <AppShell title="Update Market Rate" backPath="/admin/market-rates">
      <form className="card" onSubmit={handleSubmit(onSubmit)}>
        <label className="field-label">Date</label>
        <input
          type="date"
          className="field-input"
          disabled={!!editId}
          {...register('date', { required: true })}
        />
        <p className="section-title">Enter Rates (₹ per kg)</p>
        {[
          ['Coimbatore', 'coimbatore'],
          ['Mamballi', 'mamballi'],
          ['Ramnagar', 'ramnagar'],
          ['Dharmapuri', 'dharmapuri']
        ].map(([label, key]) => (
          <div key={label}>
            <label className="field-label">{label}</label>
            <input
              type="number"
              min={1}
              className="field-input"
              placeholder="Rate - manual enter"
              {...register(key, { required: true, min: 1 })}
            />
            <input
              type="number"
              min={1}
              className="field-input"
              placeholder="Avg - manual enter"
              {...register(`${key}Avg`, { min: 1 })}
            />
          </div>
        ))}
        {error && <p className="form-error">{error}</p>}
        <button type="submit" className="btn-primary">Save Rate</button>
      </form>
    </AppShell>
  );
}
