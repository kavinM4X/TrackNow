const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');

const DEFAULT_DIR = path.join(__dirname, '..', 'backups');
const DEFAULT_RETENTION = 12;

function monthKey(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

function backupRoot() {
  return process.env.BACKUP_DIR || DEFAULT_DIR;
}

function retentionMonths() {
  const n = Number(process.env.BACKUP_RETENTION_MONTHS);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : DEFAULT_RETENTION;
}

function isEnabled() {
  if (process.env.BACKUP_ENABLED === 'false') return false;
  return true;
}

async function exportDatabase() {
  if (!mongoose.connection?.db) {
    throw new Error('MongoDB is not connected');
  }

  const db = mongoose.connection.db;
  const collections = await db.listCollections().toArray();
  const payload = {
    database: db.databaseName,
    month: monthKey(),
    createdAt: new Date().toISOString(),
    collections: {}
  };

  for (const { name } of collections) {
    if (name.startsWith('system.')) continue;
    const docs = await db.collection(name).find({}).toArray();
    payload.collections[name] = docs;
  }

  return payload;
}

function writeMonthlyBackup(payload) {
  const month = payload.month || monthKey();
  const dir = path.join(backupRoot(), month);
  fs.mkdirSync(dir, { recursive: true });

  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filePath = path.join(dir, `tracknow-backup-${stamp}.json`);
  fs.writeFileSync(filePath, JSON.stringify(payload, null, 2), 'utf8');

  const latestPath = path.join(dir, 'tracknow-backup-latest.json');
  fs.writeFileSync(latestPath, JSON.stringify(payload, null, 2), 'utf8');

  return { month, dir, filePath, latestPath };
}

function pruneOldBackups() {
  const root = backupRoot();
  if (!fs.existsSync(root)) return { removed: [] };

  const keep = retentionMonths();
  const entries = fs
    .readdirSync(root, { withFileTypes: true })
    .filter((e) => e.isDirectory() && /^\d{4}-\d{2}$/.test(e.name))
    .map((e) => e.name)
    .sort();

  const toRemove = entries.length > keep ? entries.slice(0, entries.length - keep) : [];
  const removed = [];

  for (const folder of toRemove) {
    const full = path.join(root, folder);
    fs.rmSync(full, { recursive: true, force: true });
    removed.push(folder);
  }

  return { removed };
}

function hasBackupForMonth(month = monthKey()) {
  const latest = path.join(backupRoot(), month, 'tracknow-backup-latest.json');
  return fs.existsSync(latest);
}

async function runMonthlyBackup({ reason = 'scheduled' } = {}) {
  if (!isEnabled()) {
    return { skipped: true, reason: 'disabled' };
  }

  const month = monthKey();
  const payload = await exportDatabase();
  payload.reason = reason;

  const written = writeMonthlyBackup(payload);
  const pruned = pruneOldBackups();

  return {
    ok: true,
    month,
    reason,
    ...written,
    pruned: pruned.removed,
    collectionCount: Object.keys(payload.collections).length,
    documentCount: Object.values(payload.collections).reduce((n, arr) => n + arr.length, 0)
  };
}

function listBackups() {
  const root = backupRoot();
  if (!fs.existsSync(root)) return [];

  return fs
    .readdirSync(root, { withFileTypes: true })
    .filter((e) => e.isDirectory() && /^\d{4}-\d{2}$/.test(e.name))
    .map((e) => e.name)
    .sort()
    .reverse()
    .map((month) => {
      const latest = path.join(root, month, 'tracknow-backup-latest.json');
      let meta = { month, exists: false };
      if (fs.existsSync(latest)) {
        const stat = fs.statSync(latest);
        try {
          const data = JSON.parse(fs.readFileSync(latest, 'utf8'));
          meta = {
            month,
            exists: true,
            createdAt: data.createdAt,
            database: data.database,
            collectionCount: Object.keys(data.collections || {}).length,
            documentCount: Object.values(data.collections || {}).reduce(
              (n, arr) => n + arr.length,
              0
            ),
            sizeBytes: stat.size
          };
        } catch {
          meta.exists = true;
          meta.sizeBytes = stat.size;
        }
      }
      return meta;
    });
}

module.exports = {
  monthKey,
  backupRoot,
  hasBackupForMonth,
  runMonthlyBackup,
  listBackups,
  isEnabled
};
