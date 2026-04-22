import { useState, useEffect, useRef } from 'react';

const MarketRateCard = ({ marketRates }) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const scrollContainerRef = useRef(null);

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const scrollLeft = container.scrollLeft;
      const newIndex = Math.round(scrollLeft / 140);
      setActiveIndex(newIndex);
    };

    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="market-section">
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '12px',
        }}
      >
        <h2 style={{ fontSize: '16px', fontWeight: '700', color: '#1A2E1A' }}>
          Live Market Rates
        </h2>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            background: 'rgba(34, 197, 94, 0.1)',
            padding: '4px 10px',
            borderRadius: '12px',
            fontSize: '12px',
            fontWeight: '700',
            color: '#22C55E',
          }}
        >
          <div className="live-dot"></div>
          Live
        </div>
      </div>

      <div ref={scrollContainerRef} className="rates-scroll">
        {marketRates.map((rate, idx) => (
          <div
            key={idx}
            className={`rate-card ${idx === activeIndex ? 'active' : ''}`}
            style={{ animationDelay: `${idx * 0.08}s` }}
          >
            <p style={{ fontSize: '11px', color: 'rgba(255, 255, 255, 0.6)', marginBottom: '8px', fontWeight: '600' }}>
              {rate.location}
            </p>
            <p style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.5)', marginBottom: '2px' }}>
              Top Rate
            </p>
            <p className="rate-top-value">₹{rate.topRate}</p>
            <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid rgba(255, 255, 255, 0.1)' }}>
              <p style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.5)', marginBottom: '2px' }}>
                Avg Rate
              </p>
              <p style={{ fontSize: '14px', fontWeight: '700', color: 'rgba(255, 255, 255, 0.8)' }}>
                ₹{rate.avgRate}
              </p>
            </div>
            <p style={{ fontSize: '10px', color: 'rgba(255, 255, 255, 0.4)', marginTop: '10px' }}>
              {new Date(rate.date).toLocaleDateString('en-IN')}
            </p>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: '6px', marginTop: '12px', justifyContent: 'center' }}>
        {marketRates.map((_, idx) => (
          <div
            key={idx}
            className={`scroll-dot ${idx === activeIndex ? 'active' : ''}`}
          ></div>
        ))}
      </div>

      <p
        style={{
          fontSize: '11px',
          color: 'rgba(27, 107, 58, 0.6)',
          textAlign: 'center',
          marginTop: '8px',
        }}
      >
        ← Swipe to see all locations →
      </p>
    </div>
  );
};

export default MarketRateCard;
