import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import DriverShell from '../components/layout/DriverShell';
import api from '../api/client';
import { formatINR } from '../utils/format';
import { calcSilkPreview, lotFieldsFromEntry } from '../utils/silkCalc';
import styles from './Parties.module.css';

export default function PartyBatchUser() {
  const { batchId, partyId } = useParams();
  const navigate = useNavigate();
  const [batch, setBatch] = useState(null);
  const [form, setForm] = useState({
    goodSilk: [{ kg: '', rate: '' }],
    waste: [{ kg: '', rate: '' }],
    doubles: [{ kg: '', rate: '' }],
    lotQty: '',
    lotPrice: ''
  });
  const [saving, setSaving] = useState(false);

  const setEntry = (field, index, key, value) => {
    setForm((f) => ({
      ...f,
      [field]: f[field].map((item, idx) =>
        idx === index ? { ...item, [key]: value } : item
      )
    }));
  };

  const addEntry = (field) => {
    setForm((f) => ({
      ...f,
      [field]: [...f[field], { kg: '', rate: '' }]
    }));
  };

  const removeEntry = (field, index) => {
    setForm((f) => ({
      ...f,
      [field]: f[field].length > 1 ? f[field].filter((_, idx) => idx !== index) : f[field]
    }));
  };

  useEffect(() => {
    const load = async () => {
      try {
        const [batchRes, ratesRes] = await Promise.all([
          api.get(`/driver/party-batches/${batchId}`),
          api.get('/driver/rates', { params: { partyId } })
        ]);
        setBatch(batchRes.data);
        const e = batchRes.data.entries?.find((x) => String(x.partyId) === partyId);
        const rates = ratesRes.data;
        if (e) {
          const lot = lotFieldsFromEntry(e);
          setForm({
            goodSilk: [{
              kg: e.goodSilkKg || '',
              rate: e.goodSilkRatePerKg || rates.goodRate || ''
            }],
            waste: [{
              kg: e.wasteKg || '',
              rate: e.wasteRatePerKg || rates.wasteRate || ''
            }],
            doubles: [{
              kg: e.doublesKg || '',
              rate: e.doublesRatePerKg || rates.doubleRate || ''
            }],
            lotQty: lot.lotQty,
            lotPrice: lot.lotPrice
          });
        }
      } catch {
        navigate(`/parties/${batchId}`);
      }
    };
    load();
  }, [batchId, partyId, navigate]);

  const entry = batch?.entries?.find((x) => String(x.partyId) === partyId);

  const rowDetails = useMemo(() => {
    const normalize = (rows) =>
      rows.map((row) => {
        const kg = Number(row.kg) || 0;
        const rate = Number(row.rate) || 0;
        return {
          kg,
          rate,
          amount: Math.round(kg * rate)
        };
      });

    return {
      good: normalize(form.goodSilk),
      waste: normalize(form.waste),
      doubles: normalize(form.doubles)
    };
  }, [form]);

  const totals = useMemo(() => {
    const aggregate = (rows) => {
      const totalKg = rows.reduce((sum, row) => sum + row.kg, 0);
      const totalAmt = rows.reduce((sum, row) => sum + row.amount, 0);
      return {
        totalKg,
        totalRate: totalKg > 0 ? Math.round(totalAmt / totalKg) : 0
      };
    };

    return {
      good: aggregate(rowDetails.good),
      waste: aggregate(rowDetails.waste),
      doubles: aggregate(rowDetails.doubles)
    };
  }, [rowDetails]);

  const otherFarmersGoodSilk = useMemo(() => {
    return (
      batch?.entries
        ?.filter((x) => String(x.partyId) !== partyId)
        .reduce((sum, e) => sum + (Number(e.goodSilkKg) || 0), 0) || 0
    );
  }, [batch, partyId]);

  const dynamicTotalGoodSilk = otherFarmersGoodSilk + totals.good.totalKg;

  const dynamicBaseRate =
    batch?.rentalAmount && dynamicTotalGoodSilk > 0
      ? batch.rentalAmount / dynamicTotalGoodSilk
      : 0;

  const dynamicEffectiveRate =
    Math.round((dynamicBaseRate + (Number(batch?.manualRateExtra) || 0)) * 100) / 100;

  const preview = useMemo(
    () =>
      calcSilkPreview(
        {
          goodSilkKg: totals.good.totalKg,
          goodSilkRatePerKg: totals.good.totalRate,
          wasteKg: totals.waste.totalKg,
          wasteRatePerKg: totals.waste.totalRate,
          doublesKg: totals.doubles.totalKg,
          doublesRatePerKg: totals.doubles.totalRate,
          lotQty: form.lotQty,
          lotPrice: form.lotPrice
        },
        dynamicEffectiveRate
      ),
    [totals, form.lotQty, form.lotPrice, dynamicEffectiveRate]
  );

  const locked = batch?.locked;

  const set = (key, val) => setForm((f) => ({ ...f, [key]: val }));

  const onSave = async () => {
    setSaving(true);
    try {
      const aggregateEntries = (rows) => {
        const valid = rows.map((row) => ({
          kg: Number(row.kg) || 0,
          rate: Number(row.rate) || 0
        }));
        const totalKg = valid.reduce((sum, row) => sum + row.kg, 0);
        const totalAmt = valid.reduce((sum, row) => sum + row.kg * row.rate, 0);
        return {
          totalKg,
          rate: totalKg > 0 ? Math.round(totalAmt / totalKg) : 0
        };
      };

      const good = aggregateEntries(form.goodSilk);
      const waste = aggregateEntries(form.waste);
      const doubles = aggregateEntries(form.doubles);

      const payload = {
        goodSilkKg: good.totalKg,
        goodSilkRatePerKg: good.rate,
        wasteKg: waste.totalKg,
        wasteRatePerKg: waste.rate,
        doublesKg: doubles.totalKg,
        doublesRatePerKg: doubles.rate,
        lotQty: Number(form.lotQty) || 0,
        lotPrice: Number(form.lotPrice) || 0
      };
      await api.put(`/driver/party-batches/${batchId}/parties/${partyId}`, payload);
      navigate(`/parties/${batchId}`);
    } catch (err) {
      alert(err.response?.data?.error || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  if (!batch || !entry) {
    return (
      <DriverShell title="Farmer Entry" backPath={`/parties/${batchId}`}>
        <div className="app-loading">
          <div className="spinner" />
        </div>
      </DriverShell>
    );
  }

  return (
    <DriverShell title={entry.partyName} backPath={`/parties/${batchId}`}>
      <div className={styles.container}>
        {/* Farmer Header Hero */}
        <div className={styles.calcCard} style={{ background: 'linear-gradient(135deg, #7b3f00 0%, #4a2600 100%)', color: '#ffffff' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 18, fontWeight: 800 }}>👤 {entry.partyName}</span>
            <span style={{ fontSize: 12, opacity: 0.9, background: 'rgba(255,255,255,0.2)', padding: '2px 8px', borderRadius: 4 }}>
              🌾 {totals.good.totalKg} kg
            </span>
          </div>
        </div>

        {/* Inputs & Auto Calculation Grid */}
        <div className={styles.calcCard}>
          <h3 className={styles.cardTitle} style={{ fontSize: 15, fontWeight: 700, margin: 0, color: '#1e293b' }}>
            📦 Harvest Cocoon Inputs
          </h3>

          {/* Good Silk Input */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--green, #2e7d52)' }}>🌾 Good Silk (kg)</span>
              <button
                type="button"
                style={{ background: 'var(--green-light)', color: 'var(--green)', border: '1px solid var(--green-border)', borderRadius: 6, padding: '2px 8px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
                onClick={() => addEntry('goodSilk')}
              >
                + Add Row
              </button>
            </div>
            {form.goodSilk.map((row, idx) => (
              <div key={idx} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <input
                  type="number"
                  step="0.1"
                  className={styles.miniInput}
                  style={{ width: '100%', textAlign: 'left' }}
                  placeholder="Kg"
                  disabled={locked}
                  value={row.kg}
                  onChange={(e) => setEntry('goodSilk', idx, 'kg', e.target.value)}
                />
                <input
                  type="number"
                  className={styles.miniInput}
                  style={{ width: '100%', textAlign: 'left' }}
                  placeholder="Rate ₹/kg"
                  disabled={locked}
                  value={row.rate}
                  onChange={(e) => setEntry('goodSilk', idx, 'rate', e.target.value)}
                />
              </div>
            ))}
          </div>

          {/* Waste Input */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 6 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: '#d97706' }}>🍂 Waste Silk (kg)</span>
              <button
                type="button"
                style={{ background: '#fef3c7', color: '#d97706', border: '1px solid #fde68a', borderRadius: 6, padding: '2px 8px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
                onClick={() => addEntry('waste')}
              >
                + Add Row
              </button>
            </div>
            {form.waste.map((row, idx) => (
              <div key={idx} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <input
                  type="number"
                  step="0.1"
                  className={styles.miniInput}
                  style={{ width: '100%', textAlign: 'left' }}
                  placeholder="Kg"
                  disabled={locked}
                  value={row.kg}
                  onChange={(e) => setEntry('waste', idx, 'kg', e.target.value)}
                />
                <input
                  type="number"
                  className={styles.miniInput}
                  style={{ width: '100%', textAlign: 'left' }}
                  placeholder="Rate ₹/kg"
                  disabled={locked}
                  value={row.rate}
                  onChange={(e) => setEntry('waste', idx, 'rate', e.target.value)}
                />
              </div>
            ))}
          </div>

          {/* Doubles Input */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 6 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: '#a0522d' }}>🌰 Doubles (kg)</span>
              <button
                type="button"
                style={{ background: '#f5ede8', color: '#a0522d', border: '1px solid #e2d2c9', borderRadius: 6, padding: '2px 8px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
                onClick={() => addEntry('doubles')}
              >
                + Add Row
              </button>
            </div>
            {form.doubles.map((row, idx) => (
              <div key={idx} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <input
                  type="number"
                  step="0.1"
                  className={styles.miniInput}
                  style={{ width: '100%', textAlign: 'left' }}
                  placeholder="Kg"
                  disabled={locked}
                  value={row.kg}
                  onChange={(e) => setEntry('doubles', idx, 'kg', e.target.value)}
                />
                <input
                  type="number"
                  className={styles.miniInput}
                  style={{ width: '100%', textAlign: 'left' }}
                  placeholder="Rate ₹/kg"
                  disabled={locked}
                  value={row.rate}
                  onChange={(e) => setEntry('doubles', idx, 'rate', e.target.value)}
                />
              </div>
            ))}
          </div>

          {/* Lot Input */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 6 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#7c3aed' }}>📦 Lot Deduction</span>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <input
                type="number"
                step="0.1"
                className={styles.miniInput}
                style={{ width: '100%', textAlign: 'left' }}
                placeholder="Lot Qty"
                disabled={locked}
                value={form.lotQty}
                onChange={(e) => set('lotQty', e.target.value)}
              />
              <input
                type="number"
                className={styles.miniInput}
                style={{ width: '100%', textAlign: 'left' }}
                placeholder="Price ₹"
                disabled={locked}
                value={form.lotPrice}
                onChange={(e) => set('lotPrice', e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Live Calculation Preview Card */}
        <div className={styles.calcCard} style={{ background: '#f8fafc' }}>
          <h4 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#1e293b' }}>🧮 Live Calculation Summary</h4>

          <div className={styles.calcRow}>
            <span>Good Silk Value</span>
            <strong style={{ color: 'var(--green, #2e7d52)' }}>+{formatINR(preview.goodAmt)}</strong>
          </div>

          <div className={styles.calcRow}>
            <span>Waste Silk Value</span>
            <strong style={{ color: '#d97706' }}>−{formatINR(preview.wasteAmt)}</strong>
          </div>

          <div className={styles.calcRow}>
            <span>Doubles Value</span>
            <strong style={{ color: '#a0522d' }}>−{formatINR(preview.doublesAmt)}</strong>
          </div>

          <div className={styles.effectiveBox} style={{ background: '#ffffff', borderColor: '#cbd5e1' }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#1e293b' }}>Net Total Harvest Value</span>
            <span className={styles.effectiveVal} style={{ color: 'var(--green, #2e7d52)' }}>
              {formatINR(preview.netSilk)}
            </span>
          </div>

          {dynamicEffectiveRate > 0 && (
            <div className={styles.calcRow} style={{ marginTop: 4 }}>
              <span>Rental Deduction ({totals.good.totalKg} kg × {formatINR(dynamicEffectiveRate)}/kg)</span>
              <strong style={{ color: '#dc2626' }}>−{formatINR(preview.rental)}</strong>
            </div>
          )}

          {(Number(form.lotQty) > 0 || Number(form.lotPrice) > 0) && (
            <div className={styles.calcRow}>
              <span>Lot Deduction ({form.lotQty || 0} × {formatINR(form.lotPrice || 0)})</span>
              <strong style={{ color: '#dc2626' }}>−{formatINR(preview.lotAmt)}</strong>
            </div>
          )}

          <div className={styles.effectiveBox}>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#7b3f00' }}>Farmer Rental Total Payout</span>
            <span className={styles.effectiveVal}>−{formatINR(preview.rentalTotal)}</span>
          </div>
        </div>

        {!locked && (
          <button
            type="button"
            className={styles.submitBtn}
            disabled={saving}
            onClick={onSave}
          >
            {saving ? 'Saving Entry…' : `💾 Save ${entry.partyName} Entry`}
          </button>
        )}
      </div>
    </DriverShell>
  );
}
