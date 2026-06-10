import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import DriverShell from '../components/layout/DriverShell';
import api from '../api/client';
import { formatDateDayMonth } from '../utils/format';
import styles from '../components/layout/DriverShell.module.css';

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
        setError(err.response?.data?.error || 'Could not load parties');
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <DriverShell title="Parties">
      {loading ? (
        <div className="spinner" />
      ) : error ? (
        <p className="form-error">{error}</p>
      ) : batches.length === 0 ? (
        <p style={{ fontSize: 13, color: '#888' }}>No party batches assigned yet. Ask admin to add parties.</p>
      ) : (
        batches.map((batch) => {
          const pendingTotal = (batch.entries || []).filter((e) => !e.completed).length;
          const isSubmitted = batch.status === 'submitted';

          return (
            <button
              key={batch._id}
              type="button"
              className={styles.partyBatchCard}
              onClick={() => navigate(`/parties/${batch._id}`)}
            >
              <div className={styles.partyBatchHead} style={{ padding: 0, border: 'none' }}>
                <div style={{ textAlign: 'left' }}>
                  <strong className={styles.partyBatchDate}>
                    {batch.assignedDate ? formatDateDayMonth(batch.assignedDate) : 'No date'}
                  </strong>
                  <div className={styles.partyBatchMeta}>
                    {batch.city ? `${batch.city} · ` : ''}
                    {batch.userCount || batch.entries?.length || 0} user
                    {(batch.userCount || batch.entries?.length || 0) !== 1 ? 's' : ''}
                  </div>
                </div>
                <div className={styles.partyBatchRight}>
                  {isSubmitted ? (
                    <span className="badge badge-green">Submitted</span>
                  ) : pendingTotal > 0 ? (
                    <span className="badge badge-pending">{pendingTotal} pending</span>
                  ) : (
                    <span className="badge badge-green">Ready</span>
                  )}
                  <span className={styles.partyBatchChevron}>›</span>
                </div>
              </div>
            </button>
          );
        })
      )}
    </DriverShell>
  );
}
