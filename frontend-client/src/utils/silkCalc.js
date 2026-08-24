/** Live preview — Lot is part of Rental total value (rental + lot) */
export function calcSilkPreview(fields, rate = 0) {
  const good = Number(fields.goodSilkKg) || 0;
  const waste = Number(fields.wasteKg) || 0;
  const doubles = Number(fields.doublesKg) || 0;
  const gr = Number(fields.goodSilkRatePerKg) || 0;
  const wr = Number(fields.wasteRatePerKg) || 0;
  const dr = Number(fields.doublesRatePerKg) || 0;
  const lotQty = Number(fields.lotQty) || 0;
  const lotPrice = Number(fields.lotPrice) || 0;
  const lotAmt = Math.round(lotQty * lotPrice);
  const goodAmt = Math.round(good * gr);
  const wasteAmt = Math.round(waste * wr);
  const doublesAmt = Math.round(doubles * dr);
  const netSilk = goodAmt - wasteAmt - doublesAmt;
  const rental = Math.round(good * (Number(rate) || 0));
  const rentalTotal = rental + lotAmt;
  const finalAmount = netSilk - rentalTotal;
  return {
    goodAmt,
    wasteAmt,
    doublesAmt,
    lotQty,
    lotPrice,
    lotAmt,
    netSilk,
    rental,
    rentalTotal,
    finalAmount
  };
}

export function lotFieldsFromEntry(e) {
  if (!e) return { lotQty: '', lotPrice: '' };
  const qty = e.lotQty != null && e.lotQty !== '' ? e.lotQty : '';
  const price = e.lotPrice != null && e.lotPrice !== '' ? e.lotPrice : '';
  return { lotQty: qty === '' ? '' : String(qty), lotPrice: price === '' ? '' : String(price) };
}
