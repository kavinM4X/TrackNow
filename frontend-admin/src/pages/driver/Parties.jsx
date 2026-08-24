import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import AppShell from '../../components/layout/AppShell';
import api, { deduplicatedGet } from '../../api/client';
import { formatDateDayMonth } from '../../utils/format';
import styles from './Parties.module.css';

export default function Parties() {
  const navigate = useNavigate();
  const location = useLocation();
  const [batches, setBatches] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(() => {
    setLoading(true);
    setError('');
    deduplicatedGet('/admin/driver/party-batches', {}, 30_000)
      .then((r) => setBatches(Array.isArray(r.data) ? r.data : []))
      .catch((err) => {
        setBatches([]);
        setError(err.response?.data?.error || 'Could not load party batches');
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load, location.pathname, location.key]);

  const filtered = batches.filter((b) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    const userCount = b.userCount || b.entries?.length || 0;
    return (
      b.driverName?.toLowerCase().includes(q) ||
      b.city?.toLowerCase().includes(q) ||
      b.assignedDate?.includes(q) ||
      String(userCount).includes(q)
    );
  });

  return (
    <AppShell title="Party Batches">
      <div className={styles.container}>
        {/* Header Bar */}
        <div className={styles.headerBar}>
          <div className={styles.headerTitleGroup}>
            <h2>Party Batch Management</h2>
            <p className={styles.headerSub}>Manage driver party assignments, batch lists & rate settings</p>
          </div>
          <button
            type="button"
            className={styles.addBtn}
            onClick={() => navigate('/admin/driver/parties/new')}
          >
            <span>+</span> Add Party Batch
          </button>
        </div>

        {/* Search Card */}
        <div className={styles.searchCard}>
          <input
            className={styles.searchInput}
            placeholder="🔍 Search date, location, or driver..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {error && <p className="form-error">{error}</p>}

        {loading ? (
          <div className="app-loading">
            <div className="spinner" />
          </div>
        ) : filtered.length === 0 ? (
          <div className={styles.emptyState}>
            {search ? 'No party batches match your search query.' : 'No party batches recorded yet. Tap "+ Add Party Batch" to create one.'}
          </div>
        ) : (
          <div className={styles.partyFeed}>
            {filtered.map((b) => {
              const userCount = b.userCount || b.entries?.length || 0;
              return (
                <button
                  key={b._id}
                  type="button"
                  className={styles.batchCard}
                  onClick={() => navigate(`/admin/driver/parties/batch/${b._id}`)}
                >
                  <div className={styles.cardLeft}>
                    <h3 className={styles.driverName}>
                      <span>👤</span> {b.driverName || 'Unassigned Driver'}
                    </h3>
                    <div className={styles.batchMeta}>
                      <span>🗓️ {b.assignedDate ? formatDateDayMonth(b.assignedDate) : '—'}</span>
                      <span>·</span>
                      <span>📍 {b.city || 'HQ'}</span>
                      <span>·</span>
                      <span>👥 {userCount} farmer user{userCount !== 1 ? 's' : ''}</span>
                    </div>
                  </div>

                  <div className={styles.cardRight}>
                    {b.status === 'submitted' ? (
                      <span className={styles.badgeSubmitted}>✓ Submitted</span>
                    ) : (
                      <span className={styles.badgeAwaiting}>⏳ Awaiting driver</span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )}

        <button
          type="button"
          className={styles.rateSettingsBtn}
          onClick={() => navigate('/admin/driver/rates')}
        >
          ⚙️ Global Rate Settings
        </button>
      </div>
    </AppShell>
  );
}
