import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import DriverShell from '../components/layout/DriverShell';
import api from '../api/client';
import { formatINR, todayISO } from '../utils/format';
import styles from '../components/layout/DriverShell.module.css';

export default function SilkEntry() {
  const navigate = useNavigate();
  const [parties, setParties] = useState([]);
  const [partyId, setPartyId] = useState('');
  const [rates, setRates] = useState(null);
  const [goodKg, setGoodKg] = useState('');
  const [wasteKg, setWasteKg] = useState('');
  const [doubleKg, setDoubleKg] = useState('');
  const [date, setDate] = useState(todayISO());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/driver/parties').then((res) => {
      setParties(res.data);
      if (res.data[0]) setPartyId(res.data[0]._id);
    });
  }, []);

  useEffect(() => {
    if (!partyId) return;
    api.get('/driver/rates', { params: { partyId } }).then((res) => setRates(res.data));
  }, [partyId]);

  const amounts = useMemo(() => {
    if (!rates) return { goodAmt: 0, wasteAmt: 0, doubleAmt: 0, total: 0 };
    const g = Number(goodKg) || 0;
    const w = Number(wasteKg) || 0;
    const d = Number(doubleKg) || 0;
    const goodAmt = g * (rates.goodRate || 0);
    const wasteAmt = w * (rates.wasteRate || 0);
    const doubleAmt = d * (rates.doubleRate || 0);
    return { goodAmt, wasteAmt, doubleAmt, total: goodAmt + wasteAmt + doubleAmt };
  }, [goodKg, wasteKg, doubleKg, rates]);

  const handleSubmit = async () => {
    if (!partyId) {
      setError('Select a party');
      return;
    }
    setError('');
    setSaving(true);
    try {
      await api.post('/driver/entries', {
        partyId,
        date,
        goodKg: Number(goodKg) || 0,
        wasteKg: Number(wasteKg) || 0,
        doubleKg: Number(doubleKg) || 0
      });
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to submit entry');
    } finally {
      setSaving(false);
    }
  };

  return (
    <DriverShell title="Silk">
      <label className="field-label">Party</label>
      <select
        className="field-input"
        value={partyId}
        onChange={(e) => setPartyId(e.target.value)}
      >
        {parties.map((p) => (
          <option key={p._id} value={p._id}>
            {p.name} {p.village ? `· ${p.village}` : ''}
          </option>
        ))}
      </select>

      <label className="field-label">Date</label>
      <input
        className="field-input"
        type="date"
        value={date}
        onChange={(e) => setDate(e.target.value)}
      />

      <div className={`${styles.silkBox} ${styles.silkBoxGood}`} style={{ marginBottom: 8 }}>
        <div style={{ fontWeight: 600, fontSize: 13 }}>Good Silk</div>
        <div style={{ fontSize: 11, color: '#888' }}>Rate: {formatINR(rates?.goodRate)}/kg</div>
        <input
          className="field-input"
          type="number"
          min="0"
          step="0.1"
          placeholder="kg"
          value={goodKg}
          onChange={(e) => setGoodKg(e.target.value)}
        />
      </div>

      <div className={`${styles.silkBox} ${styles.silkBoxWaste}`} style={{ marginBottom: 8 }}>
        <div style={{ fontWeight: 600, fontSize: 13 }}>Waste Silk</div>
        <div style={{ fontSize: 11, color: '#888' }}>Rate: {formatINR(rates?.wasteRate)}/kg</div>
        <input
          className="field-input"
          type="number"
          min="0"
          step="0.1"
          placeholder="kg"
          value={wasteKg}
          onChange={(e) => setWasteKg(e.target.value)}
        />
      </div>

      <div className={`${styles.silkBox} ${styles.silkBoxDouble}`} style={{ marginBottom: 8 }}>
        <div style={{ fontWeight: 600, fontSize: 13 }}>Double Silk</div>
        <div style={{ fontSize: 11, color: '#888' }}>Rate: {formatINR(rates?.doubleRate)}/kg</div>
        <input
          className="field-input"
          type="number"
          min="0"
          step="0.1"
          placeholder="kg"
          value={doubleKg}
          onChange={(e) => setDoubleKg(e.target.value)}
        />
      </div>

      <div className={styles.previewBox}>
        <div className={styles.previewRow}>
          <span>Good</span>
          <span>{formatINR(amounts.goodAmt)}</span>
        </div>
        <div className={styles.previewRow}>
          <span>Waste</span>
          <span>{formatINR(amounts.wasteAmt)}</span>
        </div>
        <div className={styles.previewRow}>
          <span>Double</span>
          <span>{formatINR(amounts.doubleAmt)}</span>
        </div>
        <div className={styles.previewRow} style={{ borderTop: '1px solid #e8c9a8', paddingTop: 6, marginTop: 4 }}>
          <strong>Total</strong>
          <strong>{formatINR(amounts.total)}</strong>
        </div>
      </div>

      {error && <p className={styles.err}>{error}</p>}
      <button type="button" className="btn-amber" onClick={handleSubmit} disabled={saving}>
        {saving ? 'Submitting…' : 'Submit for Approval'}
      </button>
    </DriverShell>
  );
}
