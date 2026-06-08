import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import AppShell from '../../components/layout/AppShell';
import api from '../../api/client';
import { formatINR } from '../../utils/format';
import dr from './Driver.module.css';

export default function Ledger() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get(`/admin/driver/vehicles/${id}/ledger`)
      .then((r) => setData(r.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

  let running = 0;
  const rowsWithBalance = (data?.rows || []).map((row) => {
    running += row.sign * row.amount;
    return { ...row, balance: running };
  });

  return (
    <AppShell title="Cash Ledger" backPath="/admin/driver/vehicles" driverSection hideNav>
      {loading ? (
        <div className="spinner" />
      ) : (
        <>
          <div className="card" style={{ marginBottom: 10 }}>
            <strong>{data?.vehicle?.vehicleNumber}</strong> · {data?.vehicle?.driverName}
          </div>
          <div className={dr.previewBox}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Current Balance</span>
              <strong className={dr.pos}>{formatINR(data?.totals?.balance)}</strong>
            </div>
          </div>
          <div
            className={dr.ledgerRow}
            style={{ background: '#f0f4f9', fontWeight: 600, color: '#1a3c5e' }}
          >
            <span>Date</span>
            <span>Type</span>
            <span style={{ textAlign: 'right' }}>Amount</span>
            <span style={{ textAlign: 'right' }}>Balance</span>
          </div>
          {rowsWithBalance.map((row) => (
            <div key={row._id} className={`card ${dr.ledgerRow}`} style={{ marginBottom: 4, padding: 6 }}>
              <span>{row.date?.slice(5) || row.date}</span>
              <span style={{ textTransform: 'capitalize' }}>{row.type}</span>
              <span
                style={{ textAlign: 'right' }}
                className={row.sign > 0 ? dr.pos : dr.neg}
              >
                {row.sign > 0 ? '+' : '-'}
                {formatINR(row.amount)}
              </span>
              <span style={{ textAlign: 'right' }}>{formatINR(row.balance)}</span>
            </div>
          ))}
        </>
      )}
    </AppShell>
  );
}
