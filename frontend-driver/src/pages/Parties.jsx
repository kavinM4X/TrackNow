import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import DriverShell from '../components/layout/DriverShell';
import api from '../api/client';
import { formatDateDayMonth } from '../utils/format';
import styles from './Parties.module.css';

export default function Parties() {
  const navigate = useNavigate();
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api
      .get('/driver/party-batches')
      .then((res) => setBatches(res.data))
      .catch((err) => {
        setError(err.response?.data?.error || 'Could not load party assignments');
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <DriverShell title="Party Batches">
      <div className={styles.container}>
        {loading ? (
          <div className="app-loading">
            <div className="spinner" />
          </div>
        ) : error ? (
          <p className="form-error">{error}</p>
        ) : batches.length === 0 ? (
          <div className={styles.calcCard} style={{ textAlign: 'center' }}>
            <strong style={{ color: '#1e293b' }}>No Party Batches Assigned</strong>
            <p style={{ fontSize: 13, color: '#64748b', margin: '4px 0 0' }}>
              Ask your logistics admin to assign party batch entries under Admin → Party Entry.
            </p>
          </div>
        ) : (
          <>
            <div style={{ fontSize: 13, color: '#64748b', fontWeight: 600 }}>
              Select a party batch to record cocoon entries ({batches.length} assigned)
            </div>

            <div className={styles.container} style={{ gap: 10 }}>
              {batches.map((batch) => {
                const pendingTotal = (batch.entries || []).filter((e) => !e.completed).length;
                const isSubmitted = batch.status === 'submitted';
                const userCount = batch.userCount || batch.entries?.length || 0;

                return (
                  <button
                    key={batch._id}
                    type="button"
                    className={styles.partyBatchCard}
                    onClick={() => navigate(`/parties/${batch._id}`)}
                  >
                    <div className={styles.batchHeader}>
                      <span className={styles.batchDatePill}>
                        🗓️ {batch.assignedDate ? formatDateDayMonth(batch.assignedDate) : 'No date'}
                      </span>
                      {batch.city && (
                        <span className={styles.batchCityBadge}>
                          📍 {batch.city}
                        </span>
                      )}
                    </div>

                    <div className={styles.batchFooter}>
                      <span className={styles.userCountText}>
                        📦 {userCount} Farmer{userCount !== 1 ? 's' : ''} Assigned
                      </span>

                      {isSubmitted ? (
                        <span className={styles.badgeSubmitted}>✓ Submitted</span>
                      ) : pendingTotal > 0 ? (
                        <span className={styles.badgePending}>⏳ {pendingTotal} Pending</span>
                      ) : (
                        <span className={styles.badgeSubmitted}>✓ Ready</span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </>
        )}
      </div>
    </DriverShell>
  );
}
