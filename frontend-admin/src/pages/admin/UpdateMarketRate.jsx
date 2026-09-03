import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import AppShell from '../../components/layout/AppShell';
import api from '../../api/client';
import { todayISO } from '../../utils/format';
import styles from './UpdateMarketRate.module.css';

const MARKET_LOCATIONS = [
  { name: 'Coimbatore', key: 'coimbatore', abbr: 'CBE' },
  { name: 'Mamballi', key: 'mamballi', abbr: 'MBL' },
  { name: 'Ramnagar', key: 'ramnagar', abbr: 'RNG' },
  { name: 'Dharmapuri', key: 'dharmapuri', abbr: 'DHP' }
];

export default function UpdateMarketRate() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const editId = params.get('id');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const { register, handleSubmit, watch, reset, setValue } = useForm();

  const c = Number(watch('coimbatore')) || 0;
  const m = Number(watch('mamballi')) || 0;
  const r = Number(watch('ramnagar')) || 0;
  const d = Number(watch('dharmapuri')) || 0;

  const cAvg = Number(watch('coimbatoreAvg')) || 0;
  const mAvg = Number(watch('mamballiAvg')) || 0;
  const rAvg = Number(watch('ramnagarAvg')) || 0;
  const dAvg = Number(watch('dharmapuriAvg')) || 0;

  const validEntries = [
    { name: 'Coimbatore', rate: c, avg: cAvg },
    { name: 'Mamballi', rate: m, avg: mAvg },
    { name: 'Ramnagar', rate: r, avg: rAvg },
    { name: 'Dharmapuri', rate: d, avg: dAvg }
  ].filter(item => item.rate > 0 || item.avg > 0);

  const topRateObj = [...validEntries].sort((a, b) => b.rate - a.rate)[0];
  const topRate = topRateObj?.rate > 0 ? topRateObj.rate : 0;
  const topMarket = topRateObj?.name || '—';

  const avgRates = validEntries.map(x => x.avg).filter(x => x > 0);
  const calculatedAvg = avgRates.length
    ? Math.round(avgRates.reduce((a, b) => a + b, 0) / avgRates.length)
    : (validEntries.some(x => x.rate > 0) ? Math.round(validEntries.reduce((a, b) => a + b.rate, 0) / validEntries.filter(x => x.rate > 0).length) : 0);

  useEffect(() => {
    if (editId) {
      api.get(`/market-rates/${editId}`).then((res) => reset(res.data));
    } else {
      reset({ date: todayISO() });
    }
  }, [editId, reset]);

  const onSubmit = async (data) => {
    setError('');
    
    // Check if at least one rate or average rate was filled
    const hasAnyEntry = [
      data.coimbatore, data.coimbatoreAvg, data.coimbatoreMin,
      data.mamballi, data.mamballiAvg, data.mamballiMin,
      data.ramnagar, data.ramnagarAvg, data.ramnagarMin,
      data.dharmapuri, data.dharmapuriAvg, data.dharmapuriMin
    ].some(val => Number(val) > 0);

    if (!hasAnyEntry) {
      setError('Please enter rates for at least one market location before saving.');
      return;
    }

    setSaving(true);
    const body = {
      date: data.date,
      coimbatore: Number(data.coimbatore) || null,
      coimbatoreAvg: Number(data.coimbatoreAvg) || null,
      coimbatoreMin: Number(data.coimbatoreMin) || null,
      mamballi: Number(data.mamballi) || null,
      mamballiAvg: Number(data.mamballiAvg) || null,
      mamballiMin: Number(data.mamballiMin) || null,
      ramnagar: Number(data.ramnagar) || null,
      ramnagarAvg: Number(data.ramnagarAvg) || null,
      ramnagarMin: Number(data.ramnagarMin) || null,
      dharmapuri: Number(data.dharmapuri) || null,
      dharmapuriAvg: Number(data.dharmapuriAvg) || null,
      dharmapuriMin: Number(data.dharmapuriMin) || null
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
            } else {
              setSaving(false);
              return;
            }
          } else throw err;
        }
      }
      navigate('/admin/market-rates');
    } catch (err) {
      setError(err.response?.data?.error || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppShell title={editId ? "Edit Market Rate" : "Update Market Rate"} backPath="/admin/market-rates">
      <div className={styles.container}>
        {/* Date Selector Card */}
        <div className={styles.dateCard}>
          <div className={styles.dateHead}>
            <h3 className={styles.dateTitle}>
              <span>🗓️</span> Select Market Date
            </h3>
          </div>

          <div className={styles.dateInputWrap}>
            <input
              type="date"
              className={styles.dateInput}
              disabled={!!editId}
              {...register('date', { required: true })}
            />
            {!editId && (
              <button
                type="button"
                className={styles.todayQuickBtn}
                onClick={() => setValue('date', todayISO())}
              >
                Today
              </button>
            )}
          </div>
        </div>

        {/* Live Calculation Bar */}
        {(topRate > 0 || calculatedAvg > 0) && (
          <div className={styles.calcSummaryBar}>
            <div className={styles.calcItem}>
              <span className={styles.calcLbl}>Top Market Rate</span>
              <span className={styles.calcVal}>
                {topMarket}: ₹{topRate > 0 ? topRate : '—'} / kg
              </span>
            </div>
            <div className={styles.calcItem}>
              <span className={styles.calcLbl}>Average Overall Rate</span>
              <span className={styles.calcValGreen}>
                ₹{calculatedAvg > 0 ? calculatedAvg : '—'} / kg
              </span>
            </div>
          </div>
        )}

        {/* Form Grid */}
        <form onSubmit={handleSubmit(onSubmit)} className={styles.marketFormSection}>
          {MARKET_LOCATIONS.map((loc) => (
            <div key={loc.key} className={styles.marketCard}>
              <div className={styles.marketHeader}>
                <div className={styles.marketTitleGroup}>
                  <span className={styles.marketBadge}>{loc.abbr}</span>
                  <h4 className={styles.marketName}>{loc.name} Market</h4>
                </div>
              </div>

              <div className={styles.ratesGrid}>
                {/* Average Rate */}
                <div className={styles.rateInputGroup}>
                  <label className={styles.inputLabel}>Average Rate (₹/kg)</label>
                  <div className={styles.inputPrefixWrap}>
                    <span className={styles.currencyPrefix}>₹</span>
                    <input
                      type="number"
                      min={1}
                      className={styles.rateInput}
                      placeholder="Optional"
                      {...register(`${loc.key}Avg`, { min: 1 })}
                    />
                  </div>
                </div>

                {/* Base Rate */}
                <div className={styles.rateInputGroup}>
                  <label className={styles.inputLabel}>Base Rate (₹/kg)</label>
                  <div className={styles.inputPrefixWrap}>
                    <span className={styles.currencyPrefix}>₹</span>
                    <input
                      type="number"
                      min={1}
                      className={styles.rateInput}
                      placeholder="Optional"
                      {...register(loc.key, { min: 1 })}
                    />
                  </div>
                </div>

                {/* Minimum Rate */}
                <div className={styles.rateInputGroup}>
                  <label className={styles.inputLabel}>Minimum Rate (₹/kg)</label>
                  <div className={styles.inputPrefixWrap}>
                    <span className={styles.currencyPrefix}>₹</span>
                    <input
                      type="number"
                      min={1}
                      className={styles.rateInput}
                      placeholder="Optional"
                      {...register(`${loc.key}Min`, { min: 1 })}
                    />
                  </div>
                </div>
              </div>
            </div>
          ))}

          {error && <p className="form-error">{error}</p>}

          {/* Sticky Bottom Action Bar */}
          <div className={styles.saveActionBar}>
            <button
              type="button"
              className={styles.cancelBtn}
              onClick={() => navigate('/admin/market-rates')}
            >
              Cancel
            </button>
            <button type="submit" className={styles.saveBtn} disabled={saving}>
              <span>💾</span> {saving ? 'Saving Market Rates…' : 'Save Market Rates'}
            </button>
          </div>
        </form>
      </div>
    </AppShell>
  );
}
