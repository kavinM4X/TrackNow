import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import AppShell from '../../components/layout/AppShell';
import api from '../../api/client';
import { MARKETS, todayISO } from '../../utils/format';
import styles from './VehicleForm.module.css';

const PAYMENT_METHODS = [
  { value: 'cash', label: '💵 Cash' },
  { value: 'upi', label: '📱 UPI' }
];

export default function VehicleForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id && id !== 'new');
  const [error, setError] = useState('');
  const [driverUsers, setDriverUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [saving, setSaving] = useState(false);

  const { register, handleSubmit, reset, watch, setValue } = useForm({
    defaultValues: {
      status: 'active',
      tripLeg: 'go',
      driverUserId: '',
      city: '',
      advanceAmount: '',
      paymentMethod: 'cash',
      advanceDate: todayISO()
    }
  });

  const paymentMethod = watch('paymentMethod');
  const tripLeg = watch('tripLeg');

  useEffect(() => {
    api
      .get('/admin/driver/driver-users')
      .then((r) => setDriverUsers(r.data))
      .catch(console.error)
      .finally(() => setLoadingUsers(false));
  }, []);

  useEffect(() => {
    if (isEdit) {
      api.get('/admin/driver/vehicles').then((r) => {
        const v = r.data.find((x) => x._id === id);
        if (v) {
          reset({
            vehicleNumber: v.vehicleNumber,
            status: v.status,
            tripLeg: v.tripLeg || 'go',
            city: v.city || '',
            driverUserId: v.driverUserId?._id || v.driverUserId || ''
          });
        }
      });
    }
  }, [id, isEdit, reset]);

  const onSubmit = async (data) => {
    setError('');
    const driver = driverUsers.find((u) => u._id === data.driverUserId);
    if (!driver) {
      setError('Please select a driver from the dropdown');
      return;
    }
    if (!data.city) {
      setError('Please select a market city');
      return;
    }

    setSaving(true);
    const payload = {
      vehicleNumber: data.vehicleNumber.trim().toUpperCase(),
      driverName: driver.name,
      driverUserId: driver._id,
      city: data.city,
      tripLeg: data.tripLeg === 'come' ? 'come' : 'go',
      status: data.status
    };

    if (!isEdit) {
      payload.advanceAmount = data.advanceAmount ? Number(data.advanceAmount) : 0;
      payload.paymentMethod = data.paymentMethod;
      payload.advanceDate = data.advanceDate || todayISO();
    }

    try {
      if (isEdit) {
        await api.put(`/admin/driver/vehicles/${id}`, payload);
      } else {
        await api.post('/admin/driver/vehicles', payload);
      }
      navigate('/admin/driver/vehicles');
    } catch (err) {
      setError(err.response?.data?.error || err.response?.data?.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppShell
      title={isEdit ? 'Edit Vehicle Trip' : 'Add Vehicle & Driver'}
      backPath="/admin/driver/vehicles"
      driverSection
      hideNav
    >
      <div className={styles.container}>
        {/* Header Hero Banner */}
        <div className={styles.heroBanner}>
          <div className={styles.badgeRow}>
            <span className={styles.pulseDot} />
            <span>FLEET & TRIP DISPATCH</span>
          </div>
          <h2 className={styles.heroTitle}>
            {isEdit ? '✏️ Edit Vehicle Record' : '🚚 Assign New Vehicle & Driver'}
          </h2>
          <p className={styles.heroSub}>
            Configure vehicle registration, assigned driver, destination market hub, and initial driver advance.
          </p>
        </div>

        {/* Main Card Form */}
        <form className={styles.formCard} onSubmit={handleSubmit(onSubmit)}>
          {/* Section 1: Vehicle & Driver Identity */}
          <div className={styles.sectionBlock}>
            <div className={styles.sectionHeader}>
              <h3 className={styles.sectionTitle}>🚗 Vehicle & Driver Details</h3>
            </div>

            <div className={styles.fieldGroup}>
              <label className={styles.fieldLabel}>
                <span>Vehicle Registration Number</span>
                <span className={styles.requiredStar}>*</span>
              </label>
              <input
                className={styles.fieldInput}
                placeholder="e.g. TN 38 BX 4589"
                style={{ textTransform: 'uppercase', fontWeight: '700', letterSpacing: '0.5px' }}
                {...register('vehicleNumber', { required: 'Vehicle number is required' })}
              />
              <span className={styles.fieldHelp}>
                💡 Same vehicle number can be used across multiple trips — each trip receives a distinct Trip ID.
              </span>
            </div>

            <div className={styles.fieldGroup}>
              <label className={styles.fieldLabel}>
                <span>Assigned Driver</span>
                <span className={styles.requiredStar}>*</span>
              </label>
              <select
                className={styles.fieldSelect}
                {...register('driverUserId', { required: 'Please select a driver' })}
                disabled={loadingUsers}
              >
                <option value="">
                  {loadingUsers ? 'Loading drivers list…' : '— Select registered driver —'}
                </option>
                {driverUsers.map((u) => (
                  <option key={u._id} value={u._id}>
                    👤 {u.name} · 📞 {u.phone} {u.role !== 'driver' ? ` (${u.role})` : ''}
                  </option>
                ))}
              </select>
              {!loadingUsers && driverUsers.length === 0 && (
                <div className={styles.helpWarning}>
                  ⚠ No driver accounts found. Drivers can register in the Driver App, or you can create one under <strong>Users → Create</strong> with role <em>Driver</em>.
                </div>
              )}
            </div>
          </div>

          {/* Section 2: Trip Route & City */}
          <div className={styles.sectionBlock}>
            <div className={styles.sectionHeader}>
              <h3 className={styles.sectionTitle}>🗺️ Trip Routing & Destination</h3>
            </div>

            <div className={styles.gridTwo}>
              <div className={styles.fieldGroup}>
                <label className={styles.fieldLabel}>
                  <span>Destination Market City</span>
                  <span className={styles.requiredStar}>*</span>
                </label>
                <select className={styles.fieldSelect} {...register('city', { required: true })}>
                  <option value="">— Select Market —</option>
                  {MARKETS.map((m) => (
                    <option key={m.key} value={m.label}>
                      📍 {m.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className={styles.fieldGroup}>
                <label className={styles.fieldLabel}>
                  <span>Trip Direction</span>
                </label>
                <div className={styles.segmentRow}>
                  <button
                    type="button"
                    className={`${styles.segmentBtn} ${tripLeg === 'go' ? styles.segmentBtnActive : ''}`}
                    onClick={() => setValue('tripLeg', 'go')}
                  >
                    ↗️ Outbound (Go)
                  </button>
                  <button
                    type="button"
                    className={`${styles.segmentBtn} ${tripLeg === 'come' ? styles.segmentBtnActive : ''}`}
                    onClick={() => setValue('tripLeg', 'come')}
                  >
                    ↙️ Return (Come)
                  </button>
                </div>
                <input type="hidden" {...register('tripLeg')} />
              </div>
            </div>
          </div>

          {/* Section 3: Driver Advance (Only on Creation) */}
          {!isEdit && (
            <div className={styles.sectionBlock}>
              <div className={styles.sectionHeader}>
                <h3 className={styles.sectionTitle}>💵 Initial Driver Advance (Optional)</h3>
              </div>

              <div className={styles.advanceBox}>
                <div className={styles.gridTwo}>
                  <div className={styles.fieldGroup}>
                    <label className={styles.fieldLabel}>
                      <span>Advance Amount (₹)</span>
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      className={styles.fieldInput}
                      placeholder="e.g. 2000"
                      {...register('advanceAmount')}
                    />
                  </div>

                  <div className={styles.fieldGroup}>
                    <label className={styles.fieldLabel}>
                      <span>Advance Date</span>
                    </label>
                    <input type="date" className={styles.fieldInput} {...register('advanceDate')} />
                  </div>
                </div>

                <div className={styles.fieldGroup}>
                  <label className={styles.fieldLabel}>
                    <span>Payment Method</span>
                  </label>
                  <div className={styles.chipRow}>
                    {PAYMENT_METHODS.map((m) => (
                      <button
                        key={m.value}
                        type="button"
                        className={`${styles.chipBtn} ${paymentMethod === m.value ? styles.chipBtnActive : ''}`}
                        onClick={() => setValue('paymentMethod', m.value)}
                      >
                        {m.label}
                      </button>
                    ))}
                  </div>
                  <input type="hidden" {...register('paymentMethod')} />
                </div>
              </div>
            </div>
          )}

          {/* Section 4: Operational Status */}
          <div className={styles.sectionBlock}>
            <div className={styles.sectionHeader}>
              <h3 className={styles.sectionTitle}>⚙️ Dispatch Status</h3>
            </div>

            <div className={styles.fieldGroup}>
              <label className={styles.fieldLabel}>
                <span>Vehicle Status</span>
              </label>
              <select className={styles.fieldSelect} {...register('status')}>
                <option value="active">🟢 Active (Ready for Dispatch / Trips)</option>
                <option value="inactive">⚪ Inactive (Maintenance / Off-duty)</option>
              </select>
            </div>
          </div>

          {error && (
            <div className={styles.errorAlert}>
              <span>⚠</span>
              <span>{error}</span>
            </div>
          )}

          {/* Action Buttons */}
          <div className={styles.actionRow}>
            <button
              type="button"
              className={styles.cancelBtn}
              onClick={() => navigate('/admin/driver/vehicles')}
              disabled={saving}
            >
              Cancel
            </button>
            <button
              type="submit"
              className={styles.submitBtn}
              disabled={loadingUsers || (driverUsers.length === 0 && !isEdit) || saving}
            >
              {saving ? 'Saving Record…' : isEdit ? '✓ Update Vehicle' : '✓ Create & Assign Vehicle'}
            </button>
          </div>
        </form>
      </div>
    </AppShell>
  );
}

