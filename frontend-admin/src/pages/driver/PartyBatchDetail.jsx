import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import AppShell from '../../components/layout/AppShell';
import api from '../../api/client';
import { formatDateDayMonth, formatINR } from '../../utils/format';

export default function PartyBatchDetail() {
  const { batchId } = useParams();
  const navigate = useNavigate();
  const [batch, setBatch] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get(`/admin/driver/party-batches/${batchId}`)
      .then((r) => setBatch(r.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [batchId]);

  const submitted = batch?.status === 'submitted';

  return (
    <AppShell
      title="Driver entry batch"
      backPath="/admin/driver/parties"
      driverSection
      hideNav
    >
      {loading ? (
        <div className="spinner" />
      ) : !batch ? (
        <p className="form-error">Batch not found</p>
      ) : (
        <>
          <div className="card" style={{ marginBottom: 12 }}>
            <strong>{batch.assignedDate ? formatDateDayMonth(batch.assignedDate) : '—'}</strong>
            <div style={{ fontSize: 12, color: '#888', marginTop: 4 }}>
              {batch.city || '—'} · {batch.parties?.length || 0} users · Driver: {batch.driverName}
            </div>
            <div style={{ fontSize: 12, marginTop: 8 }}>
              Rental: {formatINR(batch.rentalAmount)}
              {submitted && batch.totalSilkKg ? ` · Total silk ${batch.totalSilkKg} kg` : ''}
            </div>
            {!submitted && (
              <p style={{ fontSize: 12, color: '#856404', margin: '10px 0 0' }}>
                Waiting for driver to complete and submit entries.
              </p>
            )}
          </div>

          {(batch.parties || []).map((p) => {
            const e = p.batchEntry;
            const hasEntry = submitted && e?.completed;

            return (
              <div key={p._id} className="card" style={{ marginBottom: 8 }}>
                <div>
                  <strong>{p.name}</strong>
                  <div style={{ fontSize: 11, color: '#888' }}>
                    {p.phone}
                    {p.village ? ` · ${p.village}` : ''}
                    {p.city ? ` · ${p.city}` : ''}
                    {p.driverName ? ` · Driver: ${p.driverName}` : ''}
                    {p.assignedDate ? ` · ${p.assignedDate}` : ''}
                  </div>
                </div>

                {hasEntry ? (
                  <div style={{ fontSize: 11, color: '#444', marginTop: 8 }}>
                    Good {e.goodSilkKg}kg @ {formatINR(e.goodSilkRatePerKg)}/kg · Waste {e.wasteKg}kg ·
                    Doubles {e.doublesKg}kg
                    <div style={{ marginTop: 4 }}>
                      Net {formatINR(e.netSilkValue)} · Rental −{formatINR(e.rentalAmount)} · Final{' '}
                      {formatINR(e.finalAmount)}
                    </div>
                  </div>
                ) : submitted ? (
                  <p style={{ fontSize: 11, color: '#888', margin: '8px 0 0' }}>No entry data</p>
                ) : null}

                {submitted && (
                  <button
                    type="button"
                    className="btn-outline"
                    style={{ marginTop: 8, fontSize: 12 }}
                    onClick={() => navigate(`/admin/driver/parties/${p._id}/edit`)}
                  >
                    Edit party / rates
                  </button>
                )}
              </div>
            );
          })}
        </>
      )}
    </AppShell>
  );
}
