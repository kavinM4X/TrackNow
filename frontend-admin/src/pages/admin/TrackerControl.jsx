import { useCallback, useEffect, useState } from 'react';
import AppShell from '../../components/layout/AppShell';
import api from '../../api/client';
import { formatDateShort, initials, shortUserId, todayISO } from '../../utils/format';
import styles from './TrackerControl.module.css';
import TrackerLiveMap from './TrackerLiveMap';

function statusLabel(status) {
  if (status === 'completed') return 'Done';
  if (status === 'confirmed') return 'Confirmed';
  return status.charAt(0).toUpperCase() + status.slice(1);
}

export default function TrackerControl() {
  const [selectedDate, setSelectedDate] = useState(todayISO());
  const [bookingDates, setBookingDates] = useState([]);
  const [rows, setRows] = useState([]);
  const [history, setHistory] = useState([]);
  const [drafts, setDrafts] = useState({});
  const [enabling, setEnabling] = useState({});
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [savingId, setSavingId] = useState(null);
  const [liveMarkers, setLiveMarkers] = useState([]);
  const [liveMapLoading, setLiveMapLoading] = useState(true);

  const loadLiveMap = useCallback(async () => {
    try {
      const res = await api.get('/admin/tracker/live-map');
      setLiveMarkers(res.data.markers || []);
    } catch (e) {
      console.error(e);
      setLiveMarkers([]);
    } finally {
      setLiveMapLoading(false);
    }
  }, []);

  const loadForDate = useCallback(async (date) => {
    setLoading(true);
    setLoadError('');
    try {
      const [byDate, hist] = await Promise.all([
        api.get('/admin/tracker/by-date', { params: { date } }),
        api.get('/admin/tracker/history', { params: { date } })
      ]);
      setRows(byDate.data.rows || []);
      setHistory(hist.data || []);
      const nextDrafts = {};
      (byDate.data.rows || []).forEach(({ user, trackerDay }) => {
        if (trackerDay?.vehicleId) {
          nextDrafts[user._id] = trackerDay.vehicleId;
        }
      });
      setDrafts(nextDrafts);
      setEnabling({});
    } catch (err) {
      setLoadError(err.response?.data?.error || 'Could not load tracker data.');
      setRows([]);
      setHistory([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadLiveMap();
    const id = setInterval(loadLiveMap, 60000);
    return () => clearInterval(id);
  }, [loadLiveMap]);

  useEffect(() => {
    api
      .get('/admin/tracker/booking-dates')
      .then((r) => setBookingDates(r.data || []))
      .catch(console.error);
  }, []);

  useEffect(() => {
    loadForDate(selectedDate);
  }, [selectedDate, loadForDate]);

  const save = async (user, isEnabled, vehicleId) => {
    if (isEnabled && !vehicleId?.trim()) {
      alert('Vehicle ID required when enabling tracker');
      return;
    }
    if (!isEnabled && !window.confirm(`Disable tracker for ${user.name} on ${formatDateShort(selectedDate)}?`)) {
      return;
    }

    setSavingId(user._id);
    try {
      await api.put(`/admin/tracker/${user._id}`, {
        date: selectedDate,
        isEnabled,
        vehicleId: vehicleId?.trim() || null
      });
      setEnabling((e) => ({ ...e, [user._id]: false }));
      await loadForDate(selectedDate);
      loadLiveMap();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to update tracker');
    } finally {
      setSavingId(null);
    }
  };

  const handleToggle = (user, enabled, vid) => {
    if (enabled) {
      save(user, false, vid);
    } else {
      setEnabling((e) => ({ ...e, [user._id]: true }));
    }
  };

  const dateHasBookings = bookingDates.includes(selectedDate);

  return (
    <AppShell title="Tracker Control">
      <TrackerLiveMap markers={liveMarkers} loading={liveMapLoading} />

      <p className="section-title">Booking date</p>
      <p style={{ fontSize: 12, color: '#888', margin: '0 0 8px' }}>
        Farmers listed below have a client booking on this date. When you enable tracking, it stays on through the{' '}
        <strong>booking day + 1 day</strong> (for admin assignment). While that window is active, you can watch the
        vehicle on the map above whenever the farmer has the <strong>Track</strong> screen open on their phone — or
        connect a real GPS device to send positions 24×7.
      </p>
      <input
        type="date"
        className="field-input"
        value={selectedDate}
        onChange={(e) => setSelectedDate(e.target.value)}
        style={{ marginBottom: 8 }}
      />

      {bookingDates.length > 0 && (
        <div className={styles.dateChips}>
          {bookingDates.slice(0, 8).map((d) => (
            <button
              key={d}
              type="button"
              className={`${styles.dateChip} ${d === selectedDate ? styles.dateChipActive : ''}`}
              onClick={() => setSelectedDate(d)}
            >
              {formatDateShort(d)}
            </button>
          ))}
        </div>
      )}

      <p className="section-title" style={{ marginTop: 12 }}>
        Assign &amp; Manage Trackers — {formatDateShort(selectedDate)}
        {!loading && ` (${rows.length})`}
      </p>

      {loadError && <p className="form-error">{loadError}</p>}

      {loading ? (
        <div className="spinner" />
      ) : rows.length === 0 ? (
        <p className="empty-text">
          {dateHasBookings
            ? 'No bookings on this date.'
            : 'No client bookings on this date. Pick another day or ask farmers to book from the app.'}
        </p>
      ) : (
        rows.map(({ user, bookings, trackerDay }) => {
          const enabled = Boolean(trackerDay?.isEnabled);
          const until = trackerDay?.activeUntil;
          const pendingEnable = Boolean(enabling[user._id]);
          const showOn = enabled || pendingEnable;
          const vid = drafts[user._id] ?? trackerDay?.vehicleId ?? '';
          const dirty =
            vid !== (trackerDay?.vehicleId || '') || (pendingEnable && !enabled);

          let statusNote = 'Tracker off for this date';
          let badgeLabel = 'Not Active';
          let badgeClass = 'gray';
          if (enabled && until) {
            statusNote = `Live · auto-off after ${formatDateShort(until)}`;
            badgeLabel = 'Live';
            badgeClass = 'green';
          } else if (enabled) {
            statusNote = `Live for ${formatDateShort(selectedDate)}`;
            badgeLabel = 'Live';
            badgeClass = 'green';
          } else if (trackerDay?.autoDisabledAt && until) {
            statusNote = `Auto-off (ended ${formatDateShort(until)})`;
            badgeLabel = 'Auto off';
            badgeClass = 'amber';
          }

          return (
            <div key={user._id} className="card">
              <div className={styles.cardHead}>
                <div className={styles.avatar}>{initials(user.name)}</div>
                <div className={styles.meta}>
                  <strong>{user.name}</strong>
                  <span>{shortUserId(user._id)}</span>
                </div>
                <button
                  type="button"
                  className={`toggle ${showOn ? 'on' : 'off'}`}
                  disabled={savingId === user._id}
                  aria-label={showOn ? 'Disable tracker' : 'Enable tracker'}
                  onClick={() => handleToggle(user, enabled, vid)}
                >
                  <span />
                </button>
              </div>

              <div className={styles.bookingList}>
                {bookings.map((b) => (
                  <div key={b._id} className={styles.bookingLine}>
                    <span>
                      {b.location} · {b.quantityKg} kg
                    </span>
                    <span className={`badge badge-${b.status === 'confirmed' ? 'green' : b.status === 'pending' ? 'amber' : 'blue'}`}>
                      {statusLabel(b.status)}
                    </span>
                  </div>
                ))}
              </div>

              <label className="field-label">Vehicle ID</label>
              <input
                className="field-input"
                placeholder="Enter vehicle ID"
                value={vid}
                disabled={savingId === user._id}
                onChange={(e) =>
                  setDrafts((d) => ({ ...d, [user._id]: e.target.value }))
                }
              />

              {(pendingEnable || (enabled && dirty)) && (
                <button
                  type="button"
                  className={`btn-primary ${styles.saveBtn}`}
                  disabled={savingId === user._id}
                  onClick={() => save(user, true, vid)}
                >
                  {savingId === user._id ? 'Saving…' : 'Save & Enable'}
                </button>
              )}

              <div className={styles.cardFoot}>
                <span className={styles.since}>{statusNote}</span>
                <span className={`badge badge-${badgeClass}`}>{badgeLabel}</span>
              </div>
            </div>
          );
        })
      )}

      <p className="section-title" style={{ marginTop: 16 }}>
        Active on {formatDateShort(selectedDate)}
      </p>
      {loading ? null : history.length === 0 ? (
        <p className="empty-text">No trackers enabled for this date yet.</p>
      ) : (
        history.map((h) => {
          const name = h.userName || h.userId?.name || 'Unknown';
          return (
            <div key={h._id} className="card">
              <div className={styles.historyRow}>
                <div>
                  <div className={styles.historyTitle}>
                    {name} — {h.vehicleId || '—'}
                  </div>
                  <div className={styles.historySub}>
                    Booking {formatDateShort(h.date)}
                    {h.activeUntil ? ` · auto-off after ${formatDateShort(h.activeUntil)}` : ''}
                  </div>
                </div>
                <span className="badge badge-green">Active</span>
              </div>
            </div>
          );
        })
      )}
    </AppShell>
  );
}
