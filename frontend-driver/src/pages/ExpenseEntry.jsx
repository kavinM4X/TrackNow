import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import DriverShell from '../components/layout/DriverShell';
import api from '../api/client';
import { formatINR, todayISO } from '../utils/format';
import styles from '../components/layout/DriverShell.module.css';

const CATEGORIES = ['diesel', 'food', 'loading', 'toll', 'repair', 'other'];

export default function ExpenseEntry() {
  const navigate = useNavigate();
  const [vehicle, setVehicle] = useState(null);
  const [category, setCategory] = useState('diesel');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(todayISO());
  const [remarks, setRemarks] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api
      .get('/driver/me')
      .then((res) => setVehicle(res.data.vehicle))
      .catch(console.error);
  }, []);

  const amt = Number(amount) || 0;
  const balanceAfter = (vehicle?.balance ?? 0) - amt;

  const handleSave = async () => {
    if (!amt || amt <= 0) {
      setError('Enter a valid amount');
      return;
    }
    setError('');
    setSaving(true);
    try {
      await api.post('/driver/expenses', { category, amount: amt, date, remarks });
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save expense');
    } finally {
      setSaving(false);
    }
  };

  return (
    <DriverShell title="Expense">
      <div className="card">
        <div style={{ fontSize: 12, color: '#888' }}>Vehicle</div>
        <strong>{vehicle?.vehicleNumber || '—'}</strong>
      </div>

      <label className="field-label">Category</label>
      <div className={styles.catGrid}>
        {CATEGORIES.map((c) => (
          <button
            key={c}
            type="button"
            className={`${styles.catBtn} ${category === c ? styles.catBtnOn : ''}`}
            onClick={() => setCategory(c)}
          >
            {c}
          </button>
        ))}
      </div>

      <label className="field-label">Amount (₹)</label>
      <input
        className="field-input"
        type="number"
        min="0"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
      />

      <label className="field-label">Date</label>
      <input
        className="field-input"
        type="date"
        value={date}
        onChange={(e) => setDate(e.target.value)}
      />

      <label className="field-label">Remarks (optional)</label>
      <input
        className="field-input"
        value={remarks}
        onChange={(e) => setRemarks(e.target.value)}
        placeholder="e.g. Chennai toll"
      />

      <div className={styles.previewBox}>
        <div className={styles.previewRow}>
          <span>Current Balance</span>
          <strong className={styles.pos}>{formatINR(vehicle?.balance)}</strong>
        </div>
        <div className={styles.previewRow}>
          <span>This Expense</span>
          <strong className={styles.neg}>-{formatINR(amt)}</strong>
        </div>
        <div className={styles.previewRow}>
          <span>Balance After</span>
          <strong>{formatINR(balanceAfter)}</strong>
        </div>
      </div>

      {error && <p className={styles.err}>{error}</p>}
      <button type="button" className="btn-amber" onClick={handleSave} disabled={saving}>
        {saving ? 'Saving…' : 'Save Expense'}
      </button>
    </DriverShell>
  );
}
