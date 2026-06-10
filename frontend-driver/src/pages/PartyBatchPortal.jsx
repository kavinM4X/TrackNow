import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import api from '../api/client';
import { formatINR, formatDateDayMonth } from '../utils/format';
import styles from './DriverEntry.module.css';

function initials(name) {
  return (name || '?')
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

export default function PartyBatchPortal() {
  const { batchId } = useParams();
  const navigate = useNavigate();
  const [batch, setBatch] = useState(null);
  const [error, setError] = useState('');
  const [totalSilkKg, setTotalSilkKg] = useState('');
  const [manualExtra, setManualExtra] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    api
      .get(`/driver/party-batches/${batchId}`)
      .then((r) => {
        setBatch(r.data);
        setTotalSilkKg(String(r.data.totalSilkKg || ''));
        setManualExtra(String(r.data.manualRateExtra ?? ''));
        setError('');
      })
      .catch((err) => {
        setError(err.response?.data?.error || 'Could not load entry');
        setBatch(null);
      });
  }, [batchId]);

  useEffect(() => {
    load();
  }, [load]);

  const saveSettings = async () => {
    const res = await api.patch(`/driver/party-batches/${batchId}/settings`, {
      totalSilkKg: Number(totalSilkKg) || 0,
      manualRateExtra: Number(manualExtra) || 0
    });
    setBatch(res.data);
    return res.data;
  };

  const baseRate =
    batch?.rentalAmount && Number(totalSilkKg) > 0
      ? batch.rentalAmount / Number(totalSilkKg)
      : 0;
  const effective =
    batch?.effectiveRatePerKg ??
    Math.round((baseRate + (Number(manualExtra) || 0)) * 100) / 100;

  const onSubmitAll = async () => {
    setSaving(true);
    try {
      await saveSettings();
      const res = await api.post(`/driver/party-batches/${batchId}/submit`);
      setBatch(res.data);
      alert('Saved! Entries sent for admin approval.');
      navigate('/parties');
    } catch (err) {
      alert(err.response?.data?.error || 'Submit failed');
    } finally {
      setSaving(false);
    }
  };

  if (error && !batch) {
    return (
      <div className={styles.wrap}>
        <div className={styles.expired}>
          <h2>{error}</h2>
          <Link to="/parties">← Back to parties</Link>
        </div>
      </div>
    );
  }

  if (!batch) {
    return (
      <div className={styles.wrap}>
        <div className={styles.expired}>Loading…</div>
      </div>
    );
  }

  const locked = batch.locked || batch.status === 'submitted';
  const allDone = batch.entries?.every((e) => e.completed);

  return (
    <div className={styles.wrap}>
      <div className={styles.header}>
        <div className={styles.headerTop}>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <Link to="/parties" className={styles.backLink}>
              ←
            </Link>
            <h1 style={{ margin: 0, fontSize: 18 }}>Driver Entry</h1>
          </div>
          <span style={{ fontSize: 12, opacity: 0.9 }}>
            {batch.assignedDate ? formatDateDayMonth(batch.assignedDate) : '—'}
          </span>
        </div>
      </div>

      <div className={styles.body}>
        <div className={styles.ownerCard}>
          <div>
            <div style={{ fontSize: 11, color: '#888' }}>Market</div>
            <strong>{batch.city || '—'}</strong>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 11, color: '#888' }}>Total rental</div>
            <strong style={{ fontSize: 18, color: '#8b6914' }}>{formatINR(batch.rentalAmount)}</strong>
            <div style={{ fontSize: 10, color: '#888', marginTop: 2 }}>Set by admin on assign</div>
          </div>
        </div>

        {locked ? (
          <div className={styles.expired}>
            <h2>Submitted</h2>
            <p>Entry was saved. This batch can no longer be edited.</p>
          </div>
        ) : (
          <>
            <div className={styles.calcCard}>
              <div style={{ fontWeight: 600, marginBottom: 8 }}>Rental rate calculation</div>
              <div className={styles.calcRow}>
                <span>{formatINR(batch.rentalAmount)} ÷ Total silk</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <input
                    type="number"
                    min="0"
                    step="0.1"
                    value={totalSilkKg}
                    onChange={(e) => setTotalSilkKg(e.target.value)}
                  />
                  <span>kg</span>
                </div>
              </div>
              <div className={styles.calcRow}>
                <span>Base rate</span>
                <strong>{Number(totalSilkKg) > 0 ? `${formatINR(baseRate)}/kg` : '—'}</strong>
              </div>
              <div className={styles.calcRow}>
                <span>Manual extra</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span>+</span>
                  <input
                    type="number"
                    step="0.01"
                    value={manualExtra}
                    onChange={(e) => setManualExtra(e.target.value)}
                  />
                </div>
              </div>
              <div className={styles.effective}>
                <span>Effective rate</span>
                <span>{formatINR(effective)}/kg</span>
              </div>
            </div>

            <p style={{ fontWeight: 600, fontSize: 14, marginBottom: 8 }}>Users — tap to enter</p>
            {batch.entries?.map((e) => (
              <button
                key={String(e.partyId)}
                type="button"
                className={styles.userCard}
                onClick={async () => {
                  try {
                    await saveSettings();
                    navigate(`/parties/${batchId}/user/${e.partyId}`);
                  } catch (err) {
                    alert(err.response?.data?.error || 'Failed to save settings');
                  }
                }}
              >
                <div className={styles.userLeft}>
                  <div className={styles.avatar}>{initials(e.partyName)}</div>
                  <div>
                    <div style={{ fontWeight: 600 }}>{e.partyName}</div>
                    <div style={{ fontSize: 12, color: '#888' }}>
                      {e.goodSilkKg || 0} kg
                      {e.rentalAmount != null
                        ? ` · Rental total value −${formatINR(e.rentalAmount)}`
                        : ''}
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span className={e.completed ? styles.tagDone : styles.tagPending}>
                    {e.completed ? 'Done' : 'Pending'}
                  </span>
                  <span>›</span>
                </div>
              </button>
            ))}

            <button
              type="button"
              className={styles.submitBtn}
              disabled={saving || !allDone || !totalSilkKg}
              onClick={onSubmitAll}
            >
              {saving ? 'Saving…' : 'Save All & Submit to Admin'}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
