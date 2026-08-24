const mongoose = require('mongoose');
const DriverAdvance = require('../models/DriverAdvance');
const DriverExpense = require('../models/DriverExpense');

function toObjectId(id) {
  if (!id) return id;
  return mongoose.Types.ObjectId.isValid(id) ? new mongoose.Types.ObjectId(id) : id;
}

async function getVehicleTotals(vehicleId) {
  const vid = toObjectId(vehicleId);
  const [advAgg, expAgg] = await Promise.all([
    DriverAdvance.aggregate([
      { $match: { vehicleId: vid } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]),
    DriverExpense.aggregate([
      { $match: { vehicleId: vid } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ])
  ]);
  const advanceTotal = advAgg[0]?.total || 0;
  const expenseTotal = expAgg[0]?.total || 0;
  return {
    advanceTotal,
    expenseTotal,
    balance: advanceTotal - expenseTotal
  };
}

async function enrichVehicle(doc) {
  const v = doc.toObject ? doc.toObject() : doc;
  const totals = await getVehicleTotals(v._id);
  return { ...v, ...totals };
}

module.exports = { getVehicleTotals, enrichVehicle };
