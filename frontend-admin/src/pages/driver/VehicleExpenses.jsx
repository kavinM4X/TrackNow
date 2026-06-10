import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import AppShell from '../../components/layout/AppShell';
import api from '../../api/client';
import { formatINR, formatDateDayMonth, todayISO } from '../../utils/format';
import dr from './Driver.module.css';

const CATEGORIES = ['diesel', 'food', 'loading', 'toll', 'repair', 'other'];

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
      setSuccess('Expenses saved');
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
      driverSection
      hideNav
      headerRight={
        <button type="button" className="topLink" onClick={() => navigate(`/admin/driver/vehicles/${id}/edit`)}>
          Trip details
        </button>
      }
    >
      {loading ? (
        <div className="spinner" />
      ) : (
        <>
          <div className={`card ${dr.vehicleCard}`}>
            <div className={dr.expenseTripDate}>Trip · {tripId}</div>
            <div className={dr.vehicleHead}>
              <div>
                <strong>{vehicle?.vehicleNumber}</strong>
                <div style={{ fontSize: 11, color: '#888' }}>
                  Driver: {vehicle?.driverName} · {vehicle?.city} · {vehicle?.status}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div className={`${dr.statVal} ${dr.pos}`}>{formatINR(vehicle?.balance)}</div>
                <div style={{ fontSize: 10, color: '#888' }}>Available Cash</div>
              </div>
            </div>
            <div className={dr.advanceRowAdmin}>
              <span>Advance amount</span>
              <span className={dr.pos}>+{formatINR(vehicle?.advanceTotal)}</span>
            </div>
          </div>

          <p className="section-title">Saved Expenses</p>
          {expenses.length === 0 ? (
            <p style={{ fontSize: 13, color: '#888', marginBottom: 12 }}>No expenses recorded yet.</p>
          ) : (
            expenses.map((e) =>
              editingId === e._id ? (
                <div key={e._id} className="card" style={{ marginBottom: 8 }}>
                  <select
                    className="field-select"
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
                    <button type="button" className="btn-primary" style={{ flex: 1 }} onClick={saveEdit} disabled={saving}>
                      Save
                    </button>
                    <button type="button" className="btn-outline" style={{ flex: 1 }} onClick={() => setEditingId(null)}>
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div key={e._id} className={dr.expenseLineAdmin}>
                  <div>
                    <strong style={{ textTransform: 'capitalize' }}>{e.category}</strong>
                    <div style={{ fontSize: 11, color: '#888' }}>
                      {formatDateDayMonth(e.date)}
                      {e.remarks ? ` · ${e.remarks}` : ''}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span className={dr.neg}>-{formatINR(e.amount)}</span>
                    <button type="button" className={dr.editExpBtn} onClick={() => startEdit(e)}>
                      Edit
                    </button>
                  </div>
                </div>
              )
            )
          )}

          <p className="section-title">Add New Expense</p>
          <label className="field-label">Date</label>
          <input className="field-input" type="date" value={date} onChange={(e) => setDate(e.target.value)} />

          <label className="field-label">Category</label>
          <div className={dr.catGrid}>
            {CATEGORIES.map((c) => (
              <button
                key={c}
                type="button"
                className={`${dr.catBtn} ${category === c ? dr.catBtnOn : ''}`}
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

          <button type="button" className={dr.addLineBtn} onClick={handleAdd}>
            + Add
          </button>

          {lines.length > 0 && (
            <div className={dr.expenseSummaryCard}>
              <p className={dr.expenseSummaryTitle}>Pending (not saved yet)</p>
              {lines.map((line) => (
                <div key={line.id} className={dr.expenseLineAdmin}>
                  <div>
                    <strong style={{ textTransform: 'capitalize' }}>{line.category}</strong>
                    {line.remarks ? (
                      <div style={{ fontSize: 11, color: '#888' }}>{line.remarks}</div>
                    ) : null}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span className={dr.neg}>-{formatINR(line.amount)}</span>
                    <button type="button" className={dr.removeLineBtn} onClick={() => removeLine(line.id)}>
                      ✕
                    </button>
                  </div>
                </div>
              ))}
              <div className={dr.expenseTotalsAdmin} style={{ marginTop: 10, padding: 10 }}>
                <div className={dr.previewRowAdmin}>
                  <span>Current Balance</span>
                  <span>{formatINR(vehicle?.balance)}</span>
                </div>
                <div className={dr.previewRowAdmin}>
                  <span>Total Added ({lines.length})</span>
                  <span className={dr.neg}>-{formatINR(totalPending)}</span>
                </div>
                <div className={dr.balanceAfterAdmin}>
                  <span>Balance After</span>
                  <span>{formatINR(balanceAfterPending)}</span>
                </div>
              </div>
            </div>
          )}

          <div className={dr.expenseTotalsAdmin}>
            <div className={dr.previewRowAdmin}>
              <span>Current Balance</span>
              <span>{formatINR(vehicle?.balance)}</span>
            </div>
            <div className={dr.previewRowAdmin}>
              <span>Total Expenses</span>
              <span className={dr.neg}>-{formatINR(vehicle?.expenseTotal)}</span>
            </div>
            <div className={dr.balanceAfterAdmin}>
              <span>Advance</span>
              <span className={dr.pos}>+{formatINR(vehicle?.advanceTotal)}</span>
            </div>
          </div>

          {error && <p className="form-error">{error}</p>}
          {success && <p className="form-success">{success}</p>}
          <button
            type="button"
            className="btn-primary"
            onClick={handleSaveNew}
            disabled={saving || lines.length === 0}
            style={{ marginTop: 8 }}
          >
            {saving ? 'Saving…' : 'Save Expense'}
          </button>
        </>
      )}
    </AppShell>
  );
}
