import { useCallback, useEffect, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import AppShell from '../../components/layout/AppShell';
import api from '../../api/client';
import { formatDateShort } from '../../utils/format';
import styles from './BatchEntryDashboard.module.css';

function statusClass(status) {
  if (status === 'confirmed') return styles.statusConfirmed;
  if (status === 'completed') return styles.statusDone;
  if (status === 'cancelled') return styles.statusCancelled;
  return styles.statusPending;
}

export default function BatchEntryDateDetail() {
  const { date } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const decodedDate = decodeURIComponent(date || '');

  const [row, setRow] = useState(location.state?.row || null);
  const [loading, setLoading] = useState(!location.state?.row);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get('/admin/bookings/date-summary', {
        params: { date: decodedDate, _t: Date.now() }
      });
      const match = (res.data.byDate || []).find((g) => g.date === decodedDate);
      if (match) {
        setRow(match);
      } else {
        setError('No bookings found for this date');
        setRow(null);
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Could not load details');
    } finally {
      setLoading(false);
    }
  }, [decodedDate]);

  useEffect(() => {
    if (!row || row.date !== decodedDate) {
      load();
    }
  }, [decodedDate, load, row]);

  const totalWeight = row?.totalWeightKg ?? 0;
  const userCount = row?.userCount ?? row?.users?.length ?? 0;
  const getUid = (x) => String(x?.userId?._id || x?.userId || x?._id || '').trim();
  const allUserIds = row?.users ? row.users.map(getUid).filter(Boolean) : [];

  return (
    <AppShell
      title={`Batch Detail · ${formatDateShort(decodedDate)}`}
      backPath="/admin/batch-entry"
    >
      <div className={styles.container}>
        {/* Date Detail Banner */}
        <div className={styles.detailHeader}>
          <div>
            <h3 className={styles.detailTitle}>Date of Going</h3>
            <p className={styles.detailDate}>🗓️ {formatDateShort(decodedDate)}</p>
            <span className={styles.dateRaw}>{decodedDate}</span>
          </div>

          <div className={styles.detailStats}>
            <div className={styles.detailStat}>
              <span className={styles.detailStatVal}>{userCount}</span>
              <span className={styles.detailStatLbl}>Farmers</span>
            </div>
            <div className={styles.detailStat}>
              <span className={styles.detailStatVal} style={{ color: '#f59e0b' }}>
                {totalWeight} <span style={{ fontSize: 13 }}>kg</span>
              </span>
              <span className={styles.detailStatLbl}>Total Weight</span>
            </div>
          </div>
        </div>

        {error && <p className="form-error">{error}</p>}

        {loading ? (
          <div className="app-loading">
            <div className="spinner" />
          </div>
        ) : !row ? (
          <div className={styles.emptyState}>
            <p style={{ margin: '0 0 14px' }}>No bookings found for this date.</p>
            <button
              type="button"
              className={styles.openBookingsBtn}
              onClick={() => navigate('/admin/batch-entry')}
            >
              ← Back to Batch Entry Summary
            </button>
          </div>
        ) : (
          <div className={styles.tableCard}>
            <div className={styles.tableHead}>
              <h3 className={styles.tableTitle}>
                <span>👥</span> Farmers Booked ({userCount})
              </h3>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span className={styles.tableMeta}>
                  📦 {totalWeight} kg Total
                </span>
                {row.users.length > 0 && (
                  <button
                    type="button"
                    className="btn-primary"
                    style={{ fontSize: 12, padding: '6px 12px' }}
                    onClick={() => navigate('/admin/driver/parties/new', {
                      state: { 
                        bookedUsers: row.users,
                        userIds: allUserIds, 
                        allowedUserIds: allUserIds,
                        date: decodedDate, 
                        location: row.users[0]?.location
                      }
                    })}
                  >
                    Assign Driver (All)
                  </button>
                )}
              </div>
            </div>

            {/* Desktop Table View */}
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Farmer Name</th>
                    <th>Mobile Number</th>
                    <th>Weight (kg)</th>
                    <th>Market Location</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {row.users.map((u, i) => (
                    <tr key={u.bookingId || i}>
                      <td>#{i + 1}</td>
                      <td>
                        <strong>{u.userName}</strong>
                      </td>
                      <td>📱 {u.phone || '—'}</td>
                      <td>
                        <strong className={styles.weightVal}>📦 {u.quantityKg} kg</strong>
                      </td>
                      <td>📍 {u.location || '—'}</td>
                      <td>
                        <span className={`${styles.statusBadge} ${statusClass(u.status)}`}>
                          {u.status || 'pending'}
                        </span>
                      </td>
                      <td>
                        <button
                          type="button"
                          className="btn-outline"
                          style={{ fontSize: 11, padding: '4px 8px' }}
                          onClick={() => navigate('/admin/driver/parties/new', {
                            state: { 
                              bookedUsers: [u],
                              userId: getUid(u), 
                              allowedUserIds: allUserIds,
                              date: decodedDate, 
                              location: u.location 
                            }
                          })}
                        >
                          Assign Driver
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className={styles.totalRow}>
                    <td colSpan={3}>
                      <strong>Total Summary</strong>
                    </td>
                    <td colSpan={4}>
                      <strong className={styles.weightVal}>📦 {totalWeight} kg Total</strong>
                      <span className={styles.footerUsers}> · {userCount} farmers booked</span>
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Mobile Card Feed View */}
            <div className={styles.mobileList}>
              {row.users.map((u, i) => (
                <div key={u.bookingId || i} className={styles.mobileUserCard}>
                  <div className={styles.mobileUserHead}>
                    <strong>{u.userName}</strong>
                    <span className={`${styles.statusBadge} ${statusClass(u.status)}`}>
                      {u.status || 'pending'}
                    </span>
                  </div>

                  <div className={styles.mobileUserLine}>
                    <span>Mobile</span>
                    <span>📱 {u.phone || '—'}</span>
                  </div>

                  <div className={styles.mobileUserLine}>
                    <span>Weight</span>
                    <strong className={styles.weightVal}>📦 {u.quantityKg} kg</strong>
                  </div>

                  {u.location && (
                    <div className={styles.mobileUserLine}>
                      <span>Market</span>
                      <span>📍 {u.location}</span>
                    </div>
                  )}
                  <div style={{ marginTop: 8 }}>
                    <button
                      type="button"
                      className="btn-outline"
                      style={{ fontSize: 12, padding: '6px 12px', width: '100%' }}
                      onClick={() => navigate('/admin/driver/parties/new', {
                        state: { 
                          bookedUsers: [u],
                          userId: getUid(u), 
                          allowedUserIds: allUserIds,
                          date: decodedDate, 
                          location: u.location 
                        }
                      })}
                    >
                      Assign Driver
                    </button>
                  </div>
                </div>
              ))}

              <div className={styles.mobileTotalCard}>
                <span>Total Batch Weight</span>
                <strong className={styles.weightVal}>📦 {totalWeight} kg</strong>
              </div>
              {row.users.length > 0 && (
                <div style={{ padding: '0 12px 12px' }}>
                  <button
                    type="button"
                    className="btn-primary"
                    style={{ fontSize: 13, padding: '8px 12px', width: '100%' }}
                    onClick={() => navigate('/admin/driver/parties/new', {
                      state: { 
                        bookedUsers: row.users,
                        userIds: allUserIds, 
                        allowedUserIds: allUserIds,
                        date: decodedDate, 
                        location: row.users[0]?.location
                      }
                    })}
                  >
                    Assign Driver (All {userCount} Farmers)
                  </button>
                </div>
              )}
            </div>

            <div className={styles.detailActions}>
              <button
                type="button"
                className={styles.openBookingsBtn}
                onClick={() => navigate(`/admin/bookings?date=${decodedDate}`)}
              >
                Open in Bookings Management →
              </button>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
