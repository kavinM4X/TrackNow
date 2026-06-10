import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import AppShell from '../../components/layout/AppShell';
import api from '../../api/client';
import { formatDateDayMonth, formatINR } from '../../utils/format';
import dr from './Driver.module.css';

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
            const location = p.city || p.village || '—';

            return (
              <div key={p._id} className={`card ${dr.partyCard}`}>
                <div className={dr.partyCardHead}>
                  <div className={dr.partyName}>{p.name}</div>
                  <div className={dr.partyPhone}>{p.phone || '—'}</div>
                  <div className={dr.partyLocation}>{location}</div>
                </div>

                {hasEntry ? (
                  <div className={dr.partySilkRow}>
                    <div className={dr.partyGoodSilk}>
                      <span className={dr.partyGoodSilkLbl}>Good silk</span>
                      <span className={dr.partyGoodSilkVal}>{e.goodSilkKg} kg</span>
                    </div>
                    <div className={dr.partyRate}>
                      <span className={dr.partyRateLbl}>Rate</span>
                      <span className={dr.partyRateVal}>{formatINR(e.goodSilkRatePerKg)}/kg</span>
                    </div>
                  </div>
                ) : submitted ? (
                  <p style={{ fontSize: 12, color: '#888', margin: 0 }}>No entry data</p>
                ) : null}

                {submitted && (
                  <button
                    type="button"
                    className={`btn-outline ${dr.partyEditBtn}`}
                    onClick={() => navigate(`/admin/driver/parties/${p._id}/edit`)}
                  >
                    Edit entry
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
