import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import publicApi from '../../api/publicClient';
import { formatINR } from '../../utils/format';
import styles from './DriverRental.module.css';

function initials(name) {
  return (name || '?')
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

function formatCountdown(ms) {
  if (ms <= 0) return '00:00:00';
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return [h, m, sec].map((n) => String(n).padStart(2, '0')).join(':');
}

export default function DriverRentalPortal() {
  const { token } = useParams();
  const navigate = useNavigate();
  const [session, setSession] = useState(null);
  const [error, setError] = useState('');
  const [totalSilkKg, setTotalSilkKg] = useState('');
  const [manualExtra, setManualExtra] = useState('');
  const [saving, setSaving] = useState(false);
  const [countdown, setCountdown] = useState('');

  const load = useCallback(() => {
    publicApi
      .get(`/public/vehicle-rental/${token}`)
      .then((r) => {
        setSession(r.data);
        setTotalSilkKg(String(r.data.totalSilkKg || ''));
        setManualExtra(String(r.data.manualRateExtra ?? ''));
        setError('');
      })
      .catch((err) => {
        setError(err.response?.data?.error || 'Could not load link');
        setSession(null);
      });
  }, [token]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!session?.expiresAt) return undefined;
    const tick = () => {
      const ms = new Date(session.expiresAt) - Date.now();
      setCountdown(formatCountdown(ms));
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [session?.expiresAt]);

  const saveSettings = async () => {
    try {
      const res = await publicApi.patch(`/public/vehicle-rental/${token}/settings`, {
        totalSilkKg: Number(totalSilkKg) || 0,
        manualRateExtra: Number(manualExtra) || 0
      });
      setSession(res.data);
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to save');
    }
  };

  const baseRate =
    session?.rentalAmount && Number(totalSilkKg) > 0
      ? session.rentalAmount / Number(totalSilkKg)
      : 0;
  const effective =
    session?.effectiveRatePerKg ??
    Math.round((baseRate + (Number(manualExtra) || 0)) * 100) / 100;

  const onSubmitAll = async () => {
    setSaving(true);
    try {
      await saveSettings();
      const res = await publicApi.post(`/public/vehicle-rental/${token}/submit`);
      setSession(res.data);
      alert('Saved! Admin and farmers can see batch details.');
    } catch (err) {
      alert(err.response?.data?.error || 'Submit failed');
    } finally {
      setSaving(false);
    }
  };

  if (error && !session) {
    return (
      <div className={styles.wrap}>
        <div className={styles.expired}>
          <h2>{error}</h2>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className={styles.wrap}>
        <div className={styles.expired}>Loading…</div>
      </div>
    );
  }

  const locked = session.locked || session.status === 'submitted';
  const allDone = session.entries?.every((e) => e.completed);

  return (
    <div className={styles.wrap}>
      <div className={styles.header}>
        <div className={styles.headerTop}>
          <h1 style={{ margin: 0, fontSize: 18 }}>Driver Entry Portal</h1>
        </div>
        {!locked && (
          <div className={styles.expiryBar}>
            <span style={{ fontSize: 12, opacity: 0.9 }}>Link expires in</span>
            <span className={styles.expiryTime}>{countdown}</span>
          </div>
        )}
      </div>

      <div className={styles.body}>
        <div className={styles.ownerCard}>
          <div>
            <div style={{ fontSize: 11, color: '#888' }}>Driver</div>
            <strong>{session.vehicleOwnerName}</strong>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 11, color: '#888' }}>Total rental</div>
            <strong style={{ fontSize: 18, color: '#8b6914' }}>
              {formatINR(session.rentalAmount)}
            </strong>
          </div>
        </div>

        {locked ? (
          <div className={styles.expired}>
            <h2>Submitted</h2>
            <p>Entry was saved. This link can no longer be edited.</p>
          </div>
        ) : (
          <>
            <div className={styles.calcCard}>
              <div style={{ fontWeight: 600, marginBottom: 8 }}>Rental rate calculation</div>
              <div className={styles.calcRow}>
                <span>
                  {formatINR(session.rentalAmount)} ÷ Total silk
                </span>
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
                <strong>
                  {Number(totalSilkKg) > 0 ? `${formatINR(baseRate)}/kg` : '—'}
                </strong>
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
            {session.entries?.map((e) => (
              <button
                key={String(e.userId)}
                type="button"
                className={styles.userCard}
                onClick={async () => {
                  await saveSettings();
                  navigate(`/driver/rental/${token}/user/${e.userId}`);
                }}
              >
                <div className={styles.userLeft}>
                  <div className={styles.avatar}>{initials(e.userName)}</div>
                  <div>
                    <div style={{ fontWeight: 600 }}>{e.userName}</div>
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
