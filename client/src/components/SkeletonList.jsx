import './SkeletonCard.css';

const SkeletonList = ({ count = 5 }) => {
  return (
    <div>
      {Array.from({ length: count }).map((_, idx) => (
        <div key={idx} style={{ background: 'white', borderRadius: '12px', padding: '16px', marginBottom: '10px', height: '60px', animation: 'skeletonPulse 1.5s ease-in-out infinite' }}></div>
      ))}
    </div>
  );
};

export default SkeletonList;
