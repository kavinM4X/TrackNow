const MARKET_KEYS = {
  Coimbatore: 'coimbatore',
  Mamballi: 'mamballi',
  Ramnagar: 'ramnagar',
  Dharmapuri: 'dharmapuri'
};

function marketRateForLocation(rateDoc, location) {
  if (!rateDoc || !location) return null;
  const key = MARKET_KEYS[location];
  return key ? rateDoc[key] : null;
}

/** @deprecated legacy: total − waste − doubles */
function computeGoodSilk(totalWeightKg, wasteKg, doublesKg) {
  const total = Number(totalWeightKg) || 0;
  const waste = Number(wasteKg) || 0;
  const doubles = Number(doublesKg) || 0;
  return Math.round((total - waste - doubles) * 10) / 10;
}

function roundMoney(n) {
  return Math.round(Number(n) || 0);
}

function enrichBatch(batch, rateDoc) {
  const doc = batch.toObject ? batch.toObject() : { ...batch };

  const good = Number(doc.goodSilkKg ?? doc.quantityKg ?? 0);
  const waste = Number(doc.wasteKg ?? 0);
  const doubles = Number(doc.doubles ?? 0);

  const totalKg =
    doc.totalWeightKg != null
      ? Number(doc.totalWeightKg)
      : good + waste + doubles;

  const gRate = doc.goodSilkRatePerKg ?? doc.ratePerKg;
  const wRate = doc.wasteRatePerKg;
  const dRate = doc.doublesRatePerKg;

  const hasLineRates =
    gRate != null || wRate != null || dRate != null || doc.goodSilkAmount != null;

  let goodSilkAmount = doc.goodSilkAmount;
  let wasteAmount = doc.wasteAmount;
  let doublesAmount = doc.doublesAmount;
  let estimatedValue = doc.estimatedValue;

  if (hasLineRates) {
    const gr = Number(gRate) || 0;
    const wr = Number(wRate) || 0;
    const dr = Number(dRate) || 0;
    if (goodSilkAmount == null) goodSilkAmount = roundMoney(good * gr);
    if (wasteAmount == null) wasteAmount = roundMoney(waste * wr);
    if (doublesAmount == null) doublesAmount = roundMoney(doubles * dr);
    if (estimatedValue == null) {
      estimatedValue = goodSilkAmount + wasteAmount + doublesAmount;
    }
  } else {
    const rate = doc.ratePerKg ?? marketRateForLocation(rateDoc, doc.location);
    if (estimatedValue == null && rate != null && good) {
      estimatedValue = roundMoney(good * rate);
    }
  }

  const legacyRate = doc.ratePerKg ?? marketRateForLocation(rateDoc, doc.location);

  return {
    ...doc,
    totalWeightKg: totalKg,
    goodSilkKg: good,
    quantityKg: good,
    goodSilkAmount,
    wasteAmount,
    doublesAmount,
    estimatedValue,
    ratePerKg: gRate ?? legacyRate
  };
}

module.exports = {
  MARKET_KEYS,
  marketRateForLocation,
  computeGoodSilk,
  enrichBatch,
  roundMoney
};
