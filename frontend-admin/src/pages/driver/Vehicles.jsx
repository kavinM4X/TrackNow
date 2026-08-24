import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import AppShell from '../../components/layout/AppShell';
import api from '../../api/client';
import { formatINR } from '../../utils/format';
import styles from './Vehicles.module.css';

export default function Vehicles() {
  const navigate = useNavigate();
  const location = useLocation();
  const [vehicles, setVehicles] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    api
      .get('/admin/driver/vehicles')
      .then((r) => setVehicles(r.data || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, [location.pathname]);

  const filtered = vehicles.filter(
    (v) =>
      v.vehicleNumber?.toLowerCase().includes(search.toLowerCase()) ||
      v.driverName?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <AppShell title="Fleet Vehicles">
      <div className={styles.container}>
        {/* Header Bar */}
        <div className={styles.headerBar}>
          <div className={styles.headerTitleGroup}>
            <h2>Registered Fleet Vehicles</h2>
            <p className={styles.headerSub}>Manage logistics vehicles, cash balances & trip expenses</p>
          </div>
          <button
            type="button"
            className={styles.addBtn}
            onClick={() => navigate('/admin/driver/vehicles/new')}
          >
            <span>+</span> Register New Vehicle
          </button>
        </div>

        {/* Search Bar Box */}
        <div className={styles.searchCard}>
          <input
            className={styles.searchInput}
            placeholder="🔍 Search vehicle number or driver name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {loading ? (
          <div className="app-loading">
            <div className="spinner" />
          </div>
        ) : filtered.length === 0 ? (
          <div className={styles.emptyState}>
            {search ? 'No fleet vehicles match your search query.' : 'No registered vehicles found. Click "+ Register New Vehicle" to add one.'}
          </div>
        ) : (
          <div className={styles.vehiclesGrid}>
            {filtered.map((v) => {
              const tripId = String(v._id).slice(-8).toUpperCase();
              return (
                <div key={v._id} className={styles.vehicleCard}>
                  <div
                    className={styles.cardHead}
                    role="button"
                    tabIndex={0}
                    onClick={() => navigate(`/admin/driver/vehicles/${v._id}/expenses`)}
                    onKeyDown={(e) =>
                      e.key === 'Enter' && navigate(`/admin/driver/vehicles/${v._id}/expenses`)
                    }
                  >
                    <div>
                      <h3 className={styles.vehicleTitle}>
                        <span>🚛</span> {v.vehicleNumber}
                      </h3>
                      <div className={styles.metaInfo}>
                        <span>👤 Driver: {v.driverName || 'Unassigned'}</span>
                        {v.city && <span>· 📍 {v.city}</span>}
                        <span>· #{tripId}</span>
                      </div>
                    </div>

                    <div className={styles.balanceBox}>
                      <div className={styles.balanceVal}>{formatINR(v.balance)}</div>
                      <span className={styles.balanceLbl}>Available Cash</span>
                    </div>
                  </div>

                  <div className={styles.miniGrid}>
                    <div className={styles.miniBox}>
                      <div className={`${styles.miniVal} ${styles.valPos}`}>
                        {formatINR(v.advanceTotal)}
                      </div>
                      <div className={styles.miniLbl}>Total Advance</div>
                    </div>
                    <div className={`${styles.miniBox} ${styles.miniBoxExp}`}>
                      <div className={`${styles.miniVal} ${styles.valNeg}`}>
                        -{formatINR(v.expenseTotal)}
                      </div>
                      <div className={styles.miniLbl}>Total Expenses</div>
                    </div>
                  </div>

                  <div className={styles.actionsGrid}>
                    <button
                      type="button"
                      className={styles.actionBtn}
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/admin/driver/vehicles/${v._id}/expenses`);
                      }}
                    >
                      Expenses
                    </button>

                    <button
                      type="button"
                      className={styles.actionBtn}
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/admin/driver/vehicles/${v._id}/advance`);
                      }}
                    >
                      + Advance
                    </button>

                    <button
                      type="button"
                      className={styles.actionBtn}
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/admin/driver/vehicles/${v._id}/ledger`);
                      }}
                    >
                      Ledger
                    </button>

                    <button
                      type="button"
                      className={styles.actionBtn}
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/admin/driver/vehicles/${v._id}/expenses`);
                      }}
                    >
                      + Expense
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AppShell>
  );
}
