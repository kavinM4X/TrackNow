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

async function getBatchVehicleTotals(vehicleIds) {
  if (!vehicleIds || !vehicleIds.length) return new Map();

  const oids = vehicleIds.map(toObjectId).filter(Boolean);

  const [advTotals, expTotals] = await Promise.all([
    DriverAdvance.aggregate([
      { $match: { vehicleId: { $in: oids } } },
      { $group: { _id: '$vehicleId', total: { $sum: '$amount' } } }
    ]),
    DriverExpense.aggregate([
      { $match: { vehicleId: { $in: oids } } },
      { $group: { _id: '$vehicleId', total: { $sum: '$amount' } } }
    ])
  ]);

  const advMap = new Map(advTotals.map((item) => [String(item._id), item.total || 0]));
  const expMap = new Map(expTotals.map((item) => [String(item._id), item.total || 0]));

  const resultMap = new Map();
  for (const id of vehicleIds) {
    const sId = String(id);
    const advanceTotal = advMap.get(sId) || 0;
    const expenseTotal = expMap.get(sId) || 0;
    resultMap.set(sId, {
      advanceTotal,
      expenseTotal,
      balance: advanceTotal - expenseTotal
    });
  }

  return resultMap;
}

async function enrichVehicle(doc) {
  if (!doc) return null;
  const v = doc.toObject ? doc.toObject() : doc;
  const totals = await getVehicleTotals(v._id);
  return { ...v, ...totals };
}

async function enrichVehiclesBatch(docs) {
  if (!docs || !docs.length) return [];
  const plainDocs = docs.map((d) => (d.toObject ? d.toObject() : d));
  const ids = plainDocs.map((d) => d._id);
  const totalsMap = await getBatchVehicleTotals(ids);

  return plainDocs.map((v) => {
    const totals = totalsMap.get(String(v._id)) || { advanceTotal: 0, expenseTotal: 0, balance: 0 };
    return { ...v, ...totals };
  });
}

module.exports = { getVehicleTotals, getBatchVehicleTotals, enrichVehicle, enrichVehiclesBatch };
