import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import publicApi from '../../api/publicClient';
import { formatINR } from '../../utils/format';
import styles from './DriverRental.module.css';

function calcPreview(entry, rate) {
  const good = Number(entry.goodSilkKg) || 0;
  const waste = Number(entry.wasteKg) || 0;
  const doubles = Number(entry.doublesKg) || 0;
  const gr = Number(entry.goodSilkRatePerKg) || 0;
  const wr = Number(entry.wasteRatePerKg) || 0;
  const dr = Number(entry.doublesRatePerKg) || 0;
  const goodAmt = Math.round(good * gr);
  const wasteAmt = Math.round(waste * wr);
  const doublesAmt = Math.round(doubles * dr);
  const netSilk = goodAmt - wasteAmt - doublesAmt;
  const rental = Math.round(good * rate);
  const finalAmount = netSilk - rental;
  return { goodAmt, wasteAmt, doublesAmt, netSilk, rental, finalAmount };
}

export default function DriverRentalUser() {
  const { token, userId } = useParams();
  const navigate = useNavigate();
  const [session, setSession] = useState(null);
  const [form, setForm] = useState({
    goodSilkKg: '',
    goodSilkRatePerKg: '',
    wasteKg: '',
    wasteRatePerKg: '',
    doublesKg: '',
    doublesRatePerKg: ''
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    publicApi
      .get(`/public/vehicle-rental/${token}`)
      .then((r) => {
        setSession(r.data);
        const e = r.data.entries?.find((x) => String(x.userId) === userId);
        if (e) {
          setForm({
            goodSilkKg: e.goodSilkKg || '',
            goodSilkRatePerKg: e.goodSilkRatePerKg || '',
            wasteKg: e.wasteKg || '',
            wasteRatePerKg: e.wasteRatePerKg || '',
            doublesKg: e.doublesKg || '',
            doublesRatePerKg: e.doublesRatePerKg || ''
          });
        }
      })
      .catch(() => navigate(`/driver/rental/${token}`));
  }, [token, userId, navigate]);

  const entry = session?.entries?.find((x) => String(x.userId) === userId);
  const rate = session?.effectiveRatePerKg || 0;
  const preview = useMemo(() => calcPreview(form, rate), [form, rate]);
  const locked = session?.locked;

  const set = (key, val) => setForm((f) => ({ ...f, [key]: val }));

  const onSave = async () => {
    setSaving(true);
    try {
      await publicApi.put(`/public/vehicle-rental/${token}/users/${userId}`, form);
      navigate(`/driver/rental/${token}`);
    } catch (err) {
      alert(err.response?.data?.error || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  if (!session || !entry) {
    return <div className={styles.wrap}><div className={styles.expired}>Loading…</div></div>;
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.header}>
        <div className={styles.headerTop}>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <Link to={`/driver/rental/${token}`} className={styles.backLink}>
              ←
            </Link>
            <h1 style={{ margin: 0, fontSize: 18 }}>{entry.userName}</h1>
          </div>
          <span style={{ background: 'rgba(255,255,255,.2)', padding: '2px 8px', borderRadius: 4, fontSize: 12 }}>
            {form.goodSilkKg || 0} kg
          </span>
        </div>
      </div>

      <div className={styles.body}>
        <div className={styles.detailLayout}>
          <div className="card" style={{ padding: 12 }}>
            <p style={{ fontWeight: 600, marginBottom: 10 }}>Enter silk details</p>

            <div className={styles.silkBlock}>
              <div className={`${styles.silkLabel} ${styles.silkGood}`}>Good silk (kg)</div>
              <div className={styles.silkGrid}>
                <input
                  className={`${styles.silkInput} ${styles.silkInputGood}`}
                  type="number"
                  min="0"
                  step="0.1"
                  disabled={locked}
                  value={form.goodSilkKg}
                  onChange={(e) => set('goodSilkKg', e.target.value)}
                />
                <div>
                  <div className={`${styles.silkLabel} ${styles.silkGood}`}>Rate (₹/kg)</div>
                  <input
                    className={`${styles.silkInput} ${styles.silkInputGood}`}
                    type="number"
                    min="0"
                    disabled={locked}
                    value={form.goodSilkRatePerKg}
                    onChange={(e) => set('goodSilkRatePerKg', e.target.value)}
                  />
                </div>
              </div>
            </div>

            <div className={styles.silkBlock}>
              <div className={`${styles.silkLabel} ${styles.silkWaste}`}>Waste (kg)</div>
              <div className={styles.silkGrid}>
                <input
                  className={styles.silkInput}
                  type="number"
                  min="0"
                  disabled={locked}
                  value={form.wasteKg}
                  onChange={(e) => set('wasteKg', e.target.value)}
                />
                <div>
                  <div className={`${styles.silkLabel} ${styles.silkWaste}`}>Rate (₹/kg)</div>
                  <input
                    className={styles.silkInput}
                    type="number"
                    min="0"
                    disabled={locked}
                    value={form.wasteRatePerKg}
                    onChange={(e) => set('wasteRatePerKg', e.target.value)}
                  />
                </div>
              </div>
            </div>

            <div className={styles.silkBlock}>
              <div className={`${styles.silkLabel} ${styles.silkDoubles}`}>Doubles (kg)</div>
              <div className={styles.silkGrid}>
                <input
                  className={styles.silkInput}
                  type="number"
                  min="0"
                  disabled={locked}
                  value={form.doublesKg}
                  onChange={(e) => set('doublesKg', e.target.value)}
                />
                <div>
                  <div className={`${styles.silkLabel} ${styles.silkDoubles}`}>Rate (₹/kg)</div>
                  <input
                    className={styles.silkInput}
                    type="number"
                    min="0"
                    disabled={locked}
                    value={form.doublesRatePerKg}
                    onChange={(e) => set('doublesRatePerKg', e.target.value)}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className={styles.calcPanel}>
            <p style={{ fontWeight: 600, marginBottom: 8 }}>Auto calculation</p>
            <div className={styles.calcLine}>
              <span>
                Good: {form.goodSilkKg || 0} × {formatINR(form.goodSilkRatePerKg || 0)}
              </span>
              <span className={styles.pos}>+{formatINR(preview.goodAmt)}</span>
            </div>
            <div className={styles.calcLine}>
              <span>
                Waste: {form.wasteKg || 0} × {formatINR(form.wasteRatePerKg || 0)}
              </span>
              <span className={styles.neg}>−{formatINR(preview.wasteAmt)}</span>
            </div>
            <div className={styles.calcLine}>
              <span>
                Doubles: {form.doublesKg || 0} × {formatINR(form.doublesRatePerKg || 0)}
              </span>
              <span className={styles.neg}>−{formatINR(preview.doublesAmt)}</span>
            </div>
            <div className={styles.netBox}>
              <span>Total value</span>
              <span>{formatINR(preview.netSilk)}</span>
            </div>
            <div className={styles.finalBox}>
              <span>Rental total value</span>
              <span style={{ fontSize: 18 }}>−{formatINR(preview.rental)}</span>
            </div>
          </div>
        </div>

        {!locked && (
          <button
            type="button"
            className={styles.submitBtn}
            disabled={saving}
            onClick={onSave}
          >
            {saving ? 'Saving…' : `Save ${entry.userName}`}
          </button>
        )}
      </div>
    </div>
  );
}
