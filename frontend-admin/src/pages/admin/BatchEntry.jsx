import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import AppShell from '../../components/layout/AppShell';
import api from '../../api/client';
import { formatDateShort, formatINR, MARKETS, shortUserId, todayISO } from '../../utils/format';
import styles from './BatchEntry.module.css';

function roundMoney(n) {
  return Math.round(Number(n) || 0);
}

export default function BatchEntry() {
  const location = useLocation();
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [recent, setRecent] = useState([]);
  const [marketRate, setMarketRate] = useState(null);
  const [ratesLoading, setRatesLoading] = useState(false);
  const [success, setSuccess] = useState('');

  const { register, handleSubmit, watch, reset, setValue } = useForm({
    defaultValues: {
      date: todayISO(),
      location: 'Coimbatore',
      linkedBookingId: '',
      goodSilkKg: '',
      wasteKg: 0,
      doubles: 0,
      goodSilkRatePerKg: '',
      wasteRatePerKg: '',
      doublesRatePerKg: '',
      notes: ''
    }
  });

  const userId = watch('userId');
  const date = watch('date');
  const market = watch('location');
  const goodKg = watch('goodSilkKg');
  const wasteKg = watch('wasteKg');
  const doublesKg = watch('doubles');
  const goodRate = watch('goodSilkRatePerKg');
  const wasteRate = watch('wasteRatePerKg');
  const doublesRate = watch('doublesRatePerKg');

  const goodNum = Number(goodKg) || 0;
  const wasteNum = Number(wasteKg) || 0;
  const doublesNum = Number(doublesKg) || 0;
  const gr = Number(goodRate) || 0;
  const wr = Number(wasteRate) || 0;
  const dr = Number(doublesRate) || 0;

  const totalKg = useMemo(
    () => Math.round((goodNum + wasteNum + doublesNum) * 10) / 10,
    [goodNum, wasteNum, doublesNum]
  );

  const goodAmt = useMemo(() => roundMoney(goodNum * gr), [goodNum, gr]);
  const wasteAmt = useMemo(() => roundMoney(wasteNum * wr), [wasteNum, wr]);
  const doublesAmt = useMemo(() => roundMoney(doublesNum * dr), [doublesNum, dr]);

  const totalAmount = useMemo(
    () => goodAmt + wasteAmt + doublesAmt,
    [goodAmt, wasteAmt, doublesAmt]
  );

  const loadRecent = () => {
    api.get('/admin/batches/recent').then((r) => setRecent(r.data)).catch(console.error);
  };

  const loadBookingsForUser = (uid) => {
    if (!uid) {
      setBookings([]);
      return;
    }
    api
      .get('/admin/bookings', { params: { userId: uid } })
      .then((r) => {
        const list = r.data.bookings || r.data || [];
        setBookings(
          list.filter((b) => b.status === 'pending' || b.status === 'confirmed')
        );
      })
      .catch(console.error);
  };

  useEffect(() => {
    api.get('/admin/users').then((r) => setUsers(r.data));
    loadRecent();
    const prefill = location.state?.prefill;
    if (prefill) {
      const qty = prefill.quantityKg ?? prefill.totalWeightKg ?? '';
      reset({
        userId: prefill.userId || '',
        date: prefill.date || todayISO(),
        location: prefill.location || 'Coimbatore',
        linkedBookingId: prefill.linkedBookingId || '',
        goodSilkKg: qty === '' ? '' : qty,
        wasteKg: 0,
        doubles: 0,
        goodSilkRatePerKg: '',
        wasteRatePerKg: '',
        doublesRatePerKg: '',
        notes: ''
      });
      if (prefill.userId) loadBookingsForUser(prefill.userId);
    }
  }, [location.state, reset]);

  useEffect(() => {
    loadBookingsForUser(userId);
  }, [userId]);

  const linkedBookingId = watch('linkedBookingId');
  useEffect(() => {
    if (!linkedBookingId) return;
    const b = bookings.find((x) => x._id === linkedBookingId);
    if (b?.location) {
      reset((prev) => ({ ...prev, location: b.location, date: b.date || prev.date }));
    }
  }, [linkedBookingId, bookings, reset]);

  useEffect(() => {
    if (!date) {
      setMarketRate(null);
      return;
    }
    setRatesLoading(true);
    api
      .get(`/market-rates/for-date/${date}`)
      .then((r) => setMarketRate(r.data))
      .catch(() => setMarketRate(null))
      .finally(() => setRatesLoading(false));
  }, [date]);

  const applyReferenceRateToGoodSilk = (amount) => {
    if (amount != null) setValue('goodSilkRatePerKg', amount);
  };

  const onSubmit = async (data) => {
    setSuccess('');
    if (totalKg <= 0) {
      alert('Enter at least one weight (good silk, waste, or doubles).');
      return;
    }
    try {
      await api.post('/admin/batches', {
        userId: data.userId,
        date: data.date,
        location: data.location,
        goodSilkKg: data.goodSilkKg,
        wasteKg: data.wasteKg,
        doubles: data.doubles,
        goodSilkRatePerKg: data.goodSilkRatePerKg,
        wasteRatePerKg: data.wasteRatePerKg,
        doublesRatePerKg: data.doublesRatePerKg,
        linkedBookingId: data.linkedBookingId || null,
        notes: data.notes
      });
      setSuccess('✓ Batch entry saved');
      reset({
        userId: data.userId,
        date: todayISO(),
        location: 'Coimbatore',
        linkedBookingId: '',
        goodSilkKg: '',
        wasteKg: 0,
        doubles: 0,
        goodSilkRatePerKg: '',
        wasteRatePerKg: '',
        doublesRatePerKg: '',
        notes: ''
      });
      loadRecent();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed');
    }
  };

  const fromBooking = Boolean(location.state?.prefill?.linkedBookingId);

  return (
    <AppShell title="Batch Entry" backPath="/admin/dashboard">
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 10 }}>
        <button type="button" className="btn-primary" onClick={() => navigate('/admin/batch-entry')}>
          + New Entry
        </button>
        <button type="button" className="btn-outline" onClick={() => navigate('/admin/batch-history')}>
          All History
        </button>
      </div>
      {fromBooking && (
        <p style={{ fontSize: 12, color: 'var(--blue)', margin: '0 0 10px' }}>
          Linked from booking — save to complete the booking.
        </p>
      )}

      <form className="card" onSubmit={handleSubmit(onSubmit)}>
        <label className="field-label">Select User</label>
        <select className="field-select" {...register('userId', { required: true })}>
          <option value="">Choose user</option>
          {users.map((u) => (
            <option key={u._id} value={u._id}>
              {u.name} ({shortUserId(u._id)})
            </option>
          ))}
        </select>

        <div className={styles.dateMarketRow}>
          <div>
            <label className="field-label">Date</label>
            <input type="date" className="field-input" {...register('date', { required: true })} />
          </div>
          <div>
            <label className="field-label">Market</label>
            <select className="field-select" {...register('location', { required: true })}>
              {MARKETS.map((m) => (
                <option key={m.label} value={m.label}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <p className="section-title">Weight Details</p>
        <p className={styles.hint}>
          Enter kg and your rate (₹/kg) for each line. Totals calculate below.
        </p>

        <div className={styles.weightRow}>
          <div className={styles.weightRowTitle}>Good silk</div>
          <div className={styles.weightRowGrid}>
            <div>
              <label className="field-label">kg</label>
              <input
                type="number"
                step="0.1"
                min="0"
                className="field-input"
                {...register('goodSilkKg')}
              />
            </div>
            <div>
              <label className="field-label">Rate (₹/kg)</label>
              <input
                type="number"
                step="1"
                min="0"
                className="field-input"
                placeholder="Manual"
                {...register('goodSilkRatePerKg')}
              />
            </div>
          </div>
          <div className={styles.weightRowAmt}>Line amount: {formatINR(goodAmt)}</div>
        </div>

        <div className={styles.weightRow}>
          <div className={styles.weightRowTitle}>Waste</div>
          <div className={styles.weightRowGrid}>
            <div>
              <label className="field-label">kg</label>
              <input type="number" step="0.1" min="0" className="field-input" {...register('wasteKg')} />
            </div>
            <div>
              <label className="field-label">Rate (₹/kg)</label>
              <input
                type="number"
                step="1"
                min="0"
                className="field-input"
                placeholder="Manual"
                {...register('wasteRatePerKg')}
              />
            </div>
          </div>
          <div className={styles.weightRowAmt}>Line amount: {formatINR(wasteAmt)}</div>
        </div>

        <div className={styles.weightRow}>
          <div className={styles.weightRowTitle}>Doubles</div>
          <div className={styles.weightRowGrid}>
            <div>
              <label className="field-label">kg</label>
              <input type="number" step="0.1" min="0" className="field-input" {...register('doubles')} />
            </div>
            <div>
              <label className="field-label">Rate (₹/kg)</label>
              <input
                type="number"
                step="1"
                min="0"
                className="field-input"
                placeholder="Manual"
                {...register('doublesRatePerKg')}
              />
            </div>
          </div>
          <div className={styles.weightRowAmt}>Line amount: {formatINR(doublesAmt)}</div>
        </div>

        <div className={styles.totalsCard}>
          <div className={styles.totalsRow}>
            <span>Total weight (kg)</span>
            <strong>{totalKg} kg</strong>
          </div>
          <div className={styles.totalsRow} style={{ marginBottom: 0 }}>
            <span>Total amount</span>
            <strong style={{ fontSize: 18 }}>{formatINR(totalAmount)}</strong>
          </div>
        </div>

        <p className={styles.ratesTitle}>
          Reference rates on {formatDateShort(date)}
          {ratesLoading ? ' (loading…)' : marketRate ? '' : ' — none for this date'}
        </p>
        <p className={styles.subtle}>
          Tap a market to copy its ₹/kg into Good silk rate (optional).
        </p>

        {marketRate && (
          <div className={styles.ratesGrid}>
            {MARKETS.map((m) => {
              const active = m.label === market;
              const amount = marketRate[m.key];
              return (
                <button
                  key={m.label}
                  type="button"
                  className={`${styles.rateCell} ${styles.rateCellClick} ${active ? styles.rateCellActive : ''}`}
                  onClick={() => applyReferenceRateToGoodSilk(amount)}
                >
                  <div className={active ? styles.rateMarketActive : styles.rateMarket}>
                    {m.label}
                    {active ? ' ✓' : ''}
                  </div>
                  <div className={active ? styles.rateAmountActive : styles.rateAmount}>
                    {amount != null ? formatINR(amount) : '—'}
                  </div>
                </button>
              );
            })}
          </div>
        )}

        <label className="field-label">Link to Booking</label>
        <select className="field-select" {...register('linkedBookingId')}>
          <option value="">None (no linked booking)</option>
          {bookings.map((b) => (
            <option key={b._id} value={b._id}>
              {formatDateShort(b.date)} · {b.location} · {b.quantityKg} kg
            </option>
          ))}
        </select>

        <label className="field-label">Notes</label>
        <textarea className="field-textarea" rows={3} placeholder="Add notes…" {...register('notes')} />

        {success && <p className="form-success">{success}</p>}
        <button type="submit" className="btn-primary" disabled={totalKg <= 0}>
          Save Batch Entry
        </button>
      </form>

      <p className="section-title">Recent entries</p>
      {recent.length === 0 ? (
        <p className="empty-text">No entries yet</p>
      ) : (
        recent.map((b) => (
          <div key={b._id} className="card" style={{ fontSize: 13 }}>
            <strong>{b.userName}</strong> — {formatDateShort(b.date)} — {b.totalWeightKg ?? b.quantityKg}{' '}
            kg · {formatINR(b.estimatedValue)}
          </div>
        ))
      )}
    </AppShell>
  );
}
