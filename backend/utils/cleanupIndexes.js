/** Remove legacy indexes left from an older schema (batchNumber, etc.). */
async function dropLegacyIndexes(collection, legacyNames, label) {
  const indexes = await collection.indexes();
  for (const name of legacyNames) {
    if (indexes.some((idx) => idx.name === name)) {
      await collection.dropIndex(name);
      console.log(`Dropped legacy index ${label}.${name}`);
    }
  }
}

async function cleanupLegacyIndexes(mongooseInstance) {
  const db = mongooseInstance.connection;
  if (!db?.db) return;

  const legacyBookingIndexes = ['batchNumber_1', 'user_1', 'bookingType_1'];
  const legacyBatchIndexes = ['batchNumber_1'];
  const legacyTrackerIndexes = ['deviceId_1', 'vehicleNumber_1'];

  try {
    await dropLegacyIndexes(db.collection('bookings'), legacyBookingIndexes, 'bookings');
  } catch (err) {
    if (err.code !== 27 && err.codeName !== 'IndexNotFound') {
      console.warn('Bookings index cleanup:', err.message);
    }
  }

  try {
    await dropLegacyIndexes(db.collection('batches'), legacyBatchIndexes, 'batches');
  } catch (err) {
    if (err.code !== 27 && err.codeName !== 'IndexNotFound') {
      console.warn('Batches index cleanup:', err.message);
    }
  }

  try {
    await dropLegacyIndexes(
      db.collection('trackerconfigs'),
      legacyTrackerIndexes,
      'trackerconfigs'
    );
  } catch (err) {
    if (err.code !== 27 && err.codeName !== 'IndexNotFound') {
      console.warn('TrackerConfigs index cleanup:', err.message);
    }
  }
}

async function runCleanup(mongooseInstance) {
  await cleanupLegacyIndexes(mongooseInstance);
}

module.exports = { runCleanup };
