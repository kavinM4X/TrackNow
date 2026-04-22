import { useState, useEffect, useCallback } from 'react';
import './ReminderModal.css';

const ReminderModal = ({ nextBatch, onClose }) => {
  const [visible, setVisible] = useState(true);
  const [countdown, setCountdown] = useState({ hours: 0, minutes: 0 });

  const calculateCountdown = useCallback((dateString) => {
    const targetDate = new Date(dateString);
    const now = new Date();
    const difference = targetDate - now;

    if (difference <= 0) {
      return { hours: 0, minutes: 0 };
    }

    const hours = Math.floor(difference / 3600000);
    const minutes = Math.floor((difference % 3600000) / 60000);

    return { hours, minutes };
  }, []);

  useEffect(() => {
    const reminderKey = `reminder_ack_${nextBatch._id}`;
    if (localStorage.getItem(reminderKey)) {
      setVisible(false);
      return;
    }

    setCountdown(calculateCountdown(nextBatch.date));

    const interval = setInterval(() => {
      setCountdown(calculateCountdown(nextBatch.date));
    }, 60000);

    return () => clearInterval(interval);
  }, [nextBatch, calculateCountdown]);

  const handleAcknowledge = () => {
    const reminderKey = `reminder_ack_${nextBatch._id}`;
    localStorage.setItem(reminderKey, 'acknowledged');
    setVisible(false);
    onClose();
  };

  if (!visible) {
    return null;
  }

  return (
    <div className="reminder-overlay">
      <div className="reminder-card">
        <div className="reminder-icon-ring">⏰</div>

        <h2 className="reminder-title">Batch Reminder</h2>
        <p className="reminder-subtitle">
          {nextBatch.location} - Batch #{nextBatch._id?.slice(-4).toUpperCase()}
        </p>

        <p className="reminder-countdown-label">Next batch in</p>
        <div className="reminder-countdown">
          {countdown.hours}h {countdown.minutes}m
        </div>

        <div className="reminder-batch-info">
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ color: '#9CA99F', fontSize: '13px' }}>Date</span>
            <span style={{ color: '#1A2E1A', fontSize: '13px', fontWeight: '700' }}>
              {new Date(nextBatch.date).toLocaleDateString('en-IN')}
            </span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: '#9CA99F', fontSize: '13px' }}>Location</span>
            <span style={{ color: '#1A2E1A', fontSize: '13px', fontWeight: '700' }}>
              {nextBatch.location}
            </span>
          </div>
        </div>

        <button className="reminder-ok-btn" onClick={handleAcknowledge}>
          OK, Got It
        </button>

        <p className="reminder-repeat-note">
          This reminder will repeat until the batch is completed.
        </p>
      </div>
    </div>
  );
};

export default ReminderModal;
