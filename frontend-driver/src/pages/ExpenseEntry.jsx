import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import DriverShell from '../components/layout/DriverShell';
import api from '../api/client';
import { formatINR, todayISO, formatDateDayMonth } from '../utils/format';
import styles from './Expense.module.css';

const CATEGORIES = [
  { key: 'diesel', label: 'Diesel', icon: '⛽' },
  { key: 'food', label: 'Food & Tea', icon: '🍲' },
  { key: 'loading', label: 'Loading', icon: '📦' },
  { key: 'toll', label: 'Toll Gate', icon: '🛣️' },
  { key: 'repair', label: 'Repair', icon: '🔧' },
  { key: 'other', label: 'Other', icon: '📌' }
];

export default function ExpenseEntry() {
  const { vehicleId } = useParams();
  const navigate = useNavigate();
  const [vehicle, setVehicle] = useState(null);
  const [savedExpenses, setSavedExpenses] = useState([]);
  const [category, setCategory] = useState('diesel');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(todayISO());
  const [remarks, setRemarks] = useState('');
  const [lines, setLines] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get(`/driver/vehicles/${vehicleId}/expenses`);
      setVehicle(res.data.vehicle);
      setSavedExpenses(res.data.expenses || []);
    } catch {
      try {
        const res = await api.get(`/driver/vehicles/${vehicleId}`);
        setVehicle(res.data);
        const exp = await api.get(`/driver/vehicles/${vehicleId}/expenses`);
        setSavedExpenses(exp.data.expenses || []);
        setVehicle(exp.data.vehicle);
      } catch {
        navigate('/expense', { replace: true });
      }
    } finally {
      setLoading(false);
    }
  }, [vehicleId, navigate]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const totalPending = lines.reduce((s, l) => s + l.amount, 0);
  const balanceAfterPending = (vehicle?.balance ?? 0) - totalPending;

  const handleAdd = () => {
    const amt = Number(amount);
    if (!amt || amt <= 0) {
      setError('Please enter a valid expense amount in ₹');
      return;
    }
    setError('');
    setSuccess('');
    setLines((prev) => [
      ...prev,
      {
        id: `new-${Date.now()}-${prev.length}`,
        category,
        amount: amt,
        remarks: remarks.trim(),
        date
      }
    ]);
    setAmount('');
  };

  const removeLine = (id) => {
    setLines((prev) => prev.filter((l) => l.id !== id));
  };

  const handleSaveNew = async () => {
    if (lines.length === 0) {
      setError('Add at least one expense entry before saving');
      return;
    }
    setError('');
    setSuccess('');
    setSaving(true);
    try {
      for (const line of lines) {
        await api.post('/driver/expenses', {
          vehicleId,
          category: line.category,
          amount: line.amount,
          date: line.date || date,
          remarks: line.remarks || remarks
        });
      }
      setLines([]);
      setSuccess('✓ Expenses saved successfully');
      await loadData();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save expenses');
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (e) => {
    setEditingId(e._id);
    setEditForm({
      category: e.category,
      amount: e.amount,
      date: e.date,
      remarks: e.remarks || ''
    });
    setError('');
    setSuccess('');
  };

  const saveEdit = async () => {
    setSaving(true);
    setError('');
    try {
      await api.put(`/driver/expenses/${editingId}`, editForm);
      setEditingId(null);
      setSuccess('✓ Expense updated');
      await loadData();
    } catch (err) {
      setError(err.response?.data?.error || 'Update failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <DriverShell title="Record Vehicle Expense" backPath="/expense">
      <div className={styles.container}>
        {loading ? (
          <div className="app-loading">
            <div className="spinner" />
          </div>
        ) : (
          <>
            {/* Vehicle & Balance Hero */}
            <div className={styles.balanceHeroCard}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 16, fontWeight: 800 }}>🚚 {vehicle?.vehicleNumber}</span>
                {vehicle?.city && <span style={{ fontSize: 12, opacity: 0.8 }}>📍 {vehicle.city}</span>}
              </div>

              <div className={styles.balanceRowGrid}>
                <div className={styles.balanceBox}>
                  <span className={styles.balanceBoxLbl}>Total Advance</span>
                  <span className={styles.balanceBoxVal}>+{formatINR(vehicle?.advanceTotal)}</span>
                </div>

                <div className={styles.balanceBox}>
                  <span className={styles.balanceBoxLbl}>Available Cash</span>
                  <span className={styles.balanceBoxVal} style={{ color: '#10b981' }}>
                    {formatINR(vehicle?.balance)}
                  </span>
                </div>
              </div>
            </div>

            {/* Add New Expense Form */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <h3 style={{ fontSize: 15, fontWeight: 700, margin: '4px 0 0', color: '#1e293b' }}>
                ➕ Add Expense Entry
              </h3>

              {/* Date */}
              <div className={styles.fieldGroup}>
                <label className={styles.fieldLabel}>Expense Date</label>
                <input
                  className={styles.fieldInput}
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
              </div>

              {/* Category Selector */}
              <div className={styles.fieldGroup}>
                <label className={styles.fieldLabel}>Select Category</label>
                <div className={styles.catGrid}>
                  {CATEGORIES.map((c) => (
                    <button
                      key={c.key}
                      type="button"
                      className={`${styles.catBtn} ${category === c.key ? styles.catBtnActive : ''}`}
                      onClick={() => setCategory(c.key)}
                    >
                      <span style={{ fontSize: 16 }}>{c.icon}</span>
                      <span>{c.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Amount */}
              <div className={styles.fieldGroup}>
                <label className={styles.fieldLabel}>Amount (₹)</label>
                <div className={styles.prefixInputWrap}>
                  <span className={styles.currencyPrefix}>₹</span>
                  <input
                    className={`${styles.fieldInput} ${styles.prefixInput}`}
                    type="number"
                    min="1"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="Enter amount (e.g. 1500)"
                  />
                </div>
              </div>

              {/* Remarks */}
              <div className={styles.fieldGroup}>
                <label className={styles.fieldLabel}>Remarks / Details (Optional)</label>
                <input
                  className={styles.fieldInput}
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  placeholder="e.g. Diesel at Salem BPK"
                />
              </div>

              <button type="button" className={styles.addBtn} onClick={handleAdd}>
                ➕ Add Entry to List
              </button>
            </div>

            {/* Staged Items Card */}
            {lines.length > 0 && (
              <div className={styles.stagedCard}>
                <h4 className={styles.stagedTitle}>
                  📝 Pending Items ({lines.length})
                </h4>

                {lines.map((line) => (
                  <div key={line.id} className={styles.stagedLine}>
                    <div>
                      <div className={styles.stagedCat}>{line.category}</div>
                      {line.remarks ? <div className={styles.stagedSub}>{line.remarks}</div> : null}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span className={styles.stagedAmt}>− {formatINR(line.amount)}</span>
                      <button
                        type="button"
                        className={styles.removeBtn}
                        onClick={() => removeLine(line.id)}
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ))}

                <div className={styles.stagedCalculations}>
                  <div className={styles.calcRow}>
                    <span>Current Available Cash</span>
                    <strong>{formatINR(vehicle?.balance)}</strong>
                  </div>

                  <div className={styles.calcRow}>
                    <span>Total Added Items</span>
                    <strong style={{ color: 'var(--danger, #a93226)' }}>− {formatINR(totalPending)}</strong>
                  </div>

                  <div className={styles.balanceAfterRow}>
                    <span className={styles.balanceAfterLbl}>Cash Balance After</span>
                    <span className={styles.balanceAfterVal}>{formatINR(balanceAfterPending)}</span>
                  </div>
                </div>
              </div>
            )}

            {error && <p className="form-error">{error}</p>}
            {success && <p className="form-success">{success}</p>}

            <button
              type="button"
              className={styles.submitBtn}
              onClick={handleSaveNew}
              disabled={saving || lines.length === 0}
            >
              {saving ? 'Saving Expense Entries…' : '💾 Save Expenses'}
            </button>

            {/* Saved Expenses History */}
            {savedExpenses.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 8 }}>
                <h3 style={{ fontSize: 14, fontWeight: 700, margin: 0, color: '#1e293b' }}>
                  📜 Saved Expenses for this Trip ({savedExpenses.length})
                </h3>

                <div className={styles.savedList}>
                  {savedExpenses.map((e) => (
                    <div key={e._id} className={styles.savedCard}>
                      <div>
                        <span style={{ fontSize: 14, fontWeight: 700, textTransform: 'capitalize' }}>
                          {e.category}
                        </span>
                        <div style={{ fontSize: 11, color: '#64748b' }}>
                          🗓️ {formatDateDayMonth(e.date)}
                          {e.remarks ? ` · ${e.remarks}` : ''}
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{ fontSize: 15, fontWeight: 800, color: 'var(--danger, #a93226)' }}>
                          − {formatINR(e.amount)}
                        </span>
                        <button
                          type="button"
                          className={styles.editBtn}
                          onClick={() => startEdit(e)}
                        >
                          Edit
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </DriverShell>
  );
}
