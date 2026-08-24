import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import AppShell from '../../components/layout/AppShell';
import Spinner from '../../components/common/Spinner';
import { deduplicatedGet } from '../../api/client';
import { displayTotalKg, formatDateDayMonth, formatINR } from '../../utils/format';
import styles from './BatchDetail.module.css';

function WeightRow({ label, kg, total, dotClass, barFillClass, kgClass }) {
  const pct = total > 0 ? ((kg / total) * 100).toFixed(0) : 0;
  return (
    <div className={styles.breakdownRow}>
      <div className={styles.rowLabel}>
        <span className={`${styles.dot} ${styles[dotClass]}`} />
        <span>{label}</span>
      </div>
      <div className={styles.barTrack}>
        <div className={`${styles.barFill} ${styles[barFillClass]}`} style={{ width: `${Math.min(100, pct)}%` }} />
      </div>
      <strong className={`${styles.kgValue} ${styles[kgClass]}`}>
        {kg} kg <span className={styles.pctBadge}>{pct}%</span>
      </strong>
    </div>
  );
}

function displayRatePerKg(rate) {
  if (rate == null || rate === '' || Number.isNaN(Number(rate))) return '—';
  return `${formatINR(Number(rate))}/kg`;
}

function LineCost({ label, kg, rate, amount }) {
  const rateNum = rate == null || rate === '' ? null : Number(rate);
  const amtNum = amount == null || amount === '' ? null : Number(amount);
  return (
    <div className={styles.valueRow}>
      <span>{label} ({kg} kg × {displayRatePerKg(rateNum)})</span>
      <span className={styles.itemAmt}>
        {amtNum != null && !Number.isNaN(amtNum) ? formatINR(amtNum) : '—'}
      </span>
    </div>
  );
}

