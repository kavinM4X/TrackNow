const { roundMoney } = require('./batchCalc');

function calcEffectiveRatePerKg(rentalAmount, totalSilkKg, manualExtra = 0) {
  const total = Number(totalSilkKg) || 0;
  if (total <= 0) return 0;
  const base = Number(rentalAmount) / total;
  const extra = Number(manualExtra) || 0;
  return Math.round((base + extra) * 100) / 100;
}

/** Per-user silk + rental (matches wireframe) */
function calcUserRentalEntry(entry, effectiveRatePerKg) {
  const good = Number(entry.goodSilkKg) || 0;
  const waste = Number(entry.wasteKg) || 0;
  const doubles = Number(entry.doublesKg) || 0;
  const gr = Number(entry.goodSilkRatePerKg) || 0;
  const wr = Number(entry.wasteRatePerKg) || 0;
  const dr = Number(entry.doublesRatePerKg) || 0;

  const goodSilkAmount = roundMoney(good * gr);
  const wasteAmount = roundMoney(waste * wr);
  const doublesAmount = roundMoney(doubles * dr);
  const netSilkValue = goodSilkAmount - wasteAmount - doublesAmount;
  const rentalAmount = roundMoney(good * effectiveRatePerKg);
  const finalAmount = netSilkValue - rentalAmount;

  return {
    goodSilkAmount,
    wasteAmount,
    doublesAmount,
    netSilkValue,
    rentalAmount,
    finalAmount
  };
}

function summarizeSession(session) {
  const totalGoodKg = (session.entries || []).reduce(
    (s, e) => s + (Number(e.goodSilkKg) || 0),
    0
  );
  const rate =
    session.effectiveRatePerKg ??
    calcEffectiveRatePerKg(session.rentalAmount, session.totalSilkKg, session.manualRateExtra);

  return {
    totalGoodKg,
    effectiveRatePerKg: rate,
    entryCount: session.entries?.length || 0,
    completedCount: (session.entries || []).filter((e) => e.completed).length
  };
}

module.exports = {
  calcEffectiveRatePerKg,
  calcUserRentalEntry,
  summarizeSession
};
