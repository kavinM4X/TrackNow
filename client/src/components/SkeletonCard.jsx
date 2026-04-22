import './SkeletonCard.css';

const SkeletonCard = () => {
  return (
    <div className="skeleton-card">
      <div className="skeleton-line skeleton-line-short"></div>
      <div className="skeleton-line skeleton-line-tall"></div>
    </div>
  );
};

export default SkeletonCard;
