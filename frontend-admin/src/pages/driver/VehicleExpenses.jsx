import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import AppShell from '../../components/layout/AppShell';
import api from '../../api/client';
import { formatINR, formatDateDayMonth, todayISO } from '../../utils/format';
import styles from './VehicleExpenses.module.css';

const CATEGORIES = [
  { key: 'diesel', label: '⛽ Diesel' },
  { key: 'food', label: '🍲 Food' },
  { key: 'loading', label: '📦 Loading' },
  { key: 'toll', label: '🛣️ Toll' },
  { key: 'repair', label: '🔧 Repair' },
  { key: 'other', label: '📝 Other' }
];

export default function VehicleExpenses() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [vehicle, setVehicle] = useState(null);
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [category, setCategory] = useState('diesel');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(todayISO());
  const [remarks, setRemarks] = useState('');
  const [lines, setLines] = useState([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    api
      .get(`/admin/driver/vehicles/${id}/expenses`)
      .then((r) => {
        setVehicle(r.data.vehicle);
        setExpenses(r.data.expenses || []);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const totalPending = lines.reduce((s, l) => s + l.amount, 0);
  const balanceAfterPending = (vehicle?.balance ?? 0) - totalPending;
  const tripId = id ? String(id).slice(-8).toUpperCase() : '';

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

  const removeLine = (lineId) => {
    setLines((prev) => prev.filter((l) => l.id !== lineId));
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
        await api.post('/admin/driver/expenses', {
          vehicleId: id,
          category: line.category,
          amount: line.amount,
          date: line.date || date,
          remarks: line.remarks || remarks
        });
      }
      setLines([]);
      setSuccess('Expenses recorded successfully');
      load();
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
      await api.put(`/admin/driver/expenses/${editingId}`, editForm);
      setEditingId(null);
      setSuccess('Expense updated');
      load();
    } catch (err) {
      setError(err.response?.data?.error || 'Update failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppShell
      title="Trip Expenses"
      backPath="/admin/driver/vehicles"
    >
      <div className={styles.container}>
        {loading ? (
          <div className="app-loading">
            <div className="spinner" />
          </div>
        ) : (
          <>
            {/* Vehicle Trip Hero Banner */}
            <div className={styles.heroBanner}>
              <div className={styles.heroHead}>
                <div>
                  <span className={styles.tripTag}>Trip ID · #{tripId}</span>
                  <h2 className={styles.vehicleTitle}>
                    <span>🚛</span> {vehicle?.vehicleNumber}
                  </h2>
                  <div className={styles.vehicleSub}>
                    Driver: <strong>{vehicle?.driverName || 'Unassigned'}</strong> · Location: {vehicle?.city || 'HQ'}
                  </div>
                </div>
                <div className={styles.balanceBox}>
                  <div className={styles.balanceVal}>{formatINR(vehicle?.balance)}</div>
                  <span className={styles.balanceLbl}>Available Cash</span>
                </div>
              </div>

              <div className={styles.heroFoot}>
                <span className={styles.advanceText}>
                  Advance Total: <strong>+{formatINR(vehicle?.advanceTotal)}</strong>
                </span>
                <button
                  type="button"
                  className={styles.editBtn}
                  onClick={() => navigate(`/admin/driver/vehicles/${id}/edit`)}
                >
                  Trip Details →
                </button>
              </div>
            </div>

            {/* Form Section: Add New Expense */}
            <div className={styles.sectionCard}>
              <div className={styles.sectionHeaderRow}>
                <h3 className={styles.sectionTitle}>
                  <span>➕</span> Record New Trip Expense
                </h3>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Select Category</label>
                <div className={styles.categoryGrid}>
                  {CATEGORIES.map((c) => (
                    <button
                      key={c.key}
                      type="button"
                      className={`${styles.categoryBtn} ${
                        category === c.key ? styles.categoryBtnActive : ''
                      }`}
                      onClick={() => setCategory(c.key)}
                    >
                      {c.label}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Expense Date</label>
                  <input
                    className={styles.fieldInput}
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Amount (₹)</label>
                  <input
                    className={styles.fieldInput}
                    type="number"
                    min="0"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="Enter amount..."
                  />
                </div>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Remarks (Optional)</label>
                <input
                  className={styles.fieldInput}
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  placeholder="e.g. Coimbatore highway toll / Diesel filling..."
                />
              </div>

              <button type="button" className={styles.addLineBtn} onClick={handleAdd}>
                + Add Expense Line
              </button>

              {lines.length > 0 && (
                <div className={styles.totalsCard}>
                  <strong style={{ fontSize: 13, color: '#b45309' }}>
                    ⏳ Unsaved Expenses Queue ({lines.length})
                  </strong>

                  {lines.map((line) => (
                    <div key={line.id} className={styles.expenseRow}>
                      <div>
                        <div className={styles.expenseCategory}>{line.category}</div>
                        {line.remarks && <span className={styles.expenseMeta}>{line.remarks}</span>}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span className={styles.expenseAmount}>-{formatINR(line.amount)}</span>
                        <button
                          type="button"
                          className={styles.editBtn}
                          style={{ background: '#fef2f2', color: '#dc2626', borderColor: '#fca5a5' }}
                          onClick={() => removeLine(line.id)}
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  ))}

                  <div className={styles.totalRowBold}>
                    <span>Balance After Pending</span>
                    <span>{formatINR(balanceAfterPending)}</span>
                  </div>
                </div>
              )}

              {error && <p className="form-error">{error}</p>}
              {success && <p className="form-success">{success}</p>}

              <button
                type="button"
                className={styles.saveExpenseBtn}
                onClick={handleSaveNew}
                disabled={saving || lines.length === 0}
              >
                {saving ? 'Saving Expense Queue…' : 'Save Expense Queue'}
              </button>
            </div>

            {/* Saved Expenses Section */}
            <div className={styles.sectionCard}>
              <div className={styles.sectionHeaderRow}>
                <h3 className={styles.sectionTitle}>
                  <span>🧾</span> Saved Trip Expenses ({expenses.length})
                </h3>
              </div>

              {expenses.length === 0 ? (
                <p className={styles.expenseMeta}>No expenses saved for this vehicle yet.</p>
              ) : (
                <div className={styles.expenseList}>
                  {expenses.map((e) =>
                    editingId === e._id ? (
                      <div key={e._id} className={styles.totalsCard}>
                        <div className={styles.formGroup}>
                          <label className={styles.formLabel}>Category</label>
                          <select
                            className={styles.fieldSelect}
                            value={editForm.category}
                            onChange={(ev) =>
                              setEditForm((f) => ({ ...f, category: ev.target.value }))
                            }
                          >
                            {CATEGORIES.map((c) => (
                              <option key={c.key} value={c.key}>
                                {c.label}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className={styles.formGroup}>
                          <label className={styles.formLabel}>Amount (₹)</label>
                          <input
                            className={styles.fieldInput}
                            type="number"
                            min="0"
                            value={editForm.amount}
                            onChange={(ev) =>
                              setEditForm((f) => ({ ...f, amount: ev.target.value }))
                            }
                          />
                        </div>

                        <div className={styles.formGroup}>
                          <label className={styles.formLabel}>Date</label>
                          <input
                            className={styles.fieldInput}
                            type="date"
                            value={editForm.date}
                            onChange={(ev) =>
                              setEditForm((f) => ({ ...f, date: ev.target.value }))
                            }
                          />
                        </div>

                        <div className={styles.formGroup}>
                          <label className={styles.formLabel}>Remarks</label>
                          <input
                            className={styles.fieldInput}
                            value={editForm.remarks}
                            onChange={(ev) =>
                              setEditForm((f) => ({ ...f, remarks: ev.target.value }))
                            }
                          />
                        </div>

                        <div style={{ display: 'flex', gap: 8 }}>
                          <button
                            type="button"
                            className={styles.saveExpenseBtn}
                            onClick={saveEdit}
                            disabled={saving}
                          >
                            Save
                          </button>
                          <button
                            type="button"
                            className={styles.addLineBtn}
                            onClick={() => setEditingId(null)}
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div key={e._id} className={styles.expenseRow}>
                        <div>
                          <div className={styles.expenseCategory}>{e.category}</div>
                          <div className={styles.expenseMeta}>
                            🗓️ {formatDateDayMonth(e.date)}
                            {e.remarks ? ` · ${e.remarks}` : ''}
                          </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <span className={styles.expenseAmount}>-{formatINR(e.amount)}</span>
                          <button
                            type="button"
                            className={styles.editBtn}
                            onClick={() => startEdit(e)}
                          >
                            ✎ Edit
                          </button>
                        </div>
                      </div>
                    )
                  )}
                </div>
              )}
            </div>

            {/* Financial Summary Card */}
            <div className={styles.totalsCard}>
              <div className={styles.totalRow}>
                <span>Current Available Balance</span>
                <strong>{formatINR(vehicle?.balance)}</strong>
              </div>
              <div className={styles.totalRow}>
                <span>Total Recorded Expenses</span>
                <span className={styles.expenseAmount}>-{formatINR(vehicle?.expenseTotal)}</span>
              </div>
              <div className={styles.totalRowBold}>
                <span>Total Advance Received</span>
                <span style={{ color: '#10b981' }}>+{formatINR(vehicle?.advanceTotal)}</span>
              </div>
            </div>
          </>
        )}
      </div>
    </AppShell>
  );
}
