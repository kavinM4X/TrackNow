import styles from './BrandLogo.module.css';

export default function BrandLogo({ className = '', size = 48 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`${styles.logo} ${className}`.trim()}
      aria-label="TrackNow Farmer Logo"
    >
      <defs>
        <linearGradient id="clientGreenGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#2e7d52" />
          <stop offset="100%" stopColor="#1b4d32" />
        </linearGradient>
        <linearGradient id="cocoonGoldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#fbbf24" />
          <stop offset="100%" stopColor="#d97706" />
        </linearGradient>
      </defs>

      {/* Green Rounded Card */}
      <rect width="100" height="100" rx="28" fill="url(#clientGreenGrad)" />

      {/* Wheat / Cocoon Icon */}
      <path
        d="M50 22 C34 38 34 62 50 78 C66 62 66 38 50 22 Z"
        fill="url(#cocoonGoldGrad)"
        stroke="#ffffff"
        strokeWidth="2.5"
      />
      <circle cx="50" cy="50" r="8" fill="#ffffff" opacity="0.9" />

      {/* Base Accent Line */}
      <rect x="25" y="82" width="50" height="4" rx="2" fill="#ffffff" opacity="0.8" />
    </svg>
  );
}
