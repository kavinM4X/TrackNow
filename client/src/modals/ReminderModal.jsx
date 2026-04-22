import './ReminderModal.css';

const ReminderModal = ({ nextBatch, onClose }) => {
  return (
    <div className="reminder-modal-overlay" onClick={onClose}>
      <div className="reminder-modal" onClick={(e) => e.stopPropagation()}>
        <div className="reminder-modal-header">
          <div
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              background: '#FCD34D',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '24px',
            }}
          >
            ⏰
          </div>
          <button className="reminder-modal-close" onClick={onClose}>
            ✕
          </button>
        </div>

        <h2 style={{ fontSize: '20px', fontWeight: '800', color: '#1A2E1A', marginBottom: '8px' }}>
          Pending Batch
        </h2>
        <p style={{ fontSize: '14px', color: '#6B8B6F', marginBottom: '20px' }}>
          You have a pending batch waiting for confirmation.
        </p>

        {nextBatch && (
          <div
            style={{
              background: '#F0F7F2',
              border: '1px solid #D1E9DC',
              borderRadius: '12px',
              padding: '16px',
              marginBottom: '20px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <p style={{ fontSize: '13px', color: '#6B8B6F', margin: 0 }}>Location</p>
              <p style={{ fontSize: '13px', fontWeight: '700', color: '#1A2E1A', margin: 0 }}>
                {nextBatch.location}
              </p>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <p style={{ fontSize: '13px', color: '#6B8B6F', margin: 0 }}>Date</p>
              <p style={{ fontSize: '13px', fontWeight: '700', color: '#1A2E1A', margin: 0 }}>
                {new Date(nextBatch.date).toLocaleDateString('en-IN')}
              </p>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <p style={{ fontSize: '13px', color: '#6B8B6F', margin: 0 }}>Weight</p>
              <p style={{ fontSize: '13px', fontWeight: '700', color: '#1A2E1A', margin: 0 }}>
                {nextBatch.weight} kg
              </p>
            </div>
          </div>
        )}

        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={onClose}
            style={{
              flex: 1,
              height: '44px',
              background: '#E0EBE0',
              border: 'none',
              borderRadius: '10px',
              fontSize: '14px',
              fontWeight: '700',
              color: '#1B6B3A',
              cursor: 'pointer',
              transition: 'all 200ms ease',
            }}
            onMouseOver={(e) => (e.target.style.background = '#D1E0D6')}
            onMouseOut={(e) => (e.target.style.background = '#E0EBE0')}
          >
            Later
          </button>
          <button
            onClick={onClose}
            style={{
              flex: 1,
              height: '44px',
              background: '#1B6B3A',
              border: 'none',
              borderRadius: '10px',
              fontSize: '14px',
              fontWeight: '700',
              color: 'white',
              cursor: 'pointer',
              transition: 'all 200ms ease',
            }}
            onMouseOver={(e) => (e.target.style.background = '#2D9B57')}
            onMouseOut={(e) => (e.target.style.background = '#1B6B3A')}
          >
            View Details
          </button>
        </div>
      </div>
    </div>
  );
};

export default ReminderModal;
