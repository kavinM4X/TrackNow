const DriverRateConfig = require('../models/DriverRateConfig');
const DriverParty = require('../models/DriverParty');

async function getGlobalRates() {
  let config = await DriverRateConfig.findOne().sort({ updatedAt: -1 });
  if (!config) {
    config = await DriverRateConfig.create({});
  }
  return config;
}

async function getRatesForParty(partyId) {
  const global = await getGlobalRates();
  const party = partyId ? await DriverParty.findById(partyId) : null;
  return {
    goodRate: party?.goodRateOverride ?? global.goodRate,
    wasteRate: party?.wasteRateOverride ?? global.wasteRate,
    doubleRate: party?.doubleRateOverride ?? global.doubleRate
  };
}

function calcSilkAmounts({ goodKg, wasteKg, doubleKg, goodRate, wasteRate, doubleRate }) {
  const goodAmount = Math.round((Number(goodKg) || 0) * (Number(goodRate) || 0));
  const wasteAmount = Math.round((Number(wasteKg) || 0) * (Number(wasteRate) || 0));
  const doubleAmount = Math.round((Number(doubleKg) || 0) * (Number(doubleRate) || 0));
  return {
    goodAmount,
    wasteAmount,
    doubleAmount,
    totalAmount: goodAmount + wasteAmount + doubleAmount
  };
}

module.exports = { getGlobalRates, getRatesForParty, calcSilkAmounts };
