import { useEffect, useRef } from 'react';

const DashboardCards = ({ totalBatches, totalKg }) => {
  const batchesCardRef = useRef(null);
  const kgCardRef = useRef(null);

  useEffect(() => {
    const observerOptions = {
      threshold: 0.5,
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          observer.unobserve(entry.target);
        }
      });
    }, observerOptions);

    if (batchesCardRef.current) observer.observe(batchesCardRef.current);
    if (kgCardRef.current) observer.observe(kgCardRef.current);

    return () => {
      if (batchesCardRef.current) observer.unobserve(batchesCardRef.current);
      if (kgCardRef.current) observer.unobserve(kgCardRef.current);
    };
  }, []);

  return (
    <div className="stats-grid">
      <div ref={batchesCardRef} className="stat-card">
        <p style={{ fontSize: '13px', color: '#9CA99F', fontWeight: '600', marginBottom: '8px' }}>
          Total Batches
        </p>
        <p className="stat-value">{totalBatches}</p>
      </div>

      <div ref={kgCardRef} className="stat-card">
        <p style={{ fontSize: '13px', color: '#9CA99F', fontWeight: '600', marginBottom: '8px' }}>
          Total Kg
        </p>
        <p className="stat-value">{totalKg.toFixed(1)}</p>
      </div>
    </div>
  );
};

export default DashboardCards;
