import iconUrl from '../../assets/app-icon.svg';
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
