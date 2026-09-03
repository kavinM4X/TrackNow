import api from '../../api/client';
import { formatINR } from '../../utils/format';
import dr from './Driver.module.css';

export function groupKey(e) {
  const date = e.date || 'unknown';
  const vehicle = e.vehicleId?.vehicleNumber || e.vehicleId?._id || 'unknown';
  return `${date}::${vehicle}`;
}

export function groupEntries(entries) {
  const map = new Map();
  for (const e of entries) {
    const key = groupKey(e);
    if (!map.has(key)) {
      map.set(key, {
        date: e.date,
        vehicleNumber: e.vehicleId?.vehicleNumber || '—',
        vehicleId: e.vehicleId?._id || e.vehicleId,
        driverName: e.vehicleId?.driverName || '—',
        items: []
      });
    }
    map.get(key).items.push(e);
  }
  return [...map.values()]
    .map((g) => ({
      ...g,
      items: [...g.items].sort((a, b) => (a.partyId?.name || '').localeCompare(b.partyId?.name || ''))
    }))
    .sort((a, b) => {
      const dateCmp = (b.date || '').localeCompare(a.date || '');
      if (dateCmp !== 0) return dateCmp;
      return (a.vehicleNumber || '').localeCompare(b.vehicleNumber || '');
    });
}

export function filterTripEntries(entries, date, vehicleNumber) {
  return entries
    .filter(
      (e) =>
        e.date === date &&
        (e.vehicleId?.vehicleNumber === vehicleNumber ||
          String(e.vehicleId?._id || e.vehicleId) === vehicleNumber)
    )
    .sort((a, b) => (a.partyId?.name || '').localeCompare(b.partyId?.name || ''));
}

export async function publishEntry(id) {
  try {
    return await api.post(`/admin/driver/entries/${id}/publish`);
  } catch (postErr) {
    if (postErr.response?.status === 404) {
      return api.patch(`/admin/driver/entries/${id}/status`, { status: 'approved' });
    }
    throw postErr;
  }
}

export async function setEntryStatus(id, status) {
  return api.patch(`/admin/driver/entries/${id}/status`, { status });
}

export async function bulkApproveEntries(ids) {
  return api.post('/admin/driver/entries/bulk-approve', { ids });
}

export function EntryUserRow({ entry, onApprove, onReject, onPublish, onViewHistory }) {
  const clientId =
    entry.clientUserId?._id || entry.clientUserId || entry.partyId?.clientUserId?._id || entry.partyId?.clientUserId;

  return (
    <div className={dr.entryUserBlock}>
      <div className={dr.entryUserHead}>
        <strong>{entry.partyId?.name}</strong>
        <span
          className={`badge badge-${entry.status === 'pending' ? 'amber' : entry.status === 'approved' ? 'green' : 'red'}`}
        >
          {entry.status}
        </span>
      </div>
      <div className={dr.entryGrid}>
        <div className={`${dr.entryCell} ${dr.good}`}>
          <div>{entry.goodKg} kg</div>
          <div>Good {formatINR(entry.goodAmount)}</div>
        </div>
        <div className={`${dr.entryCell} ${dr.waste}`}>
          <div>{entry.wasteKg} kg</div>
          <div>Waste {formatINR(entry.wasteAmount)}</div>
        </div>
        <div className={`${dr.entryCell} ${dr.double}`}>
          <div>{entry.doubleKg || '—'} kg</div>
          <div>Dbl {formatINR(entry.doubleAmount)}</div>
        </div>
      </div>
      <div className={dr.entryTotalRow}>
        <span>Total</span>
        <strong className={dr.pos}>{formatINR(entry.totalAmount)}</strong>
      </div>
      {Number(entry.lotAmount) > 0 && (
        <div className={dr.entryLotRow}>
          Lot: {entry.lotQty || 0} × {formatINR(entry.lotPrice || 0)} = −{formatINR(entry.lotAmount)}
        </div>
      )}
      {entry.status === 'pending' && (
        <div className={dr.entryActions}>
          <button type="button" className={dr.approveBtn} onClick={() => onApprove(entry._id)}>
            ✓ Approve
          </button>
          <button type="button" className={dr.rejectBtn} onClick={() => onReject(entry._id)}>
            ✕ Reject
          </button>
        </div>
      )}
      {entry.status === 'approved' && (entry.clientUserId || entry.partyId?.clientUserId) && (
        <div className={dr.entryClientActions}>
          <p className={dr.entryClientLink}>
            Linked to client: {entry.clientUserId?.name || entry.partyId?.name}
          </p>
          <button type="button" className="btn-outline" style={{ fontSize: 12 }} onClick={() => onPublish(entry._id)}>
            Sync to client app
          </button>
          <button type="button" className="btn-outline" style={{ fontSize: 12 }} onClick={() => onViewHistory(clientId)}>
            View batch history
          </button>
        </div>
      )}
    </div>
  );
}
