/**
 * Manual backup: node scripts/run-backup.js
 * Requires MONGODB_URI in backend/.env
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const mongoose = require('mongoose');
const { runMonthlyBackup, listBackups } = require('../utils/monthlyBackup');

async function main() {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/tracknow';
  await mongoose.connect(uri);
  console.log('Connected to MongoDB');

  const result = await runMonthlyBackup({ reason: 'manual' });
  console.log(JSON.stringify(result, null, 2));

  console.log('\nAvailable monthly backups:');
  console.log(JSON.stringify(listBackups(), null, 2));

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
