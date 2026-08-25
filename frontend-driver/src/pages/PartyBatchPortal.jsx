import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import DriverShell from '../components/layout/DriverShell';
import api from '../api/client';
import { formatINR, formatDateDayMonth, initials } from '../utils/format';
import styles from './Parties.module.css';

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
      alert('✓ Saved! All entries submitted to admin.');
      navigate('/parties');
    } catch (err) {
      alert(err.response?.data?.error || 'Submit failed');
    } finally {
      setSaving(false);
    }
  };

  if (error && !batch) {
    return (
      <DriverShell title="Party Batch" backPath="/parties">
        <p className="form-error">{error}</p>
      </DriverShell>
    );
  }

  if (!batch) {
    return (
      <DriverShell title="Party Batch" backPath="/parties">
        <div className="app-loading">
          <div className="spinner" />
        </div>
      </DriverShell>
    );
  }

  const locked = batch.locked || batch.status === 'submitted';
  const allDone = batch.entries?.every((e) => e.completed);

  return (
    <DriverShell title={batch.city ? `${batch.city} Batch` : 'Party Batch'} backPath="/parties">
      <div className={styles.container}>
        {/* Header Hero Card */}
        <div className={styles.calcCard} style={{ background: 'linear-gradient(135deg, #7b3f00 0%, #4a2600 100%)', color: '#ffffff' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 16, fontWeight: 800 }}>📍 {batch.city || 'Market Center'}</span>
            <span style={{ fontSize: 12, opacity: 0.85 }}>
              🗓️ {batch.assignedDate ? formatDateDayMonth(batch.assignedDate) : '—'}
            </span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 4 }}>
            <div>
              <span style={{ fontSize: 11, opacity: 0.8, textTransform: 'uppercase' }}>Total Vehicle Rental</span>
              <div style={{ fontSize: 26, fontWeight: 800, color: '#f8fafc', lineHeight: 1, marginTop: 2 }}>
                {formatINR(batch.rentalAmount)}
              </div>
            </div>
            <span style={{ fontSize: 11, opacity: 0.75 }}>Set by Admin</span>
          </div>
        </div>

        {locked ? (
          <div className={styles.calcCard} style={{ textAlign: 'center' }}>
            <h3 style={{ color: 'var(--green, #2e7d52)', margin: '0 0 4px' }}>✓ Batch Submitted</h3>
            <p style={{ fontSize: 13, color: '#64748b', margin: 0 }}>
              This batch has been submitted to admin and can no longer be edited.
            </p>
          </div>
        ) : (
          <>
            {/* Rate Calculation Card */}
            <div className={styles.calcCard}>
              <h3 className={styles.calcTitle}>
                <span>🧮</span> Rental Rate Calculation
              </h3>

              <div className={styles.calcRow}>
                <span>Total Harvest Weight</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <input
                    type="number"
                    min="0"
                    step="0.1"
                    className={styles.miniInput}
                    value={totalSilkKg}
                    onChange={(e) => setTotalSilkKg(e.target.value)}
                    placeholder="0.0"
                  />
                  <strong>kg</strong>
                </div>
              </div>

              <div className={styles.calcRow}>
                <span>Base Rate ({formatINR(batch.rentalAmount)} ÷ {totalSilkKg || '0'} kg)</span>
                <strong style={{ color: '#1e293b' }}>
                  {Number(totalSilkKg) > 0 ? `${formatINR(baseRate)}/kg` : '—'}
                </strong>
              </div>

              <div className={styles.calcRow}>
                <span>Manual Extra Rate</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span>+</span>
                  <input
                    type="number"
                    step="0.01"
                    className={styles.miniInput}
                    value={manualExtra}
                    onChange={(e) => setManualExtra(e.target.value)}
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div className={styles.effectiveBox}>
                <span style={{ fontSize: 13, fontWeight: 700, color: '#7b3f00' }}>Effective Rate Per Kg</span>
                <span className={styles.effectiveVal}>{formatINR(effective)} / kg</span>
              </div>
            </div>

            {/* Farmer User List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#1e293b', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>👥 Farmers ({batch.entries?.length || 0})</span>
                <span style={{ fontSize: 11, color: '#64748b', fontWeight: 500 }}>Tap to enter harvest</span>
              </div>

              {batch.entries?.map((e) => (
                <button
                  key={String(e.partyId)}
                  type="button"
                  className={styles.farmerItemCard}
                  onClick={async () => {
                    try {
                      await saveSettings();
                      navigate(`/parties/${batchId}/user/${e.partyId}`);
                    } catch (err) {
                      alert(err.response?.data?.error || 'Failed to save settings');
                    }
                  }}
                >
                  <div className={styles.farmerLeft}>
                    <div className={styles.avatarRing}>{initials(e.partyName)}</div>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: '#1e293b' }}>
                        {e.partyName}
                      </div>
                      <div style={{ fontSize: 12, color: '#64748b' }}>
                        🌾 {e.goodSilkKg || 0} kg Good Silk
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {e.completed ? (
                      <span className={styles.badgeSubmitted}>✓ Done</span>
                    ) : (
                      <span className={styles.badgePending}>⏳ Pending</span>
                    )}
                    <span style={{ fontSize: 18, color: '#94a3b8' }}>›</span>
                  </div>
                </button>
              ))}
            </div>

            <button
              type="button"
              className={styles.submitBtn}
              disabled={saving || !allDone || !totalSilkKg}
              onClick={onSubmitAll}
            >
              {saving ? 'Submitting Batch…' : '💾 Submit All Entries to Admin'}
            </button>
          </>
        )}
      </div>
    </DriverShell>
  );
}
