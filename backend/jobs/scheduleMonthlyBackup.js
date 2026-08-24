const cron = require('node-cron');
const { hasBackupForMonth, runMonthlyBackup, isEnabled } = require('../utils/monthlyBackup');

let running = false;

async function safeRun(opts) {
  if (running) return;
  running = true;
  try {
    const result = await runMonthlyBackup(opts);
    if (result.ok) {
      console.log(
        `[Backup] ${result.month} saved (${result.documentCount} docs, ${result.collectionCount} collections)`
      );
      if (result.pruned?.length) {
        console.log(`[Backup] Removed old folders: ${result.pruned.join(', ')}`);
      }
    } else if (result.skipped) {
      console.log('[Backup] Skipped (BACKUP_ENABLED=false)');
    }
  } catch (err) {
    console.error('[Backup] Failed:', err.message);
  } finally {
    running = false;
  }
}

function startMonthlyBackupScheduler() {
  if (!isEnabled()) {
    console.log('[Backup] Monthly auto-backup is disabled');
    return;
  }

  // 2:00 AM on the 1st day of every month
  cron.schedule('0 2 1 * *', () => {
    safeRun({ reason: 'cron-1st-of-month' });
  });

  // If server restarts mid-month and no backup exists yet, create one
  if (!hasBackupForMonth()) {
    safeRun({ reason: 'startup-missing-current-month' });
  }

  console.log('[Backup] Monthly scheduler active (1st of month, 2:00 AM)');
}

module.exports = { startMonthlyBackupScheduler, safeRun };
