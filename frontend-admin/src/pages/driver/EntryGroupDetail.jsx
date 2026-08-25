import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import AppShell from '../../components/layout/AppShell';
import api from '../../api/client';
import {
  filterTripEntries,
  publishEntry,
  setEntryStatus
} from './entryShared';
import { formatDateShort, formatINR, initials } from '../../utils/format';
import styles from './EntryGroupDetail.module.css';

export default function EntryGroupDetail() {
  const { date, vehicleNumber } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const statusFilter = location.state?.filter ?? '';

  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const decodedDate = decodeURIComponent(date || '');
  const decodedVehicle = decodeURIComponent(vehicleNumber || '');

  const load = useCallback(() => {
    setLoading(true);
    const q = statusFilter ? `?status=${statusFilter}` : '';
    api
      .get(`/admin/driver/entries${q}`)
      .then((r) => setEntries(r.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [statusFilter]);

  useEffect(() => {
    load();
  }, [load]);

  const tripEntries = useMemo(
    () => filterTripEntries(entries, decodedDate, decodedVehicle),
    [entries, decodedDate, decodedVehicle]
  );

  const driverName = tripEntries[0]?.vehicleId?.driverName || 'Logistics Driver';
  const pendingCount = tripEntries.filter((e) => e.status === 'pending').length;

  const totalGoodKg = tripEntries.reduce((sum, e) => sum + (Number(e.goodKg) || 0), 0);
  const totalWasteKg = tripEntries.reduce((sum, e) => sum + (Number(e.wasteKg) || 0), 0);
  const totalTripPayout = tripEntries.reduce((sum, e) => sum + (Number(e.totalAmount) || 0), 0);

  const publishToClient = async (id) => {
    setMessage('');
    setError('');
    try {
      const res = await publishEntry(id);
      const name = res.data?.clientUserName;
      if (name) {
        setMessage(`✓ Published to ${name}`);
      } else {
        setError('Server could not link this entry to a client user.');
      }
      load();
    } catch (err) {
      setError(err.response?.data?.error || 'Could not publish to client');
    }
  };

  const updateStatus = async (id, status) => {
    setMessage('');
    setError('');
    try {
      const res = await setEntryStatus(id, status);
      if (status === 'approved' && res.data?.clientUserName) {
        setMessage(`✓ Approved & published to ${res.data.clientUserName}`);
      }
      load();
    } catch (err) {
      setError(err.response?.data?.error || 'Could not update entry');
    }
  };

  return (
    <AppShell
      title={`Trip: ${decodedVehicle}`}
      backPath="/admin/driver/entries"
      driverSection
      hideNav
    >
      <div className={styles.container}>
        {/* Trip Hero Header */}
        <div className={styles.tripHeroCard}>
          <div className={styles.tripMetaLeft}>
            <div className={styles.vehicleIconBox}>🚚</div>
            <div className={styles.tripTextGroup}>
              <h2 className={styles.tripTitle}>{decodedVehicle}</h2>
              <div className={styles.tripSub}>
                🗓️ {formatDateShort(decodedDate)} · 👤 {driverName} · 📦 {tripEntries.length} Farmer{tripEntries.length !== 1 ? 's' : ''}
              </div>
            </div>
          </div>

          {pendingCount > 0 && (
            <span className={styles.pendingBadge}>⏳ {pendingCount} Pending</span>
          )}
        </div>

        {/* Live Trip Summary Bar */}
        <div className={styles.tripSummaryGrid}>
          <div className={styles.summaryBox}>
            <span className={`${styles.summaryVal} ${styles.summaryValGreen}`}>
              {totalGoodKg} <small style={{ fontSize: 11, fontWeight: 500 }}>kg</small>
            </span>
            <span className={styles.summaryLbl}>🌾 Good Silk</span>
          </div>

          <div className={styles.summaryBox}>
            <span className={styles.summaryVal}>
              {totalWasteKg} <small style={{ fontSize: 11, fontWeight: 500 }}>kg</small>
            </span>
            <span className={styles.summaryLbl}>🍂 Waste Silk</span>
          </div>

          <div className={styles.summaryBox}>
            <span className={`${styles.summaryVal} ${styles.summaryValBlue}`}>
              {formatINR(totalTripPayout)}
            </span>
            <span className={styles.summaryLbl}>💰 Total Trip Payout</span>
          </div>
        </div>

        {message && <p className="form-success">{message}</p>}
        {error && <p className="form-error">{error}</p>}

        {/* Trip Farmer Entry Cards */}
        {loading ? (
          <div className="app-loading">
            <div className="spinner" />
          </div>
        ) : tripEntries.length === 0 ? (
          <div className={styles.emptyState}>No entries found for this trip.</div>
        ) : (
          <div className={styles.entryList}>
            {tripEntries.map((e) => {
              const clientId =
                e.clientUserId?._id || e.clientUserId || e.partyId?.clientUserId?._id || e.partyId?.clientUserId;
              const farmerName = e.partyId?.name || 'Farmer';
              const statusClass =
                e.status === 'pending'
                  ? styles.statusPending
                  : e.status === 'approved'
                  ? styles.statusApproved
                  : styles.statusRejected;

              return (
                <div key={e._id} className={styles.entryCard}>
                  <div className={styles.entryHeader}>
                    <div className={styles.farmerInfo}>
                      <div className={styles.avatarRing}>{initials(farmerName)}</div>
                      <h4 className={styles.farmerName}>{farmerName}</h4>
                    </div>
                    <span className={`${styles.statusBadge} ${statusClass}`}>
                      {e.status}
                    </span>
                  </div>

                  {/* 3-Metric Grid */}
                  <div className={styles.metricGrid}>
                    <div className={styles.metricBox}>
                      <span className={styles.metricLbl}>Good Silk</span>
                      <span className={styles.metricVal} style={{ color: 'var(--green, #2e7d52)' }}>
                        {e.goodKg} kg ({formatINR(e.goodAmount)})
                      </span>
                    </div>

                    <div className={styles.metricBox}>
                      <span className={styles.metricLbl}>Waste Silk</span>
                      <span className={styles.metricVal} style={{ color: '#d97706' }}>
                        {e.wasteKg} kg ({formatINR(e.wasteAmount)})
                      </span>
                    </div>

                    <div className={styles.metricBox}>
                      <span className={styles.metricLbl}>Doubles</span>
                      <span className={styles.metricVal} style={{ color: '#a0522d' }}>
                        {e.doubleKg || '0'} kg ({formatINR(e.doubleAmount)})
                      </span>
                    </div>
                  </div>

                  {/* Total Amount Row */}
                  <div className={styles.totalRow}>
                    <span className={styles.totalLabel}>Total Harvest Value</span>
                    <span className={styles.totalVal}>{formatINR(e.totalAmount)}</span>
                  </div>

                  {/* Lot Amount Deduction Row */}
                  {Number(e.lotAmount) > 0 && (
                    <div className={styles.lotRow}>
                      <span>Lot Deduction: {e.lotQty || 0} × {formatINR(e.lotPrice || 0)}</span>
                      <span>− {formatINR(e.lotAmount)}</span>
                    </div>
                  )}

                  {/* Pending Action Controls */}
                  {e.status === 'pending' && (
                    <div className={styles.actionsRow}>
                      <button
                        type="button"
                        className={styles.approveBtn}
                        onClick={() => updateStatus(e._id, 'approved')}
                      >
                        ✓ Approve Entry
                      </button>
                      <button
                        type="button"
                        className={styles.rejectBtn}
                        onClick={() => updateStatus(e._id, 'rejected')}
                      >
                        ✕ Reject
                      </button>
                    </div>
                  )}

                  {/* Approved Client Action Controls */}
                  {e.status === 'approved' && (e.clientUserId || e.partyId?.clientUserId) && (
                    <div className={styles.clientActions}>
                      <button
                        type="button"
                        className={styles.syncBtn}
                        onClick={() => publishToClient(e._id)}
                      >
                        🔄 Sync to Client App
                      </button>
                      <button
                        type="button"
                        className={styles.historyBtn}
                        onClick={() => navigate(`/admin/batch-history/user/${clientId}`)}
                      >
                        📜 View Farmer History
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AppShell>
  );
}
