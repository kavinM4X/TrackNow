import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import AppShell from '../../components/layout/AppShell';
import api from '../../api/client';
import { formatDateDayMonth, formatINR } from '../../utils/format';
import styles from './PartyBatchDetail.module.css';

function EntryBreakdown({ entry, rate }) {
  const lotQty = Number(entry.lotQty) || 0;
  const lotPrice = Number(entry.lotPrice) || 0;
  const lot = Number(entry.lotAmount) || Math.round(lotQty * lotPrice);
  const rental = Number(entry.rentalAmount) || 0;
  const rentalTotal = Number(entry.rentalTotalAmount) || rental + lot;

  return (
    <div className={styles.entryBreakdown}>
      <div className={styles.calcLine}>
        <span>Good: {entry.goodSilkKg || 0} kg × {formatINR(entry.goodSilkRatePerKg || 0)}</span>
        <span className={styles.valPos}>+{formatINR(entry.goodSilkAmount)}</span>
      </div>
      <div className={styles.calcLine}>
        <span>Waste: {entry.wasteKg || 0} kg × {formatINR(entry.wasteRatePerKg || 0)}</span>
        <span className={styles.valNeg}>−{formatINR(entry.wasteAmount)}</span>
      </div>
      <div className={styles.calcLine}>
        <span>Doubles: {entry.doublesKg || 0} kg × {formatINR(entry.doublesRatePerKg || 0)}</span>
        <span className={styles.valNeg}>−{formatINR(entry.doublesAmount)}</span>
      </div>
      <div className={styles.netRow}>
        <span>Total Net Silk Value</span>
        <span>{formatINR(entry.netSilkValue)}</span>
      </div>

      {(rate > 0 || lot > 0) && (
        <div className={styles.rentalBox}>
          <span className={styles.rentalTitle}>Rental Breakdown</span>
          {rate > 0 && (
            <div className={styles.calcLine}>
              <span>Rental: {entry.goodSilkKg || 0} kg × {formatINR(rate)}</span>
              <span className={styles.valNeg}>−{formatINR(rental)}</span>
            </div>
          )}
          {lot > 0 && (
            <div className={styles.calcLine}>
              <span>Lot: {lotQty} × {formatINR(lotPrice)}</span>
              <span className={styles.valNeg}>−{formatINR(lot)}</span>
            </div>
          )}
          <div className={styles.rentalTotal}>
            <span>Total Rental Deduction</span>
            <span>−{formatINR(rentalTotal)}</span>
          </div>
        </div>
      )}

      {entry.finalAmount != null && (
        <div className={styles.finalRow}>
          <span>Final Payable Amount</span>
          <span>{formatINR(entry.finalAmount)}</span>
        </div>
      )}
    </div>
  );
}

export default function PartyBatchDetail() {
  const { batchId } = useParams();
  const navigate = useNavigate();
  const [batch, setBatch] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get(`/admin/driver/party-batches/${batchId}`)
      .then((r) => setBatch(r.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [batchId]);

  const submitted = batch?.status === 'submitted';
  const rate = batch?.effectiveRatePerKg || 0;

  return (
    <AppShell
      title="Driver Entry Batch"
      backPath="/admin/driver/parties"
    >
      <div className={styles.container}>
        {loading ? (
          <div className="app-loading">
            <div className="spinner" />
          </div>
        ) : !batch ? (
          <p className="form-error">Party batch not found</p>
        ) : (
          <>
            {/* Batch Hero Banner */}
            <div className={styles.heroBanner}>
              <div className={styles.heroHead}>
                <div>
                  <h2 className={styles.batchDate}>
                    <span>🗓️</span> {batch.assignedDate ? formatDateDayMonth(batch.assignedDate) : '—'}
                  </h2>
                  <div className={styles.batchSub}>
                    <span>📍 {batch.city || 'HQ'}</span>
                    <span>·</span>
                    <span>👥 {batch.parties?.length || 0} farmer user(s)</span>
                    <span>·</span>
                    <span>👤 Driver: {batch.driverName || 'Unassigned'}</span>
                  </div>
                </div>
                <div>
                  {submitted ? (
                    <span className={styles.badgeSubmitted}>✓ Submitted</span>
                  ) : (
                    <span className={styles.badgeAwaiting}>⏳ Awaiting Driver</span>
                  )}
                </div>
              </div>

              <div className={styles.statsRow}>
                <div className={styles.statPill}>
                  <span>💳 Rental:</span>
                  <strong>{formatINR(batch.rentalAmount)}</strong>
                </div>
                {rate > 0 && (
                  <div className={styles.statPill}>
                    <span>⚖️ Effective Rate:</span>
                    <strong>{formatINR(rate)}/kg</strong>
                  </div>
                )}
                {submitted && batch.totalSilkKg ? (
                  <div className={styles.statPill}>
                    <span>📦 Total Silk:</span>
                    <strong>{batch.totalSilkKg} kg</strong>
                  </div>
                ) : null}
              </div>
            </div>

            {/* Farmer Parties Feed */}
            <div className={styles.partyFeed}>
              {(batch.parties || []).map((p) => {
                const e = p.batchEntry;
                const hasEntry = e?.completed;
                const location = p.city || p.village || '—';

                return (
                  <div key={p._id} className={styles.partyCard}>
                    <div className={styles.partyHead}>
                      <div>
                        <h3 className={styles.farmerName}>👤 {p.name}</h3>
                        <div className={styles.farmerMeta}>
                          <span>📱 {p.phone || '—'}</span>
                          <span>·</span>
                          <span>📍 {location}</span>
                        </div>
                      </div>
                    </div>

                    {hasEntry ? (
                      <EntryBreakdown entry={e} rate={rate} />
                    ) : submitted ? (
                      <p className={styles.emptyText}>No entry data recorded.</p>
                    ) : (
                      <p className={styles.emptyText}>⏳ Pending driver entry completion.</p>
                    )}

                    {submitted && (
                      <button
                        type="button"
                        className={styles.editBtn}
                        onClick={() => navigate(`/admin/driver/parties/${p._id}/edit`)}
                      >
                        ✎ Edit Entry
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </AppShell>
  );
}