export default function BatchDetail() {
  const { batchId } = useParams();
  const navigate = useNavigate();
  const [batch, setBatch] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    setLoadError('');
    deduplicatedGet(`/batches/${batchId}`, {}, 15_000)
      .then((res) => setBatch(res.data.batch))
      .catch((err) => {
        const msg = err.response?.data?.error || 'Could not load batch details';
        setLoadError(msg);
        if (err.response?.status === 404) {
          setTimeout(() => navigate('/batch-history', { replace: true }), 2500);
        }
      })
      .finally(() => setLoading(false));
  }, [batchId, navigate]);

  if (loading) {
    return (
      <AppShell title="Batch Breakdown" backPath="/batch-history">
        <Spinner />
      </AppShell>
    );
  }

  if (!batch) {
    return (
      <AppShell title="Batch Breakdown" backPath="/batch-history">
        <div className={styles.container}>
          <div className={styles.readOnlyNote}>{loadError || 'Batch details not found'}</div>
        </div>
      </AppShell>
    );
  }

  const total = displayTotalKg(batch);
  const good = batch.goodSilkKg ?? batch.quantityKg ?? 0;
  const waste = batch.wasteKg || 0;
  const doubles = batch.doubles || 0;

  const showLineRates =
    Boolean(batch.updatedBy) ||
    batch.visibleToClient ||
    batch.goodSilkRatePerKg != null ||
    batch.wasteRatePerKg != null ||
    batch.doublesRatePerKg != null ||
    batch.goodSilkAmount != null ||
    batch.ratePerKg != null;

  const goodRate = batch.goodSilkRatePerKg ?? batch.ratePerKg;
  const wasteRate = batch.wasteRatePerKg ?? 0;
  const doublesRate = batch.doublesRatePerKg ?? 0;

  const value = batch.estimatedValue;
  const vr = batch.vehicleRental;
  const netSilk =
    vr?.netSilkValue ??
    (batch.goodSilkAmount != null
      ? Number(batch.goodSilkAmount) -
        Number(batch.wasteAmount || 0) -
        Number(batch.doublesAmount || 0)
      : null);
  const lotAmt = Number(batch.lotAmount) || 0;
  const rentalTotal = vr?.rentalDeduction ?? 0;
  const rentalOnly = Math.max(0, rentalTotal - lotAmt);

  return (
    <AppShell title="Batch Breakdown" subtitle="Detailed weight classification & payout ledger" backPath="/batch-history">
      <div className={styles.container}>
        {/* Header Summary Card */}
        <div className={styles.headerCard}>
          <div className={styles.topPillRow}>
            <span className={styles.headerDate}>🗓️ Delivery Date: {formatDateDayMonth(batch.date)}</span>
            <span className={styles.headerLoc}>📍 {batch.location} Center</span>
          </div>

          <div className={styles.headerTotal}>
            {total} <span>kg</span>
          </div>
          <div className={styles.headerSub}>
            Verified Cocoon Weight {vr?.ownerName ? `· Driver: ${vr.ownerName}` : ''}
          </div>
        </div>

        {/* Weight Classification Breakdown */}
        <div className={styles.cardBlock}>
          <h3 className={styles.breakdownTitle}>⚖️ Weight Classification</h3>
          <WeightRow label="Good Silk" kg={good} total={total} dotClass="dotGood" barFillClass="barFillGood" kgClass="kgGood" />
          <WeightRow label="Waste Silk" kg={waste} total={total} dotClass="dotWaste" barFillClass="barFillWaste" kgClass="kgWaste" />
          <WeightRow label="Doubles" kg={doubles} total={total} dotClass="dotDoubles" barFillClass="barFillDoubles" kgClass="kgDoubles" />
        </div>

        {/* Financial Breakdown & Market Rates */}
        <div className={styles.cardBlock}>
          <h3 className={styles.breakdownTitle}>💰 Market Rates & Net Value</h3>
          {(value == null || value === 0) && showLineRates && (goodRate == null || goodRate === 0) && (
            <p style={{ fontSize: 12, color: '#b45309', margin: '0' }}>
              Rates pending calculation by admin.
            </p>
          )}

          <div className={styles.financialList}>
            {showLineRates ? (
              <>
                <LineCost label="Good Silk" kg={good} rate={goodRate} amount={batch.goodSilkAmount} />
                <LineCost label="Waste Silk" kg={waste} rate={wasteRate} amount={batch.wasteAmount} />
                <LineCost label="Doubles" kg={doubles} rate={doublesRate} amount={batch.doublesAmount} />
                
                {netSilk != null && (
                  <div className={styles.netSilkRow}>
                    <span className={styles.netSilkLbl}>Net Silk Payout</span>
                    <span className={styles.netSilkVal}>{formatINR(netSilk)}</span>
                  </div>
                )}

                {!vr && (
                  <div className={styles.estimated}>
                    <span>Total Amount</span>
                    <span style={{ fontSize: 22, color: 'var(--green, #2e7d52)', fontWeight: 800 }}>
                      {value != null ? formatINR(value) : '—'}
                    </span>
                  </div>
                )}
              </>
            ) : (
              <>
                <div className={styles.valueRow}>
                  <span>
                    Market Rate ({batch.location}, {formatDateDayMonth(batch.date)})
                  </span>
                  <strong style={{ color: 'var(--blue, #1e4d7b)' }}>
                    {batch.ratePerKg ? `${formatINR(batch.ratePerKg)} / kg` : '—'}
                  </strong>
                </div>
                <div className={styles.valueRow}>
                  <span>Good Silk × Base Rate</span>
                  <span>
                    {good} kg × {batch.ratePerKg ? formatINR(batch.ratePerKg) : '—'}
                  </span>
                </div>
                <div className={styles.estimated}>
                  <span>Estimated Value</span>
                  <span style={{ fontSize: 22, color: 'var(--green, #2e7d52)', fontWeight: 800 }}>
                    {value != null ? formatINR(value) : '—'}
                  </span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Driver Logistics & Rental Deductions */}
        {vr && (
          <div className={styles.rentalCard}>
            <h4 className={styles.rentalTitle}>🚛 Driver Logistics & Deductions</h4>
            <div className={styles.valueRow}>
              <span>Assigned Freight Driver</span>
              <strong style={{ color: '#78350f' }}>{vr.ownerName}</strong>
            </div>

            {rentalOnly > 0 && (
              <div className={styles.valueRow}>
                <span>
                  Freight Rental ({good} kg × {vr.ratePerKg != null ? formatINR(vr.ratePerKg) : '—'})
                </span>
                <span style={{ color: '#92400e', fontWeight: 700 }}>−{formatINR(rentalOnly)}</span>
              </div>
            )}

            {lotAmt > 0 && (
              <div className={styles.valueRow}>
                <span>
                  Lot Charge ({batch.lotQty || 0} × {formatINR(batch.lotPrice || 0)})
                </span>
                <span style={{ color: '#92400e', fontWeight: 700 }}>−{formatINR(lotAmt)}</span>
              </div>
            )}

            <div className={styles.rentalFinal}>
              <span>Total Logistics Deduction</span>
              <span style={{ color: '#92400e' }}>−{formatINR(rentalTotal)}</span>
            </div>

            <div className={styles.rentalFinal}>
              <span>Final Farmer Payout</span>
              <span>{formatINR(vr.finalAmount ?? value)}</span>
            </div>
          </div>
        )}

        <div className={styles.readOnlyNote}>
          🔒 {vr ? 'Verified & entered by driver · Read-only audit record' : 'Verified & entered by admin · Read-only audit record'}
        </div>
      </div>
    </AppShell>
  );
}
