import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import AppShell from '../../components/layout/AppShell';
import api from '../../api/client';
import { formatINR } from '../../utils/format';
import dr from './Driver.module.css';

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
      .then((r) => setVehicles(r.data))
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
    <AppShell
      title="Vehicles"
      driverSection
      headerRight={
        <button type="button" className="topLink" onClick={() => navigate('/admin/driver/vehicles/new')}>
          + Add
        </button>
      }
    >
      <input
        className="field-input"
        placeholder="Search vehicle or driver..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        style={{ marginBottom: 10 }}
      />
      {loading ? (
        <div className="spinner" />
      ) : (
        filtered.map((v) => (
          <div key={v._id} className={`card ${dr.vehicleCard}`}>
            <div
              className={`${dr.vehicleHead} ${dr.vehicleCardClick}`}
              role="button"
              tabIndex={0}
              onClick={() => navigate(`/admin/driver/vehicles/${v._id}/expenses`)}
              onKeyDown={(e) => e.key === 'Enter' && navigate(`/admin/driver/vehicles/${v._id}/expenses`)}
            >
              <div>
                <strong>{v.vehicleNumber}</strong>
                <div style={{ fontSize: 11, color: '#888' }}>
                  Trip · {String(v._id).slice(-8).toUpperCase()} · Driver: {v.driverName}
                  {v.city ? ` · ${v.city}` : ''} · {v.status}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div className={`${dr.statVal} ${dr.pos}`}>{formatINR(v.balance)}</div>
                <div style={{ fontSize: 10, color: '#888' }}>Available Cash</div>
              </div>
            </div>
            <div className={dr.miniGrid}>
              <div className={dr.miniBox}>
                <div className={dr.bal}>{formatINR(v.advanceTotal)}</div>
                <div style={{ fontSize: 10, color: '#888' }}>Advance</div>
              </div>
              <div className={`${dr.miniBox} ${dr.miniBoxExp}`}>
                <div className={dr.neg}>{formatINR(v.expenseTotal)}</div>
                <div style={{ fontSize: 10, color: '#888' }}>Expenses</div>
              </div>
            </div>
            <div className={dr.actions}>
              <button
                type="button"
                className={dr.actionBtn}
                onClick={(e) => {
                  e.stopPropagation();
                  navigate(`/admin/driver/vehicles/${v._id}/expenses`);
                }}
              >
                Expenses
              </button>
              <button
                type="button"
                className={dr.actionBtn}
                onClick={(e) => {
                  e.stopPropagation();
                  navigate(`/admin/driver/vehicles/${v._id}/advance`);
                }}
              >
                + Advance
              </button>
              <button
                type="button"
                className={dr.actionBtn}
                onClick={(e) => {
                  e.stopPropagation();
                  navigate(`/admin/driver/vehicles/${v._id}/ledger`);
                }}
              >
                Ledger
              </button>
              <button
                type="button"
                className={dr.actionBtn}
                onClick={(e) => {
                  e.stopPropagation();
                  navigate(`/admin/driver/vehicles/${v._id}/expenses`);
                }}
              >
                + Expense
              </button>
            </div>
          </div>
        ))
      )}
    </AppShell>
  );
}
