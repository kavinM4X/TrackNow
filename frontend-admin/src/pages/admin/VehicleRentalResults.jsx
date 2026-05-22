import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import AppShell from '../../components/layout/AppShell';
import api from '../../api/client';
import { formatDateShort, formatINR } from '../../utils/format';
import vr from './VehicleRental.module.css';

function initials(name) {
  return (name || '?')
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

export default function VehicleRentalResults() {
  const { sessionId } = useParams();
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get(`/admin/vehicle-rentals/${sessionId}`)
      .then((r) => setSession(r.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [sessionId]);

  if (loading) {
    return (
      <AppShell title="Batch Results" backPath="/admin/batch-entry">
        <div className="spinner" />
      </AppShell>
    );
  }

  if (!session) {
    return (
      <AppShell title="Batch Results" backPath="/admin/batch-entry">
        <p className="empty-text">Session not found</p>
      </AppShell>
    );
  }

  return (
    <AppShell title="Batch Results" backPath="/admin/batch-entry">
      <div className={vr.summaryCard}>
        <div className={vr.sessionTop}>
          <strong>{formatDateShort(session.date)}</strong>
          <span className={session.status === 'submitted' ? vr.badgeDone : vr.badgePending}>
            {session.status === 'submitted' ? 'Submitted' : 'Pending'}
          </span>
        </div>
        {session.submittedAt && (
          <p className={vr.sessionMeta}>
            Driver saved · {new Date(session.submittedAt).toLocaleString()}
          </p>
        )}
        <div className={vr.sessionTop} style={{ marginTop: 8 }}>
          <span>Driver: {session.vehicleOwnerName}</span>
          <strong>{formatINR(session.rentalAmount)}</strong>
        </div>
        <p className={vr.sessionMeta}>
          {session.entries?.length} users · {session.totalSilkKg || session.totalGoodKg || 0} kg silk
          {session.effectiveRatePerKg > 0 && ` · Rate ${formatINR(session.effectiveRatePerKg)}/kg`}
        </p>
        {session.driverUrl && session.status === 'pending' && (
          <p className={vr.sessionMeta} style={{ wordBreak: 'break-all' }}>
            Driver link: {session.driverUrl}
          </p>
        )}
      </div>

      <p className="section-title">User breakdown</p>
      {(session.entries || []).map((e) => (
        <div key={String(e.userId)} className={`card ${vr.userBreakdown}`}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <div className={vr.avatar}>{initials(e.userName)}</div>
            <strong>{e.userName}</strong>
          </div>
          <div className={vr.userBreakdownGrid}>
            <div>
              <div style={{ fontWeight: 600, color: '#2e7d52' }}>{e.goodSilkKg} kg</div>
              <small>Good</small>
            </div>
            <div>
              <div style={{ fontWeight: 600, color: '#8b6914' }}>
                {e.rentalAmount != null ? formatINR(e.rentalAmount) : '—'}
              </div>
              <small>Rental</small>
            </div>
            <div>
              <div style={{ fontWeight: 600, color: 'var(--blue)' }}>
                {e.finalAmount != null ? formatINR(e.finalAmount) : '—'}
              </div>
              <small>Net</small>
            </div>
          </div>
          {e.completed && (
            <p className={vr.sessionMeta} style={{ marginTop: 6 }}>
              Silk net {formatINR(e.netSilkValue)} · Waste {e.wasteKg}kg · Doubles {e.doublesKg}kg
            </p>
          )}
        </div>
      ))}
    </AppShell>
  );
}
