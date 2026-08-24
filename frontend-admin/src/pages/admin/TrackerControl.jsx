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
      <div className={styles.container}>
        {/* Header Bar */}
        <div className={styles.headerBar}>
          <div className={styles.headerTitleGroup}>
            <h2>Tracker Control Center</h2>
            <p className={styles.headerSub}>GPS live tracking, vehicle assignments & active route monitoring</p>
          </div>
        </div>

        {/* Live Map Component */}
        <TrackerLiveMap markers={liveMarkers} loading={liveMapLoading} />

        {/* Date Selector Box */}
        <div className={styles.dateSelectCard}>
          <div className={styles.sectionHeaderRow}>
            <h3 className={styles.sectionTitle}>
              <span>📅</span> Select Booking Date
            </h3>
          </div>
          <p className={styles.sectionDescription}>
            Select a date below to view farmer bookings and enable vehicle GPS tracking during the booking window.
          </p>

          <input
            type="date"
            className={styles.dateInput}
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
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
                  🗓️ {formatDateShort(d)}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Manage Trackers Section */}
        <div>
          <div className={styles.sectionHeaderRow} style={{ marginBottom: 12 }}>
            <h3 className={styles.sectionTitle}>
              <span>📍</span> Manage Trackers — {formatDateShort(selectedDate)}
              {!loading && ` (${rows.length})`}
            </h3>
          </div>

          {loadError && <p className="form-error">{loadError}</p>}

          {loading ? (
            <div className="app-loading">
              <div className="spinner" />
            </div>
          ) : rows.length === 0 ? (
            <div className={styles.emptyState}>
              {dateHasBookings
                ? 'No farmer bookings found on this date.'
                : 'No client bookings on this date. Select another date or check farmer bookings.'}
            </div>
          ) : (
            <div className={styles.trackerGrid}>
              {rows.map(({ user, bookings, trackerDay }) => {
                const enabled = Boolean(trackerDay?.isEnabled);
                const until = trackerDay?.activeUntil;
                const pendingEnable = Boolean(enabling[user._id]);
                const showOn = enabled || pendingEnable;
                const vid = drafts[user._id] ?? trackerDay?.vehicleId ?? '';
                const dirty =
                  vid !== (trackerDay?.vehicleId || '') || (pendingEnable && !enabled);

                let statusNote = 'Tracker disabled for this date';
                let badgeLabel = 'Not Active';
                let badgeStyle = { bg: '#f1f5f9', color: '#64748b' };
                if (enabled && until) {
                  statusNote = `Live · auto-off after ${formatDateShort(until)}`;
                  badgeLabel = 'Live Active';
                  badgeStyle = { bg: '#ecfdf5', color: '#047857' };
                } else if (enabled) {
                  statusNote = `Live active for ${formatDateShort(selectedDate)}`;
                  badgeLabel = 'Live Active';
                  badgeStyle = { bg: '#ecfdf5', color: '#047857' };
                } else if (trackerDay?.autoDisabledAt && until) {
                  statusNote = `Auto-off (ended ${formatDateShort(until)})`;
                  badgeLabel = 'Auto Off';
                  badgeStyle = { bg: '#fffbe8', color: '#b45309' };
                }

                return (
                  <div key={user._id} className={styles.trackerCard}>
                    <div className={styles.cardHead}>
                      <div className={styles.userInfo}>
                        <div className={styles.avatar}>{initials(user.name)}</div>
                        <div className={styles.meta}>
                          <h4 className={styles.userName}>{user.name}</h4>
                          <span className={styles.userIdTag}>{shortUserId(user._id)}</span>
                        </div>
                      </div>
                      <button
                        type="button"
                        className={`${styles.toggleSwitch} ${showOn ? styles.toggleSwitchOn : ''}`}
                        disabled={savingId === user._id}
                        aria-label={showOn ? 'Disable tracker' : 'Enable tracker'}
                        onClick={() => handleToggle(user, enabled, vid)}
                        title={showOn ? 'Disable Tracker' : 'Enable Tracker'}
                      >
                        <span
                          className={`${styles.toggleHandle} ${
                            showOn ? styles.toggleHandleOn : ''
                          }`}
                        />
                      </button>
                    </div>

                    <div className={styles.bookingList}>
                      {bookings.map((b) => (
                        <div key={b._id} className={styles.bookingLine}>
                          <span>
                            📍 {b.location} · 📦 {b.quantityKg} kg
                          </span>
                          <span className="badge badge-blue">
                            {statusLabel(b.status)}
                          </span>
                        </div>
                      ))}
                    </div>

                    <div className={styles.fieldGroup}>
                      <label className={styles.fieldLabel}>Assigned Vehicle ID</label>
                      <input
                        className={styles.fieldInput}
                        placeholder="Enter vehicle ID (e.g. TN-38-AX-1234)"
                        value={vid}
                        disabled={savingId === user._id}
                        onChange={(e) =>
                          setDrafts((d) => ({ ...d, [user._id]: e.target.value }))
                        }
                      />
                    </div>

                    {(pendingEnable || (enabled && dirty)) && (
                      <button
                        type="button"
                        className={styles.saveBtn}
                        disabled={savingId === user._id}
                        onClick={() => save(user, true, vid)}
                      >
                        {savingId === user._id ? 'Saving Changes…' : 'Save & Enable Tracker'}
                      </button>
                    )}

                    <div className={styles.cardFoot}>
                      <span className={styles.since}>{statusNote}</span>
                      <span
                        className="badge"
                        style={{ background: badgeStyle.bg, color: badgeStyle.color, fontWeight: 700 }}
                      >
                        {badgeLabel}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Active Trackers Section */}
        <div>
          <div className={styles.sectionHeaderRow} style={{ marginBottom: 12 }}>
            <h3 className={styles.sectionTitle}>
              <span>⚡</span> Active Trackers for {formatDateShort(selectedDate)}
            </h3>
          </div>

          {loading ? null : history.length === 0 ? (
            <div className={styles.emptyState}>No trackers active on this date.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {history.map((h) => {
                const name = h.userName || h.userId?.name || 'Farmer User';
                return (
                  <div key={h._id} className={styles.historyCard}>
                    <div>
                      <div className={styles.historyTitle}>
                        👤 {name} — 🚛 {h.vehicleId || 'No Vehicle ID'}
                      </div>
                      <div className={styles.historySub}>
                        Booking: {formatDateShort(h.date)}
                        {h.activeUntil ? ` · Auto-off after ${formatDateShort(h.activeUntil)}` : ''}
                      </div>
                    </div>
                    <span className="badge badge-green">Live Active</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
