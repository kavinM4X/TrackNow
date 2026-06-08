import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import AppShell from '../../components/layout/AppShell';
import api from '../../api/client';
import { formatINR, formatDateDayMonth, todayISO } from '../../utils/format';
import dr from './Driver.module.css';

const CATEGORIES = ['diesel', 'food', 'loading', 'toll', 'repair', 'other'];

export default function VehicleExpenses() {
  const { id } = useParams();
  const [vehicle, setVehicle] = useState(null);
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [error, setError] = useState('');
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

  const startEdit = (e) => {
    setEditingId(e._id);
    setEditForm({
      category: e.category,
      amount: e.amount,
      date: e.date,
      remarks: e.remarks || ''
    });
    setError('');
  };

  const saveEdit = async () => {
    setSaving(true);
    setError('');
    try {
      await api.put(`/admin/driver/expenses/${editingId}`, editForm);
      setEditingId(null);
      load();
    } catch (err) {
      setError(err.response?.data?.error || 'Update failed');
    } finally {
      setSaving(false);
    }
  };

  const todayLabel = formatDateDayMonth(todayISO());

  return (
    <AppShell title="Vehicle Expenses" backPath="/admin/driver/vehicles" driverSection hideNav>
      {loading ? (
        <div className="spinner" />
      ) : (
        <>
          <div className={`card ${dr.vehicleCard}`}>
            <div className={dr.expenseTripDate}>{todayLabel}</div>
            <div className={dr.vehicleHead}>
              <div>
                <strong>{vehicle?.vehicleNumber}</strong>
                <div style={{ fontSize: 11, color: '#888' }}>
                  Driver: {vehicle?.driverName} · {vehicle?.status}
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

          <p className="section-title">Added Expenses</p>
          {expenses.length === 0 ? (
            <p style={{ fontSize: 13, color: '#888' }}>No expenses recorded yet.</p>
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
        </>
      )}
    </AppShell>
  );
}
