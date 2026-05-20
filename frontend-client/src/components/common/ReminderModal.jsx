import { useEffect, useState } from 'react';
import { formatDateShort } from '../../utils/format';
import styles from './ReminderModal.module.css';

export default function ReminderModal({ booking, onAcknowledge }) {
  const [countdown, setCountdown] = useState('');

  useEffect(() => {
    if (!booking?.date) return undefined;

    const tick = () => {
      const diff = new Date(`${booking.date}T00:00:00`) - new Date();
      if (diff <= 0) {
        setCountdown('Due now!');
        return false;
      }
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setCountdown(
        `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
      );
      return true;
    };

    if (!tick()) return undefined;
    const timer = setInterval(() => {
      if (!tick()) clearInterval(timer);
    }, 1000);
    return () => clearInterval(timer);
  }, [booking]);

  const handleAck = () => {
    localStorage.setItem(`reminder_ack_${booking.date}`, 'true');
    onAcknowledge();
  };

  const dueNow = countdown === 'Due now!';

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <div className={styles.iconWrap}>
          <span className={styles.warnIcon}>!</span>
        </div>
        <h2 className={styles.title}>Batch Reminder</h2>
        <p className={styles.sub}>
          Your upcoming batch is due. Please acknowledge to dismiss.
        </p>
        <div className={`${styles.countdown} ${dueNow ? styles.dueNow : ''}`}>
          {countdown || '--:--:--'}
        </div>
        <p className={styles.countLabel}>Countdown to next batch</p>
        <div className={styles.details}>
          {formatDateShort(booking.date)} · {booking.location} · {booking.quantityKg} kg
        </div>
        <button type="button" className="btn-primary" onClick={handleAck}>
          ✓ OK, I Acknowledge
        </button>
        <p className={styles.hint}>Repeats until batch completed</p>
      </div>
    </div>
  );
}

