import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import AppShell from '../../components/layout/AppShell';
import Spinner from '../../components/common/Spinner';
import api from '../../api/client';
import { displayTotalKg, formatDateShort, formatINR } from '../../utils/format';
import styles from './BatchDetail.module.css';

function WeightRow({ label, kg, total, dotClass, barFillClass, kgClass }) {
  const pct = total > 0 ? Math.min(100, (kg / total) * 100) : 0;
  return (
    <div className={styles.breakdownRow}>
      <div className={styles.rowLabel}>
        <span className={`${styles.dot} ${styles[dotClass]}`} />
        <span>{label}</span>
      </div>
      <div className={styles.barTrack}>
        <div className={`${styles.barFill} ${styles[barFillClass]}`} style={{ width: `${pct}%` }} />
      </div>
      <strong className={`${styles.kgValue} ${styles[kgClass]}`}>{kg} kg</strong>
    </div>
  );
}

function LineCost({ label, kg, rate, amount }) {
  const hasLine = rate != null || amount != null;
  return (
    <div className={styles.valueRow}>
      <span>{label}</span>
      <span>
        {kg} kg × {rate != null ? formatINR(rate) : '—'} / kg
        {hasLine && amount != null ? ` → ${formatINR(amount)}` : ''}
      </span>
    </div>
  );
}

export default function BatchDetail() {
  const { batchId } = useParams();
  const navigate = useNavigate();
  const [batch, setBatch] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get(`/batches/${batchId}`)
      .then((res) => setBatch(res.data.batch))
      .catch(() => navigate('/batch-history', { replace: true }))
      .finally(() => setLoading(false));
  }, [batchId, navigate]);

  if (loading || !batch) {
    return (
      <AppShell title="Batch Detail" backPath="/batch-history">
        <Spinner />
      </AppShell>
    );
  }

  const total = displayTotalKg(batch);
  const good = batch.goodSilkKg ?? batch.quantityKg ?? 0;
  const waste = batch.wasteKg || 0;
  const doubles = batch.doubles || 0;

  const hasLinePricing =
    batch.goodSilkRatePerKg != null ||
    batch.wasteRatePerKg != null ||
    batch.doublesRatePerKg != null ||
    batch.goodSilkAmount != null;

  const value = batch.estimatedValue;

  return (
    <AppShell title="Batch Detail" backPath="/batch-history">
      <div className={`card ${styles.headerCard}`}>
        <div className={styles.headerDate}>{formatDateShort(batch.date)}</div>
        <div className={styles.headerLoc}>{batch.location} Market</div>
        <div className={styles.headerTotal}>
          {total} <span>kg</span>
        </div>
        <div className={styles.headerSub}>Total weight (good + waste + doubles)</div>
      </div>

      <div className="card">
        <p className={styles.breakdownTitle}>Weight breakdown</p>
        <WeightRow label="Good Silk" kg={good} total={total} dotClass="dotGood" barFillClass="barFillGood" kgClass="kgGood" />
        <WeightRow label="Waste" kg={waste} total={total} dotClass="dotWaste" barFillClass="barFillWaste" kgClass="kgWaste" />
        <WeightRow label="Doubles" kg={doubles} total={total} dotClass="dotDoubles" barFillClass="barFillDoubles" kgClass="kgDoubles" />
      </div>

      <div className="card">
        <p className={styles.breakdownTitle}>Rates &amp; amounts</p>
        {hasLinePricing ? (
          <>
            <LineCost
              label="Good silk"
              kg={good}
              rate={batch.goodSilkRatePerKg ?? batch.ratePerKg}
              amount={batch.goodSilkAmount}
            />
            <LineCost label="Waste" kg={waste} rate={batch.wasteRatePerKg} amount={batch.wasteAmount} />
            <LineCost
              label="Doubles"
              kg={doubles}
              rate={batch.doublesRatePerKg}
              amount={batch.doublesAmount}
            />
            <div className={styles.estimated}>
              <strong>Total amount</strong>
              <strong style={{ fontSize: 18, color: 'var(--green)' }}>
                {value != null ? formatINR(value) : '—'}
              </strong>
            </div>
          </>
        ) : (
          <>
            <div className={styles.valueRow}>
              <span>
                Rate ({batch.location}, {formatDateShort(batch.date)})
              </span>
              <strong style={{ color: 'var(--blue)' }}>
                {batch.ratePerKg ? `${formatINR(batch.ratePerKg)} / kg` : '—'}
              </strong>
            </div>
            <div className={styles.valueRow}>
              <span>Good Silk × Rate</span>
              <span>
                {good} × {batch.ratePerKg ? formatINR(batch.ratePerKg) : '—'}
              </span>
            </div>
            <div className={styles.estimated}>
              <strong>Estimated value</strong>
              <strong style={{ fontSize: 18, color: 'var(--green)' }}>
                {value != null ? formatINR(value) : '—'}
              </strong>
            </div>
          </>
        )}
      </div>

      <p className={styles.readOnlyNote}>Data entered by admin · Read only</p>
    </AppShell>
  );
}
