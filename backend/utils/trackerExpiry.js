const TrackerDay = require('../models/TrackerDay');
const TrackerConfig = require('../models/TrackerConfig');
const User = require('../models/User');

function todayISO() {
  return new Date().toISOString().split('T')[0];
}

function addDaysISO(dateStr, days) {
  const d = new Date(`${dateStr}T12:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().split('T')[0];
}

/** Last calendar day tracker stays on = booking date + 1. */
function activeUntilForBooking(dateStr) {
  return addDaysISO(dateStr, 1);
}

function normalizeTrackerDay(doc) {
  const row = doc?.toObject ? doc.toObject() : { ...doc };
  if (!row.activeUntil && row.date) {
    row.activeUntil = activeUntilForBooking(row.date);
  }
  return row;
}

function isInActiveWindow(trackerDay, today = todayISO()) {
  const row = normalizeTrackerDay(trackerDay);
  if (!row.isEnabled) return false;
  return today >= row.date && today <= row.activeUntil;
}

function isExpired(trackerDay, today = todayISO()) {
  const row = normalizeTrackerDay(trackerDay);
  if (!row.isEnabled) return true;
  return today > row.activeUntil;
}

async function syncTrackerConfigForToday(userId, userName, isEnabled, vehicleId) {
  if (isEnabled) {
    await TrackerConfig.findOneAndUpdate(
      { userId },
      {
        userName,
        isEnabled: true,
        vehicleId: vehicleId || null,
        lastUpdated: new Date(),
        activatedAt: new Date()
      },
      { upsert: true, new: true }
    );
    await User.findByIdAndUpdate(userId, {
      trackerEnabled: true,
      vehicleId: vehicleId || null
    });
  } else {
    await TrackerConfig.findOneAndUpdate(
      { userId },
      { isEnabled: false, lastUpdated: new Date() }
    );
    await User.findByIdAndUpdate(userId, { trackerEnabled: false });
  }
}

async function userHasLiveTrackerToday(userId, today = todayISO()) {
  const days = await TrackerDay.find({ userId, isEnabled: true });
  return days.some((d) => isInActiveWindow(d, today));
}

async function expireStaleTrackerDays() {
  const today = todayISO();
  const enabled = await TrackerDay.find({ isEnabled: true });
  let count = 0;

  for (const row of enabled) {
    const until = row.activeUntil || activeUntilForBooking(row.date);
    if (!row.activeUntil) {
      row.activeUntil = until;
    }
    if (today <= until) continue;

    row.isEnabled = false;
    row.autoDisabledAt = new Date();
    row.lastUpdated = new Date();
    await row.save();
    count += 1;

    const stillLive = await userHasLiveTrackerToday(row.userId, today);
    if (!stillLive) {
      await syncTrackerConfigForToday(row.userId, row.userName, false, null);
    }
  }

  return count;
}

module.exports = {
  todayISO,
  addDaysISO,
  activeUntilForBooking,
  normalizeTrackerDay,
  isInActiveWindow,
  isExpired,
  expireStaleTrackerDays,
  syncTrackerConfigForToday,
  userHasLiveTrackerToday
};
