import iconUrl from '../../assets/tracknow-icon.png';
import styles from './BrandLogo.module.css';

export default function BrandLogo({ className = '' }) {
  return (
    <img
      src={iconUrl}
      alt="TrackNow"
      className={`${styles.logo} ${className}`.trim()}
    />
  );
}
