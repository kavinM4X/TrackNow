import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import DriverShell from '../components/layout/DriverShell';
import api from '../api/client';
import { formatINR, todayISO, formatDateDayMonth } from '../utils/format';
import styles from '../components/layout/DriverShell.module.css';

const CATEGORIES = ['diesel', 'food', 'loading', 'toll', 'repair', 'other'];

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
      setError('Enter a valid amount before adding');
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
      setError('Add at least one expense using the Add button');
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
      setSuccess('Expenses saved');
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
      setSuccess('Expense updated');
      await loadData();
    } catch (err) {
      setError(err.response?.data?.error || 'Update failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <DriverShell title="Record Expense" backPath="/expense">
      {loading ? (
        <div className="spinner" />
      ) : (
        <>
          <div className="card" style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 12, color: '#888' }}>Vehicle</div>
            <strong>{vehicle?.vehicleNumber}</strong>
            {vehicle?.city ? (
              <div style={{ fontSize: 11, color: '#888', marginTop: 4 }}>{vehicle.city}</div>
            ) : null}
            <div className={styles.advanceRow}>
              <span className={styles.advanceLbl}>Advance amount</span>
              <span className={styles.advanceVal}>+{formatINR(vehicle?.advanceTotal)}</span>
            </div>
            <div className={styles.advanceRow} style={{ borderTop: 'none', marginTop: 6, paddingTop: 0 }}>
              <span className={styles.advanceLbl}>Available Cash</span>
              <span className={styles.pos} style={{ fontWeight: 600 }}>
                {formatINR(vehicle?.balance)}
              </span>
            </div>
          </div>

          <p className="section-title">Saved Expenses</p>
          {savedExpenses.length === 0 ? (
            <p style={{ fontSize: 12, color: '#888', marginBottom: 12 }}>No expenses yet.</p>
          ) : (
            savedExpenses.map((e) =>
              editingId === e._id ? (
                <div key={e._id} className="card" style={{ marginBottom: 8 }}>
                  <select
                    className="field-input"
                    value={editForm.category}
                    onChange={(ev) => setEditForm((f) => ({ ...f, category: ev.target.value }))}
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                  <input
                    className="field-input"
                    type="number"
                    min="0"
                    value={editForm.amount}
                    onChange={(ev) => setEditForm((f) => ({ ...f, amount: ev.target.value }))}
                  />
                  <input
                    className="field-input"
                    type="date"
                    value={editForm.date}
                    onChange={(ev) => setEditForm((f) => ({ ...f, date: ev.target.value }))}
                  />
                  <input
                    className="field-input"
                    placeholder="Remarks"
                    value={editForm.remarks}
                    onChange={(ev) => setEditForm((f) => ({ ...f, remarks: ev.target.value }))}
                  />
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button type="button" className="btn-amber" style={{ flex: 1 }} onClick={saveEdit} disabled={saving}>
                      Save
                    </button>
                    <button type="button" className="btn-outline" style={{ flex: 1 }} onClick={() => setEditingId(null)}>
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div key={e._id} className={styles.savedExpenseLine}>
                  <div>
                    <strong style={{ textTransform: 'capitalize' }}>{e.category}</strong>
                    <div style={{ fontSize: 11, color: '#888' }}>
                      {formatDateDayMonth(e.date)}
                      {e.remarks ? ` · ${e.remarks}` : ''}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span className={styles.neg}>-{formatINR(e.amount)}</span>
                    <button type="button" className={styles.editExpBtn} onClick={() => startEdit(e)}>
                      Edit
                    </button>
                  </div>
                </div>
              )
            )
          )}

          <p className="section-title">Add New Expense</p>
          <label className="field-label">Date</label>
          <input
            className="field-input"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />

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
            placeholder="Enter amount for selected category"
          />

          <label className="field-label">Remarks (optional)</label>
          <input
            className="field-input"
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
            placeholder="e.g. Chennai toll"
          />

          <button type="button" className={styles.addLineBtn} onClick={handleAdd}>
            + Add
          </button>

          {lines.length > 0 && (
            <div className={styles.expenseSummaryCard}>
              <p className={styles.expenseSummaryTitle}>Pending (not saved yet)</p>
              {lines.map((line) => (
                <div key={line.id} className={styles.expenseLine}>
                  <div>
                    <strong style={{ textTransform: 'capitalize' }}>{line.category}</strong>
                    {line.remarks ? (
                      <div style={{ fontSize: 11, color: '#888' }}>{line.remarks}</div>
                    ) : null}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span className={styles.neg}>-{formatINR(line.amount)}</span>
                    <button type="button" className={styles.removeLineBtn} onClick={() => removeLine(line.id)}>
                      ✕
                    </button>
                  </div>
                </div>
              ))}

              <div className={styles.expenseTotals}>
                <div className={styles.previewRow}>
                  <span>Current Balance</span>
                  <span className={styles.previewSm}>{formatINR(vehicle?.balance)}</span>
                </div>
                <div className={styles.previewRow}>
                  <span>Total Added ({lines.length})</span>
                  <span className={`${styles.previewSm} ${styles.neg}`}>-{formatINR(totalPending)}</span>
                </div>
                <div className={styles.balanceAfterBlock}>
                  <span className={styles.balanceAfterLabel}>Balance After</span>
                  <span className={styles.balanceAfterVal}>{formatINR(balanceAfterPending)}</span>
                </div>
              </div>
            </div>
          )}

          {error && <p className={styles.err}>{error}</p>}
          {success && <p className="form-success">{success}</p>}
          <button
            type="button"
            className="btn-amber"
            onClick={handleSaveNew}
            disabled={saving || lines.length === 0}
          >
            {saving ? 'Saving…' : 'Save Expense'}
          </button>
        </>
      )}
    </DriverShell>
  );
}
