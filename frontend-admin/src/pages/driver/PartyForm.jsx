import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import AppShell from '../../components/layout/AppShell';
import api from '../../api/client';
import { formatINR, todayISO } from '../../utils/format';
import be from '../admin/BatchEntry.module.css';
import vr from '../admin/VehicleRental.module.css';
import pe from './PartyEntryEdit.module.css';

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
    doublesRatePerKg: ''
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
          setForm({
            goodSilkKg: entry.goodSilkKg ?? '',
            goodSilkRatePerKg: entry.goodSilkRatePerKg || rates.goodRate || '',
            wasteKg: entry.wasteKg ?? '',
            wasteRatePerKg: entry.wasteRatePerKg || rates.wasteRate || '',
            doublesKg: entry.doublesKg ?? '',
            doublesRatePerKg: entry.doublesRatePerKg || rates.doubleRate || ''
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
  const preview = useMemo(() => calcPreview(form, rate), [form, rate]);
  const set = (key, val) => setForm((f) => ({ ...f, [key]: val }));

  const onSave = async () => {
    setError('');
    setSaving(true);
    try {
      await api.put(`/admin/driver/party-batches/${batchId}/parties/${id}`, form);
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
            <span>Rental total value</span>
            <span style={{ fontSize: 18 }}>−{formatINR(preview.rental)}</span>
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
  const [users, setUsers] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [date, setDate] = useState(todayISO());
  const [location, setLocation] = useState('Coimbatore');
  const [rentalAmount, setRentalAmount] = useState('');
  const [selectedDriverId, setSelectedDriverId] = useState('');
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
    const q = userSearch.trim().toLowerCase();
    if (!q) return users;
    return users.filter((u) => u.name?.toLowerCase().includes(q) || u.phone?.includes(q));
  }, [users, userSearch]);

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
    <div className="card">
      <label className="field-label">Date</label>
      <input type="date" className="field-input" value={date} onChange={(e) => setDate(e.target.value)} />

      <label className="field-label">Market</label>
      <select className="field-select" value={location} onChange={(e) => setLocation(e.target.value)}>
        <option value="Coimbatore">Coimbatore</option>
        <option value="Mamballi">Mamballi</option>
        <option value="Ramnagar">Ramnagar</option>
        <option value="Dharmapuri">Dharmapuri</option>
      </select>

      <p className={vr.sectionTitle}>
        <span className={vr.sectionBar} />
        Add driver
      </p>
      <input
        className="field-input"
        placeholder="Search driver to add…"
        value={driverSearch}
        onChange={(e) => setDriverSearch(e.target.value)}
      />
      {selectedDriver && (
        <div className={vr.chips}>
          <button type="button" className={vr.chip} onClick={() => setSelectedDriverId('')}>
            {selectedDriver.name} ×
          </button>
        </div>
      )}
      <div className={vr.userPickList}>
        {filteredDrivers.slice(0, 8).map((d) => (
          <button
            key={d._id}
            type="button"
            className={`${vr.userPick} ${selectedDriverId === d._id ? vr.userPickOn : ''}`}
            onClick={() => pickDriver(d._id)}
          >
            {d.name}
            <span style={{ fontSize: 11, color: '#888', display: 'block' }}>{d.phone}</span>
          </button>
        ))}
      </div>
      <p className={be.hint}>{selectedDriverId ? '1 driver added for driver entry' : '0 driver(s) added for driver entry'}</p>

      <p className={vr.sectionTitle}>
        <span className={vr.sectionBar} />
        Driver entry
      </p>
      <label className="field-label">Rental amount (₹)</label>
      <input
        type="number"
        min="0"
        className="field-input"
        placeholder="e.g. 5000"
        value={rentalAmount}
        onChange={(e) => setRentalAmount(e.target.value)}
      />

      <p className={vr.sectionTitle}>
        <span className={vr.sectionBar} />
        Add users
      </p>
      <input
        className="field-input"
        placeholder="Search user to add…"
        value={userSearch}
        onChange={(e) => setUserSearch(e.target.value)}
      />
      {selectedUserIds.length > 0 && (
        <div className={vr.chips}>
          {selectedUserIds.map((userId) => {
            const u = users.find((x) => x._id === userId);
            return (
              <button key={userId} type="button" className={vr.chip} onClick={() => toggleUser(userId)}>
                {u?.name || userId} ×
              </button>
            );
          })}
        </div>
      )}
      <div className={vr.userPickList}>
        {filteredUsers.slice(0, 8).map((u) => (
          <button
            key={u._id}
            type="button"
            className={`${vr.userPick} ${selectedUserIds.includes(u._id) ? vr.userPickOn : ''}`}
            onClick={() => toggleUser(u._id)}
          >
            {u.name}
          </button>
        ))}
      </div>
      <p className={be.hint}>{selectedUserIds.length} user(s) added for driver entry</p>
      {error && <p className="form-error">{error}</p>}
      <button type="button" className="btn-primary" style={{ marginTop: 8 }} disabled={saving} onClick={onSave}>
        {saving ? 'Saving…' : 'Save for driver entry'}
      </button>
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
