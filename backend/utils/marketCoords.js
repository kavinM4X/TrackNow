/** Approximate hub coords per booking market (Tamil Nadu region) — seed map until device GPS arrives */
const HUB = {
  Coimbatore: { lat: 11.0168, lng: 76.9558 },
  Mamballi: { lat: 11.3654, lng: 77.8178 },
  Ramnagar: { lat: 12.9588, lng: 78.2967 },
  Dharmapuri: { lat: 12.1211, lng: 78.1573 }
};

function hubForLocation(location) {
  return HUB[location] || HUB.Coimbatore;
}

module.exports = { hubForLocation, HUB };
