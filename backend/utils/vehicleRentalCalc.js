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
  let good = Number(entry.goodSilkKg) || 0;
  let waste = Number(entry.wasteKg) || 0;
  let doubles = Number(entry.doublesKg) || 0;
  let gr = Number(entry.goodSilkRatePerKg) || 0;
  let wr = Number(entry.wasteRatePerKg) || 0;
  let dr = Number(entry.doublesRatePerKg) || 0;

  let goodSilkAmount = 0;
  if (Array.isArray(entry.goodSilkRows) && entry.goodSilkRows.length > 0) {
    goodSilkAmount = roundMoney(
      entry.goodSilkRows.reduce((s, r) => s + (Number(r.kg) || 0) * (Number(r.rate) || 0), 0)
    );
    const sumKg = entry.goodSilkRows.reduce((s, r) => s + (Number(r.kg) || 0), 0);
    if (sumKg > 0) good = sumKg;
  } else {
    goodSilkAmount = roundMoney(good * gr);
  }

  let wasteAmount = 0;
  if (Array.isArray(entry.wasteRows) && entry.wasteRows.length > 0) {
    wasteAmount = roundMoney(
      entry.wasteRows.reduce((s, r) => s + (Number(r.kg) || 0) * (Number(r.rate) || 0), 0)
    );
    const sumKg = entry.wasteRows.reduce((s, r) => s + (Number(r.kg) || 0), 0);
    if (sumKg > 0) waste = sumKg;
  } else {
    wasteAmount = roundMoney(waste * wr);
  }

  let doublesAmount = 0;
  if (Array.isArray(entry.doublesRows) && entry.doublesRows.length > 0) {
    doublesAmount = roundMoney(
      entry.doublesRows.reduce((s, r) => s + (Number(r.kg) || 0) * (Number(r.rate) || 0), 0)
    );
    const sumKg = entry.doublesRows.reduce((s, r) => s + (Number(r.kg) || 0), 0);
    if (sumKg > 0) doubles = sumKg;
  } else {
    doublesAmount = roundMoney(doubles * dr);
  }

  const lotQty = Number(entry.lotQty) || 0;
  const lotPrice = Number(entry.lotPrice) || 0;
  const lotAmount = roundMoney(lotQty * lotPrice);
  const netSilkValue = goodSilkAmount - wasteAmount - doublesAmount;
  const rentalAmount = roundMoney(good * effectiveRatePerKg);
  const rentalTotalAmount = rentalAmount + lotAmount;
  const finalAmount = netSilkValue - rentalTotalAmount;

  return {
    goodSilkAmount,
    wasteAmount,
    doublesAmount,
    lotQty,
    lotPrice,
    lotAmount,
    netSilkValue,
    rentalAmount,
    rentalTotalAmount,
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
