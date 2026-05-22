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

function displayRatePerKg(rate) {
  if (rate == null || rate === '' || Number.isNaN(Number(rate))) return '—';
  return `${formatINR(Number(rate))} / kg`;
}

function LineCost({ label, kg, rate, amount }) {
  const rateNum = rate == null || rate === '' ? null : Number(rate);
  const amtNum = amount == null || amount === '' ? null : Number(amount);
  return (
    <div className={styles.valueRow}>
      <span>{label}</span>
      <span>
        {kg} kg × {displayRatePerKg(rateNum)}
        {amtNum != null && !Number.isNaN(amtNum) ? ` → ${formatINR(amtNum)}` : ''}
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
    api
      .get(`/batches/${batchId}`)
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
      <AppShell title="Batch Detail" backPath="/batch-history">
        <Spinner />
      </AppShell>
    );
  }

  if (!batch) {
    return (
      <AppShell title="Batch Detail" backPath="/batch-history">
        <p className="empty-text">{loadError || 'Batch not found'}</p>
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

  return (
    <AppShell title="Batch Detail" backPath="/batch-history">
      <div className={`card ${styles.headerCard}`}>
        <div className={styles.headerDate}>{formatDateShort(batch.date)}</div>
        <div className={styles.headerLoc}>
          {batch.location} Market
          {vr?.ownerName ? ` · Driver: ${vr.ownerName}` : ''}
        </div>
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
        {(value == null || value === 0) && showLineRates && (goodRate == null || goodRate === 0) && (
          <p style={{ fontSize: 12, color: '#b45309', margin: '0 0 10px' }}>
            Rates are not saved yet. Ask admin to open Batch Entry, enter Good silk / Waste / Doubles
            rates, and save again.
          </p>
        )}
        {showLineRates ? (
          <>
            <p className={styles.breakdownTitle}>Silk value</p>
            <LineCost label="Good silk" kg={good} rate={goodRate} amount={batch.goodSilkAmount} />
            <LineCost label="Waste" kg={waste} rate={wasteRate} amount={batch.wasteAmount} />
            <LineCost label="Doubles" kg={doubles} rate={doublesRate} amount={batch.doublesAmount} />
            {netSilk != null && (
              <div className={styles.netSilkRow}>
                <strong>Total value</strong>
                <strong style={{ color: 'var(--green)' }}>{formatINR(netSilk)}</strong>
              </div>
            )}
            {!vr && (
              <div className={styles.estimated}>
                <strong>Total amount</strong>
                <strong style={{ fontSize: 18, color: 'var(--green)' }}>
                  {value != null ? formatINR(value) : '—'}
                </strong>
              </div>
            )}
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

      {vr && (
        <div className={styles.rentalCard}>
          <p className={styles.rentalTitle}>Vehicle rental deduction</p>
          <div className={styles.valueRow}>
            <span>{vr.ownerName}</span>
            <span style={{ fontSize: 12, color: '#888' }}>
              Rate {vr.ratePerKg != null ? `${formatINR(vr.ratePerKg)}/kg` : '—'}
            </span>
          </div>
          <div className={styles.valueRow}>
            <span>
              {good} kg × {vr.ratePerKg != null ? formatINR(vr.ratePerKg) : '—'}
            </span>
            <span style={{ color: '#8b6914', fontWeight: 600 }}>
              −{formatINR(vr.rentalDeduction)}
            </span>
          </div>
          <div className={styles.rentalFinal}>
            <strong>Final amount</strong>
            <strong>{formatINR(vr.finalAmount ?? value)}</strong>
          </div>
        </div>
      )}

      <p className={styles.readOnlyNote}>
        {vr ? 'Entered by driver · Read only' : 'Data entered by admin · Read only'}
      </p>
    </AppShell>
  );
}
