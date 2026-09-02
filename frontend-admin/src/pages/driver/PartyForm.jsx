import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import AppShell from '../../components/layout/AppShell';
import api from '../../api/client';
import { formatINR, todayISO } from '../../utils/format';
import { calcSilkPreview, lotFieldsFromEntry } from '../../utils/silkCalc';
import be from '../admin/BatchEntry.module.css';
import vr from '../admin/VehicleRental.module.css';
import pe from './PartyEntryEdit.module.css';
import styles from './PartyForm.module.css';

function PartyEditForm({ id }) {
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [party, setParty] = useState(null);
  const [batch, setBatch] = useState(null);
  const [batchId, setBatchId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    goodSilkKg: '',
    goodSilkRatePerKg: '',
    wasteKg: '',
    wasteRatePerKg: '',
    doublesKg: '',
    doublesRatePerKg: '',
    lotQty: '',
    lotPrice: ''
  });

  useEffect(() => {
    const load = async () => {
      try {
        const [partiesRes, batchesRes] = await Promise.all([
          api.get('/admin/driver/parties'),
          api.get('/admin/driver/party-batches')
        ]);
        const p = partiesRes.data.find((x) => x._id === id);
        if (!p) {
          setLoading(false);
          return;
        }
        setParty(p);

        const match = batchesRes.data.find(
          (b) =>
            String(b.driverUserId) === String(p.driverUserId?._id || p.driverUserId) &&
            b.assignedDate === p.assignedDate &&
            (b.city || '') === (p.city || '')
        );
        if (!match) {
          setLoading(false);
          return;
        }

        setBatchId(match._id);
        const [batchRes, ratesRes] = await Promise.all([
          api.get(`/admin/driver/party-batches/${match._id}`),
          api.get('/admin/driver/rates', { params: { partyId: id } })
        ]);
        setBatch(batchRes.data);
        const entry = batchRes.data.entries?.find((x) => String(x.partyId) === id);
        const rates = ratesRes.data;
        if (entry) {
          const lot = lotFieldsFromEntry(entry);
          setForm({
            goodSilkKg: entry.goodSilkKg ?? '',
            goodSilkRatePerKg: entry.goodSilkRatePerKg || rates.goodRate || '',
            wasteKg: entry.wasteKg ?? '',
            wasteRatePerKg: entry.wasteRatePerKg || rates.wasteRate || '',
            doublesKg: entry.doublesKg ?? '',
            doublesRatePerKg: entry.doublesRatePerKg || rates.doubleRate || '',
            lotQty: lot.lotQty,
            lotPrice: lot.lotPrice
          });
        }
      } catch (err) {
        setError(err.response?.data?.error || 'Could not load party');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  const rate = useMemo(() => {
    if (batch?.effectiveRatePerKg > 0) return batch.effectiveRatePerKg;
    const total = Number(batch?.totalSilkKg) || 0;
    if (total <= 0 || !batch?.rentalAmount) return 0;
    const base = batch.rentalAmount / total;
    const extra = Number(batch.manualRateExtra) || 0;
    return Math.round((base + extra) * 100) / 100;
  }, [batch]);
  const preview = useMemo(() => calcSilkPreview(form, rate), [form, rate]);
  const set = (key, val) => setForm((f) => ({ ...f, [key]: val }));

  const onSave = async () => {
    setError('');
    setSaving(true);
    try {
      await api.put(`/admin/driver/party-batches/${batchId}/parties/${id}`, {
        ...form,
        lotQty: Number(form.lotQty) || 0,
        lotPrice: Number(form.lotPrice) || 0
      });
      navigate(batchId ? `/admin/driver/parties/batch/${batchId}` : '/admin/driver/parties');
    } catch (err) {
      setError(err.response?.data?.error || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="spinner" />;

  if (!party) {
    return <p className="form-error">Party not found</p>;
  }

  const entry = batch?.entries?.find((x) => String(x.partyId) === id);

  const canEdit = batch?.status === 'submitted' || entry?.completed;

  if (!batchId || !entry || !canEdit) {
    return (
      <div className="card">
        <p style={{ fontSize: 13, color: '#888' }}>
          Edit is available only after the driver submits this batch.
        </p>
        <button type="button" className="btn-outline" style={{ marginTop: 10 }} onClick={() => navigate(-1)}>
          Go back
        </button>
      </div>
    );
  }

  return (
    <>
      <div className="card" style={{ marginBottom: 12 }}>
        <strong>{party.name}</strong>
        <div className={pe.userMeta}>
          {party.phone}
          {party.village ? ` · ${party.village}` : ''}
        </div>
        {batch?.effectiveRatePerKg > 0 && (
          <div className={pe.rateHint}>
            Effective rental rate: {formatINR(batch.effectiveRatePerKg)}/kg
            {batch.totalSilkKg ? ` · Total silk ${batch.totalSilkKg} kg` : ''}
          </div>
        )}
      </div>

      <div className={pe.detailLayout}>
        <div className="card" style={{ padding: 12 }}>
          <p style={{ fontWeight: 600, marginBottom: 10 }}>Enter silk details</p>

          <div className={pe.silkBlock}>
            <div className={`${pe.silkLabel} ${pe.silkGood}`}>Good silk (kg)</div>
            <div className={pe.silkGrid}>
              <input
                className={`${pe.silkInput} ${pe.silkInputGood}`}
                type="number"
                min="0"
                step="0.1"
                value={form.goodSilkKg}
                onChange={(e) => set('goodSilkKg', e.target.value)}
              />
              <div>
                <div className={`${pe.silkLabel} ${pe.silkGood}`}>Rate (₹/kg)</div>
                <input
                  className={`${pe.silkInput} ${pe.silkInputGood}`}
                  type="number"
                  min="0"
                  value={form.goodSilkRatePerKg}
                  onChange={(e) => set('goodSilkRatePerKg', e.target.value)}
                />
              </div>
            </div>
          </div>

          <div className={pe.silkBlock}>
            <div className={`${pe.silkLabel} ${pe.silkWaste}`}>Waste (kg)</div>
            <div className={pe.silkGrid}>
              <input
                className={pe.silkInput}
                type="number"
                min="0"
                value={form.wasteKg}
                onChange={(e) => set('wasteKg', e.target.value)}
              />
              <div>
                <div className={`${pe.silkLabel} ${pe.silkWaste}`}>Rate (₹/kg)</div>
                <input
                  className={pe.silkInput}
                  type="number"
                  min="0"
                  value={form.wasteRatePerKg}
                  onChange={(e) => set('wasteRatePerKg', e.target.value)}
                />
              </div>
            </div>
          </div>

          <div className={pe.silkBlock}>
            <div className={`${pe.silkLabel} ${pe.silkDoubles}`}>Doubles (kg)</div>
            <div className={pe.silkGrid}>
              <input
                className={pe.silkInput}
                type="number"
                min="0"
                value={form.doublesKg}
                onChange={(e) => set('doublesKg', e.target.value)}
              />
              <div>
                <div className={`${pe.silkLabel} ${pe.silkDoubles}`}>Rate (₹/kg)</div>
                <input
                  className={pe.silkInput}
                  type="number"
                  min="0"
                  value={form.doublesRatePerKg}
                  onChange={(e) => set('doublesRatePerKg', e.target.value)}
                />
              </div>
            </div>
          </div>

          <div className={pe.silkBlock}>
            <div className={`${pe.silkLabel} ${pe.silkLot}`}>Lot</div>
            <div className={pe.silkGrid}>
              <input
                className={pe.silkInput}
                type="number"
                min="0"
                step="0.1"
                value={form.lotQty}
                onChange={(e) => set('lotQty', e.target.value)}
              />
              <div>
                <div className={`${pe.silkLabel} ${pe.silkLot}`}>Price (₹)</div>
                <input
                  className={pe.silkInput}
                  type="number"
                  min="0"
                  value={form.lotPrice}
                  onChange={(e) => set('lotPrice', e.target.value)}
                />
              </div>
            </div>
          </div>
        </div>

        <div className={pe.calcPanel}>
          <p style={{ fontWeight: 600, marginBottom: 8 }}>Auto calculation</p>
          <div className={pe.calcLine}>
            <span>
              Good: {form.goodSilkKg || 0} × {formatINR(form.goodSilkRatePerKg || 0)}
            </span>
            <span className={pe.pos}>+{formatINR(preview.goodAmt)}</span>
          </div>
          <div className={pe.calcLine}>
            <span>
              Waste: {form.wasteKg || 0} × {formatINR(form.wasteRatePerKg || 0)}
            </span>
            <span className={pe.neg}>−{formatINR(preview.wasteAmt)}</span>
          </div>
          <div className={pe.calcLine}>
            <span>
              Doubles: {form.doublesKg || 0} × {formatINR(form.doublesRatePerKg || 0)}
            </span>
            <span className={pe.neg}>−{formatINR(preview.doublesAmt)}</span>
          </div>
          <div className={pe.netBox}>
            <span>Total value</span>
            <span>{formatINR(preview.netSilk)}</span>
          </div>
          <div className={pe.finalBox}>
            <p style={{ fontWeight: 600, margin: '0 0 8px' }}>Rental total value</p>
            {rate > 0 && (
              <div className={pe.calcLine}>
                <span>
                  Rental: {form.goodSilkKg || 0} kg × {formatINR(rate)}
                </span>
                <span className={pe.neg}>−{formatINR(preview.rental)}</span>
              </div>
            )}
            {(Number(form.lotQty) > 0 || Number(form.lotPrice) > 0) && (
              <div className={pe.calcLine}>
                <span>
                  Lot: {Number(form.lotQty) || 0} × {formatINR(Number(form.lotPrice) || 0)}
                </span>
                <span className={pe.neg}>−{formatINR(preview.lotAmt)}</span>
              </div>
            )}
            <div className={pe.rentalTotalRow}>
              <span>Rental total value</span>
              <span style={{ fontSize: 18 }}>−{formatINR(preview.rentalTotal)}</span>
            </div>
          </div>
        </div>
      </div>

      {error && <p className="form-error">{error}</p>}
      <button type="button" className="btn-primary" style={{ marginTop: 12 }} disabled={saving} onClick={onSave}>
        {saving ? 'Saving…' : `Save ${party.name}`}
      </button>
    </>
  );
}

function PartyAddForm() {
  const navigate = useNavigate();
  const locationState = useLocation().state || {};
  const [users, setUsers] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [date, setDate] = useState(locationState.date || todayISO());
  const [location, setLocation] = useState(locationState.location || 'Coimbatore');
  const [rentalAmount, setRentalAmount] = useState('');
  const [selectedDriverId, setSelectedDriverId] = useState('');
  const targetBookedUsers = useMemo(() => {
    const list = locationState.bookedUsers || [];
    const ids = new Set();
    const phones = new Set();
    const names = new Set();

    const rawIds = locationState.userIds 
      ? locationState.userIds 
      : (locationState.userId ? [locationState.userId] : []);
    rawIds.forEach((x) => ids.add(String(x?._id || x)));

    list.forEach((b) => {
      const uId = b.userId?._id || b.userId;
      if (uId) ids.add(String(uId));
      if (b.phone && b.phone !== '—') phones.add(String(b.phone).trim());
      if (b.userName && b.userName !== '—') names.add(String(b.userName).trim().toLowerCase());
    });

    const active = ids.size > 0 || phones.size > 0 || names.size > 0;
    return { ids, phones, names, active };
  }, [locationState.bookedUsers, locationState.userIds, locationState.userId]);

  const [selectedUserIds, setSelectedUserIds] = useState([]);
  const [userSearch, setUserSearch] = useState('');
  const [driverSearch, setDriverSearch] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/admin/users').then((r) => setUsers(r.data.filter((u) => u.role === 'user')));
    api.get('/admin/driver/driver-users').then((r) => setDrivers(r.data));
  }, []);

  useEffect(() => {
    if (!targetBookedUsers.active || users.length === 0) return;
    const matchedIds = users
      .filter((u) => {
        const uId = String(u._id);
        const uPhone = String(u.phone || '').trim();
        const uName = String(u.name || '').trim().toLowerCase();
        return (
          targetBookedUsers.ids.has(uId) ||
          (uPhone && targetBookedUsers.phones.has(uPhone)) ||
          (uName && targetBookedUsers.names.has(uName))
        );
      })
      .map((u) => String(u._id));

    if (matchedIds.length > 0) {
      setSelectedUserIds(matchedIds);
    }
  }, [users, targetBookedUsers]);

  useEffect(() => {
    if (!selectedDriverId) {
      setRentalAmount('');
      return;
    }
    api
      .get('/admin/driver/vehicles')
      .then((r) => {
        const v = r.data.find(
          (x) => String(x.driverUserId?._id || x.driverUserId) === selectedDriverId && x.status === 'active'
        );
        if (v?.advanceTotal > 0) {
          setRentalAmount((prev) => (prev.trim() ? prev : String(v.advanceTotal)));
        }
      })
      .catch(() => {});
  }, [selectedDriverId]);

  const filteredUsers = useMemo(() => {
    let list = users;
    if (targetBookedUsers.active) {
      list = list.filter((u) => {
        const uId = String(u._id);
        const uPhone = String(u.phone || '').trim();
        const uName = String(u.name || '').trim().toLowerCase();
        return (
          targetBookedUsers.ids.has(uId) ||
          (uPhone && targetBookedUsers.phones.has(uPhone)) ||
          (uName && targetBookedUsers.names.has(uName))
        );
      });
    }
    const q = userSearch.trim().toLowerCase();
    if (!q) return list;
    return list.filter((u) => u.name?.toLowerCase().includes(q) || u.phone?.includes(q));
  }, [users, userSearch, targetBookedUsers]);

  const filteredDrivers = useMemo(() => {
    const q = driverSearch.trim().toLowerCase();
    if (!q) return drivers;
    return drivers.filter((d) => d.name?.toLowerCase().includes(q) || d.phone?.includes(q));
  }, [drivers, driverSearch]);

  const toggleUser = (userId) => {
    setSelectedUserIds((prev) =>
      prev.includes(userId) ? prev.filter((x) => x !== userId) : [...prev, userId]
    );
  };

  const pickDriver = (driverId) => {
    setSelectedDriverId((prev) => (prev === driverId ? '' : driverId));
    setDriverSearch('');
  };

  const selectedDriver = drivers.find((d) => d._id === selectedDriverId);

  const onSave = async () => {
    setError('');
    if (!selectedDriverId) {
      setError('Add a driver');
      return;
    }
    if (selectedUserIds.length === 0) {
      setError('Add at least one user');
      return;
    }
    if (!rentalAmount || Number(rentalAmount) <= 0) {
      setError('Enter rental amount');
      return;
    }
    setSaving(true);
    try {
      await api.post('/admin/driver/parties/bulk', {
        userIds: selectedUserIds,
        driverUserId: selectedDriverId,
        city: location,
        assignedDate: date,
        rentalAmount: Number(rentalAmount)
      });
      navigate('/admin/driver/parties');
    } catch (err) {
      setError(err.response?.data?.error || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={styles.formWrapper}>
      {/* Header Banner */}
      <div className={styles.headerCard}>
        <div>
          <h2 className={styles.headerTitle}>
            <span>🚚</span> Driver Party Batch Allocation
          </h2>
          <p className={styles.headerSub}>
            Allocate driver, vehicle rental rate, and assign farmer parties for transport.
          </p>
        </div>
        <div className={styles.contextBadge}>
          <span>🗓️ {date}</span>
          <span>·</span>
          <span>📍 {location}</span>
          {selectedUserIds.length > 0 && <span>· 👥 {selectedUserIds.length} Farmers</span>}
        </div>
      </div>

      {/* Section 1: Trip & Market Settings */}
      <div className={styles.sectionCard}>
        <div className={styles.sectionHeader}>
          <h3 className={styles.sectionTitle}>
            <span>📅</span> Trip & Destination Settings
          </h3>
        </div>
        <div className={styles.twoColGrid}>
          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel}>Scheduled Date</label>
            <input
              type="date"
              className={styles.fieldInput}
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel}>Market Destination</label>
            <select
              className={styles.fieldSelect}
              value={location}
              onChange={(e) => setLocation(e.target.value)}
            >
              <option value="Coimbatore">📍 Coimbatore</option>
              <option value="Mamballi">📍 Mamballi</option>
              <option value="Ramnagar">📍 Ramnagar</option>
              <option value="Dharmapuri">📍 Dharmapuri</option>
            </select>
          </div>
        </div>
      </div>

      {/* Section 2: Driver Allocation */}
      <div className={styles.sectionCard}>
        <div className={styles.sectionHeader}>
          <h3 className={styles.sectionTitle}>
            <span>🚗</span> Driver Allocation
          </h3>
          <span className={styles.sectionCountBadge}>
            {selectedDriver ? `Selected: ${selectedDriver.name}` : 'No Driver Selected'}
          </span>
        </div>

        <div className={styles.searchInputWrap}>
          <span className={styles.searchIcon}>🔍</span>
          <input
            className={styles.searchInput}
            placeholder="Search driver by name or mobile number…"
            value={driverSearch}
            onChange={(e) => setDriverSearch(e.target.value)}
          />
        </div>

        {selectedDriver && (
          <div className={styles.selectedChips}>
            <button
              type="button"
              className={styles.chipItem}
              onClick={() => setSelectedDriverId('')}
              title="Click to remove driver"
            >
              <span>🚗 {selectedDriver.name} ({selectedDriver.phone})</span>
              <span className={styles.chipRemoveIcon}>×</span>
            </button>
          </div>
        )}

        <div className={styles.pickGrid}>
          {filteredDrivers.slice(0, 8).map((d) => {
            const isSelected = selectedDriverId === d._id;
            return (
              <button
                key={d._id}
                type="button"
                className={`${styles.pickCard} ${isSelected ? styles.pickCardActiveDriver : ''}`}
                onClick={() => pickDriver(d._id)}
              >
                <div className={styles.pickCardInfo}>
                  <div className={styles.avatarCircle}>
                    {d.name ? d.name.charAt(0).toUpperCase() : 'D'}
                  </div>
                  <div className={styles.pickCardText}>
                    <span className={styles.pickName}>{d.name}</span>
                    <span className={styles.pickMeta}>📱 {d.phone || 'No phone'}</span>
                  </div>
                </div>
                <div className={styles.checkIndicator}>
                  {isSelected ? '✓' : ''}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Section 3: Driver Rental Amount */}
      <div className={styles.sectionCard}>
        <div className={styles.sectionHeader}>
          <h3 className={styles.sectionTitle}>
            <span>💰</span> Vehicle Rental Rate
          </h3>
        </div>
        <div className={styles.fieldGroup}>
          <label className={styles.fieldLabel}>Rental Amount for Batch (₹)</label>
          <div className={styles.currencyInputWrap}>
            <span className={styles.currencyPrefix}>₹</span>
            <input
              type="number"
              min="0"
              className={styles.currencyInput}
              placeholder="e.g. 5000"
              value={rentalAmount}
              onChange={(e) => setRentalAmount(e.target.value)}
            />
          </div>
          {selectedDriver && Number(rentalAmount) > 0 && (
            <span className={styles.hintPill}>
              ✨ Vehicle advance rate applied for {selectedDriver.name}
            </span>
          )}
        </div>
      </div>

      {/* Section 4: Assign Farmers / Parties */}
      <div className={styles.sectionCard}>
        <div className={styles.sectionHeader}>
          <h3 className={styles.sectionTitle}>
            <span>👥</span> Assigned Farmers / Parties
          </h3>
          <span className={styles.sectionCountBadge}>
            {selectedUserIds.length} farmer{selectedUserIds.length !== 1 ? 's' : ''} assigned
          </span>
        </div>

        <div className={styles.searchInputWrap}>
          <span className={styles.searchIcon}>🔍</span>
          <input
            className={styles.searchInput}
            placeholder="Search farmer by name or mobile number…"
            value={userSearch}
            onChange={(e) => setUserSearch(e.target.value)}
          />
        </div>

        {selectedUserIds.length > 0 && (
          <div className={styles.selectedChips}>
            {selectedUserIds.map((userId) => {
              const u = users.find((x) => String(x._id) === String(userId));
              return (
                <button
                  key={userId}
                  type="button"
                  className={styles.chipItem}
                  onClick={() => toggleUser(String(userId))}
                  title="Click to remove farmer"
                >
                  <span>🧑‍🌾 {u?.name || userId}</span>
                  <span className={styles.chipRemoveIcon}>×</span>
                </button>
              );
            })}
          </div>
        )}

        <div className={styles.pickGrid}>
          {filteredUsers.slice(0, 12).map((u) => {
            const isSelected = selectedUserIds.map(String).includes(String(u._id));
            return (
              <button
                key={u._id}
                type="button"
                className={`${styles.pickCard} ${isSelected ? styles.pickCardActive : ''}`}
                onClick={() => toggleUser(String(u._id))}
              >
                <div className={styles.pickCardInfo}>
                  <div className={styles.avatarCircle}>
                    {u.name ? u.name.charAt(0).toUpperCase() : 'U'}
                  </div>
                  <div className={styles.pickCardText}>
                    <span className={styles.pickName}>{u.name}</span>
                    <span className={styles.pickMeta}>📱 {u.phone || 'No phone'}</span>
                  </div>
                </div>
                <div className={styles.checkIndicator}>
                  {isSelected ? '✓' : ''}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Section 5: Summary & Submit Action */}
      <div className={styles.actionCard}>
        <div className={styles.summaryRow}>
          <span>Assigned Driver:</span>
          <span className={styles.summaryVal}>{selectedDriver?.name || '⚠️ Please select a driver'}</span>
        </div>
        <div className={styles.summaryRow}>
          <span>Assigned Farmers:</span>
          <span className={styles.summaryVal}>
            {selectedUserIds.length > 0 ? `${selectedUserIds.length} Farmers` : '⚠️ No farmers selected'}
          </span>
        </div>
        <div className={styles.summaryRow}>
          <span>Trip Destination:</span>
          <span className={styles.summaryVal}>📍 {location} · {date}</span>
        </div>
        <div className={styles.summaryRow}>
          <span>Total Rental:</span>
          <span className={styles.summaryVal}>
            {rentalAmount ? `₹${Number(rentalAmount).toLocaleString('en-IN')}` : '—'}
          </span>
        </div>

        {error && <div className={styles.errorBanner}>⚠️ {error}</div>}

        <button
          type="button"
          className={styles.submitBtn}
          disabled={saving}
          onClick={onSave}
        >
          {saving ? 'Creating Batch…' : 'Save & Create Driver Batch →'}
        </button>
      </div>
    </div>
  );
}

export default function PartyForm() {
  const { id } = useParams();
  const isEdit = Boolean(id && id !== 'new');

  return (
    <AppShell
      title={isEdit ? 'Edit driver entry' : 'Driver Party Entry'}
      backPath="/admin/driver/parties"
      driverSection
      hideNav
    >
      {isEdit ? <PartyEditForm id={id} /> : <PartyAddForm />}
    </AppShell>
  );
}
