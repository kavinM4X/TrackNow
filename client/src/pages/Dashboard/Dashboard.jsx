import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { getLatestRates } from '../../api/marketRate.api';
import { getMyBatches } from '../../api/batch.api';
import DashboardCards from './DashboardCards';
import MarketRateCard from './MarketRateCard';
import { SkeletonCard } from '../../components';
import { ReminderModal } from '../../components/modals';
import './Dashboard.css';

const Dashboard = () => {
  const { user } = useAuth();
  const [marketRates, setMarketRates] = useState([]);
  const [batchData, setBatchData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showReminder, setShowReminder] = useState(false);

  const loadDashboard = async () => {
    setLoading(true);
    try {
      const [ratesResponse, batchesResponse] = await Promise.all([
        getLatestRates(),
        getMyBatches(user._id),
      ]);

      setMarketRates(ratesResponse.data);
      setBatchData(batchesResponse);

      if (
        batchesResponse.nextBatch &&
        batchesResponse.nextBatch.status === 'Pending'
      ) {
        setShowReminder(true);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const ratesResponse = await getLatestRates();
        setMarketRates(ratesResponse.data);
      } catch (err) {
        console.error('Failed to update market rates:', err);
      }
    }, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, []);

  const getGreeting = () => {
    const hours = new Date().getHours();
    if (hours < 12) return 'Good morning';
    if (hours < 18) return 'Good afternoon';
    return 'Good evening';
  };

  if (loading) {
    return (
      <div className="dashboard-page">
        <div className="dashboard-header">
          <div className="dashboard-header-top">
            <div>
              <p style={{ color: 'rgba(255, 255, 255, 0.8)', marginBottom: '4px' }}>
                {getGreeting()}
              </p>
              <p className="dashboard-greeting-name">{user?.name}</p>
            </div>
            <div
              style={{
                width: '44px',
                height: '44px',
                borderRadius: '50%',
                background: 'rgba(255, 255, 255, 0.2)',
                border: '2px solid rgba(255, 255, 255, 0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontSize: '18px',
                fontWeight: '700',
              }}
            >
              {user?.name?.charAt(0).toUpperCase()}
            </div>
          </div>
        </div>

        <div style={{ padding: '0 16px' }}>
          <MarketRateCard marketRates={[]} />
          <div className="dashboard-body">
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-page">
      <div className="dashboard-header">
        <div className="dashboard-header-top">
          <div>
            <p style={{ color: 'rgba(255, 255, 255, 0.8)', marginBottom: '4px' }}>
              {getGreeting()}
            </p>
            <p className="dashboard-greeting-name">{user?.name}</p>
          </div>
          <div
            style={{
              width: '44px',
              height: '44px',
              borderRadius: '50%',
              background: 'rgba(255, 255, 255, 0.2)',
              border: '2px solid rgba(255, 255, 255, 0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontSize: '18px',
              fontWeight: '700',
            }}
          >
            {user?.name?.charAt(0).toUpperCase()}
          </div>
        </div>
      </div>

      <div style={{ padding: '0 16px' }}>
        <MarketRateCard marketRates={marketRates} />

        <div className="dashboard-body">
          <DashboardCards
            totalBatches={batchData?.totalBatches || 0}
            totalKg={batchData?.totalKg || 0}
          />

          {batchData?.nextBatch && (
            <div style={{ marginBottom: '24px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '12px', color: '#1A2E1A' }}>
                Next Batch
              </h3>
              <div
                className="batch-card"
                style={{
                  background: batchData.nextBatch.status === 'Pending' ? 'rgba(59, 130, 246, 0.05)' : 'white',
                }}
              >
                <div>
                  <p style={{ fontSize: '14px', color: '#6B8B6F', marginBottom: '4px' }}>
                    {new Date(batchData.nextBatch.date).toLocaleDateString('en-IN')}
                  </p>
                  <p style={{ fontSize: '15px', fontWeight: '600', color: '#1A2E1A' }}>
                    {batchData.nextBatch.location}
                  </p>
                </div>
                <div
                  style={{
                    background: batchData.nextBatch.status === 'Pending' ? '#FCD34D' : '#10B981',
                    color: '#1A2E1A',
                    padding: '4px 10px',
                    borderRadius: '6px',
                    fontSize: '12px',
                    fontWeight: '700',
                  }}
                >
                  {batchData.nextBatch.status}
                </div>
              </div>
            </div>
          )}

          {batchData?.batches && batchData.batches.length > 0 && (
            <div>
              <h3 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '12px', color: '#1A2E1A' }}>
                Last Batches
              </h3>
              {batchData.batches.slice(0, 2).map((batch, idx) => (
                <div key={idx} className="batch-card">
                  <div>
                    <p style={{ fontSize: '14px', color: '#6B8B6F', marginBottom: '4px' }}>
                      {new Date(batch.date).toLocaleDateString('en-IN')}
                    </p>
                    <p style={{ fontSize: '15px', fontWeight: '600', color: '#1A2E1A' }}>
                      {batch.location}
                    </p>
                  </div>
                  <div style={{ fontSize: '15px', fontWeight: '700', color: '#1B6B3A' }}>
                    {batch.totalKg} kg
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {showReminder && batchData?.nextBatch && (
        <ReminderModal
          nextBatch={batchData.nextBatch}
          onClose={() => setShowReminder(false)}
        />
      )}
    </div>
  );
};

export default Dashboard;
