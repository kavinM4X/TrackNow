import styles from './Badge.module.css';

const MAP = {
  pending: styles.amber,
  confirmed: styles.blue,
  completed: styles.green,
  done: styles.green,
  cancelled: styles.gray,
  active: styles.green,
  disabled: styles.gray,
  moving: styles.green,
  idle: styles.amber,
  live: styles.green
};

export default function Badge({ status, label }) {
  const key = (status || '').toLowerCase();
  const text =
    label ||
    (status === 'completed' ? 'Done' : status ? status.charAt(0).toUpperCase() + status.slice(1) : '');
  return <span className={`${styles.badge} ${MAP[key] || styles.gray}`}>{text}</span>;
}
