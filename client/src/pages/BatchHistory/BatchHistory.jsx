import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { getMyBatches } from '../../api/batch.api';
import { SkeletonList } from '../../components';
import './BatchHistory.css';

const BatchHistory = () => {
  const { user } = useAuth();
  const [batches, setBatches] = useState([]);
  const [totalKg, setTotalKg] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchText, setSearchText] = useState('');
  const [page, setPage] = useState(1);

  const loadBatches = async () => {
    setLoading(true);
    try {
      const response = await getMyBatches(user._id);
      setBatches(response.batches || []);
      setTotalKg(response.totalKg || 0);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBatches();
  }, []);

  const filteredBatches = useMemo(() => {
    if (!searchText) return batches;

    return batches.filter((batch) => {
      const dateStr = new Date(batch.date).toLocaleDateString('en-IN');
      const matchDate = dateStr.includes(searchText);
      const matchLocation = batch.location.toLowerCase().includes(searchText.toLowerCase());
      return matchDate || matchLocation;
    });
  }, [batches, searchText]);

  const itemsPerPage = 10;
  const paginatedBatches = filteredBatches.slice(0, page * itemsPerPage);
  const hasMore = paginatedBatches.length < filteredBatches.length;

  return (
    <div className="batch-history-page">
      <div className="page-header">
        <h1>Batch History</h1>
      </div>

      {/* Search Bar */}
      <div className="search-wrapper">
        <svg
          className="search-icon"
          width="18"
          height="18"
          viewBox="0 0 18 18"
          fill="none"
        >
          <circle cx="7.5" cy="7.5" r="5.5" stroke="currentColor" strokeWidth="1.5" />
          <path d="M12 12l4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
        <input
          type="text"
          className="search-input"
          placeholder="Search by date or location"
          value={searchText}
          onChange={(e) => {
            setSearchText(e.target.value);
            setPage(1);
          }}
        />
      </div>

      {/* Summary Banner */}
      {batches.length > 0 && (
        <div className="summary-banner">
          <div>
            <p style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.6)', margin: '0 0 6px' }}>
              Total Batches
            </p>
            <p className="summary-banner-value">{batches.length}</p>
          </div>
          <div style={{ width: '1px', height: '40px', background: 'rgba(255, 255, 255, 0.1)' }}></div>
          <div style={{ textAlign: 'right' }}>
            <p style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.6)', margin: '0 0 6px' }}>
              Total Kg
            </p>
            <p className="summary-banner-value">{totalKg.toFixed(1)}</p>
          </div>
        </div>
      )}

      {/* Loading State */}
      {loading ? (
        <SkeletonList count={5} />
      ) : filteredBatches.length === 0 ? (
        <div
          style={{
            textAlign: 'center',
            padding: '48px 24px',
            background: 'white',
            borderRadius: '16px',
            border: '1px dashed #E0EBE0',
          }}
        >
          <svg
            width="48"
            height="48"
            viewBox="0 0 48 48"
            fill="none"
            style={{ margin: '0 auto 16px', opacity: 0.4 }}
          >
            <rect x="8" y="12" width="32" height="24" rx="2" stroke="currentColor" strokeWidth="2" />
            <path d="M18 8v-2a2 2 0 012-2h8a2 2 0 012 2v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
          <p style={{ fontSize: '14px', color: '#9CA99F', margin: '0' }}>
            {searchText ? 'No batches found matching your search.' : 'No batches recorded yet.'}
          </p>
        </div>
      ) : (
        <div>
          {paginatedBatches.map((batch, idx) => (
            <div key={idx} className="batch-list-item" style={{ animationDelay: `${Math.min(idx * 0.06, 0.42)}s` }}>
              <div className="batch-item-left">
                <p style={{ fontSize: '15px', fontWeight: '700', color: '#1A2E1A', margin: '0 0 4px' }}>
                  Batch #{idx + 1}
                </p>
                <p style={{ fontSize: '13px', color: '#9CA99F', margin: '0 0 2px' }}>
                  {new Date(batch.date).toLocaleDateString('en-IN')}
                </p>
                <p style={{ fontSize: '12px', color: '#9CA99F', margin: 0 }}>
                  {batch.location}
                </p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <p className="batch-item-kg">{batch.totalKg} kg</p>
                <div className="done-badge">Done</div>
              </div>
            </div>
          ))}

          {hasMore && (
            <button
              className="load-more-btn"
              onClick={() => setPage(page + 1)}
            >
              Load More Batches
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default BatchHistory;
