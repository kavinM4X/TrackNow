import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import api from '../api/client';
import { formatINR } from '../utils/format';
import { calcSilkPreview, lotFieldsFromEntry } from '../utils/silkCalc';
import styles from './DriverEntry.module.css';

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
  const rate = batch?.effectiveRatePerKg || 0;

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
        rate
      ),
    [totals, form.lotQty, form.lotPrice, rate]
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
      <div className={styles.wrap}>
        <div className={styles.expired}>Loading…</div>
      </div>
    );
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.header}>
        <div className={styles.headerTop}>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <Link to={`/parties/${batchId}`} className={styles.backLink}>
              ←
            </Link>
            <h1 style={{ margin: 0, fontSize: 18 }}>{entry.partyName}</h1>
          </div>
          <span
            style={{
              background: 'rgba(255,255,255,.2)',
              padding: '2px 8px',
              borderRadius: 4,
              fontSize: 12
            }}
          >
            {totals.good.totalKg} kg
          </span>
        </div>
      </div>

      <div className={styles.body}>
        <div className={styles.detailLayout}>
          <div className="card" style={{ padding: 12 }}>
            <p style={{ fontWeight: 600, marginBottom: 10 }}>Enter silk details</p>

            <div className={styles.silkBlock}>
              <div className={styles.sectionHeader}>
                <div className={`${styles.silkLabel} ${styles.silkGood}`}>Good silk (kg)</div>
                <button
                  type="button"
                  className={styles.addRowBtn}
                  onClick={() => addEntry('goodSilk')}
                >
                  + Add
                </button>
              </div>
              {form.goodSilk.map((row, index) => (
                <div key={index} className={styles.entryRow}>
                  <input
                    className={`${styles.silkInput} ${styles.silkInputGood}`}
                    type="number"
                    min="0"
                    step="0.1"
                    disabled={locked}
                    value={row.kg}
                    onChange={(e) => setEntry('goodSilk', index, 'kg', e.target.value)}
                  />
                  <div className={styles.rateBlock}>
                    <div className={`${styles.silkLabel} ${styles.silkGood}`}>Rate (₹/kg)</div>
                    <div className={styles.rowWithRemove}>
                      <input
                        className={`${styles.silkInput} ${styles.silkInputGood}`}
                        type="number"
                        min="0"
                        disabled={locked}
                        value={row.rate}
                        onChange={(e) => setEntry('goodSilk', index, 'rate', e.target.value)}
                      />
                      {form.goodSilk.length > 1 && (
                        <button
                          type="button"
                          className={styles.removeRowBtn}
                          onClick={() => removeEntry('goodSilk', index)}
                          aria-label="Remove good silk row"
                        >
                          ×
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className={styles.silkBlock}>
              <div className={styles.sectionHeader}>
                <div className={`${styles.silkLabel} ${styles.silkWaste}`}>Waste (kg)</div>
                <button
                  type="button"
                  className={styles.addRowBtn}
                  onClick={() => addEntry('waste')}
                >
                  + Add
                </button>
              </div>
              {form.waste.map((row, index) => (
                <div key={index} className={styles.entryRow}>
                  <input
                    className={styles.silkInput}
                    type="number"
                    min="0"
                    step="0.1"
                    disabled={locked}
                    value={row.kg}
                    onChange={(e) => setEntry('waste', index, 'kg', e.target.value)}
                  />
                  <div className={styles.rateBlock}>
                    <div className={`${styles.silkLabel} ${styles.silkWaste}`}>Rate (₹/kg)</div>
                    <div className={styles.rowWithRemove}>
                      <input
                        className={styles.silkInput}
                        type="number"
                        min="0"
                        disabled={locked}
                        value={row.rate}
                        onChange={(e) => setEntry('waste', index, 'rate', e.target.value)}
                      />
                      {form.waste.length > 1 && (
                        <button
                          type="button"
                          className={styles.removeRowBtn}
                          onClick={() => removeEntry('waste', index)}
                          aria-label="Remove waste row"
                        >
                          ×
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className={styles.silkBlock}>
              <div className={styles.sectionHeader}>
                <div className={`${styles.silkLabel} ${styles.silkDoubles}`}>Doubles (kg)</div>
                <button
                  type="button"
                  className={styles.addRowBtn}
                  onClick={() => addEntry('doubles')}
                >
                  + Add
                </button>
              </div>
              {form.doubles.map((row, index) => (
                <div key={index} className={styles.entryRow}>
                  <input
                    className={styles.silkInput}
                    type="number"
                    min="0"
                    step="0.1"
                    disabled={locked}
                    value={row.kg}
                    onChange={(e) => setEntry('doubles', index, 'kg', e.target.value)}
                  />
                  <div className={styles.rateBlock}>
                    <div className={`${styles.silkLabel} ${styles.silkDoubles}`}>Rate (₹/kg)</div>
                    <div className={styles.rowWithRemove}>
                      <input
                        className={styles.silkInput}
                        type="number"
                        min="0"
                        disabled={locked}
                        value={row.rate}
                        onChange={(e) => setEntry('doubles', index, 'rate', e.target.value)}
                      />
                      {form.doubles.length > 1 && (
                        <button
                          type="button"
                          className={styles.removeRowBtn}
                          onClick={() => removeEntry('doubles', index)}
                          aria-label="Remove doubles row"
                        >
                          ×
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className={styles.silkBlock}>
              <div className={`${styles.silkLabel} ${styles.silkLot}`}>Lot</div>
              <div className={styles.silkGrid}>
                <input
                  className={styles.silkInput}
                  type="number"
                  min="0"
                  step="0.1"
                  disabled={locked}
                  value={form.lotQty}
                  onChange={(e) => set('lotQty', e.target.value)}
                />
                <div>
                  <div className={`${styles.silkLabel} ${styles.silkLot}`}>Price (₹)</div>
                  <input
                    className={styles.silkInput}
                    type="number"
                    min="0"
                    disabled={locked}
                    value={form.lotPrice}
                    onChange={(e) => set('lotPrice', e.target.value)}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className={styles.calcPanel}>
            <p style={{ fontWeight: 600, marginBottom: 8 }}>Auto calculation</p>
            <div className={styles.calcSection}>
              <div className={styles.calcSectionHeader}>Good</div>
              {rowDetails.good.map((row, index) => (
                <div key={index} className={styles.calcLine}>
                  <span>
                    {row.kg} × {formatINR(row.rate)}
                  </span>
                  <span className={styles.pos}>+{formatINR(row.amount)}</span>
                </div>
              ))}
              <div className={styles.calcTotalLine}>
                <span>Total</span>
                <span>{formatINR(preview.goodAmt)}</span>
              </div>
            </div>

            <div className={styles.calcSection}>
              <div className={styles.calcSectionHeader}>Waste</div>
              {rowDetails.waste.map((row, index) => (
                <div key={index} className={styles.calcLine}>
                  <span>
                    {row.kg} × {formatINR(row.rate)}
                  </span>
                  <span className={styles.neg}>−{formatINR(row.amount)}</span>
                </div>
              ))}
              <div className={styles.calcTotalLine}>
                <span>Total</span>
                <span>{formatINR(preview.wasteAmt)}</span>
              </div>
            </div>

            <div className={styles.calcSection}>
              <div className={styles.calcSectionHeader}>Doubles</div>
              {rowDetails.doubles.map((row, index) => (
                <div key={index} className={styles.calcLine}>
                  <span>
                    {row.kg} × {formatINR(row.rate)}
                  </span>
                  <span className={styles.neg}>−{formatINR(row.amount)}</span>
                </div>
              ))}
              <div className={styles.calcTotalLine}>
                <span>Total</span>
                <span>{formatINR(preview.doublesAmt)}</span>
              </div>
            </div>
            <div className={styles.netBox}>
              <span>Total value</span>
              <span>{formatINR(preview.netSilk)}</span>
            </div>
            <div className={styles.finalBox}>
              <p style={{ fontWeight: 600, margin: '0 0 8px' }}>Rental total value</p>
              {rate > 0 && (
                <div className={styles.calcLine}>
                  <span>
                    Rental: {totals.good.totalKg} kg × {formatINR(rate)}
                  </span>
                  <span className={styles.neg}>−{formatINR(preview.rental)}</span>
                </div>
              )}
              {(Number(form.lotQty) > 0 || Number(form.lotPrice) > 0) && (
                <div className={styles.calcLine}>
                  <span>
                    Lot: {Number(form.lotQty) || 0} × {formatINR(Number(form.lotPrice) || 0)}
                  </span>
                  <span className={styles.neg}>−{formatINR(preview.lotAmt)}</span>
                </div>
              )}
              <div className={styles.rentalTotalRow}>
                <span>Rental total value</span>
                <span style={{ fontSize: 18 }}>−{formatINR(preview.rentalTotal)}</span>
              </div>
            </div>
          </div>
        </div>

        {!locked && (
          <button type="button" className={styles.submitBtn} disabled={saving} onClick={onSave}>
            {saving ? 'Saving…' : `Save ${entry.partyName}`}
          </button>
        )}
      </div>
    </div>
  );
}
