import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator
} from 'react-native';
import api from '../api/client';
import { displayTotalKg, formatDateDayMonth, formatINR } from '../utils/format';
import { colors, radius, spacing, shadows } from '../styles/theme';

function displayRatePerKg(rate) {
  if (rate == null || rate === '' || Number.isNaN(Number(rate))) return '—';
  return `${formatINR(Number(rate))}/kg`;
}

function WeightRow({ label, kg, total, dotColor, barFillColor, kgColor }) {
  const pct = total > 0 ? Math.round((kg / total) * 100) : 0;
  return (
    <View style={styles.breakdownRow}>
      <View style={styles.rowLabel}>
        <View style={[styles.dot, { backgroundColor: dotColor }]} />
        <Text style={styles.labelText}>{label}</Text>
      </View>
      <View style={styles.barTrack}>
        <View
          style={[
            styles.barFill,
            { backgroundColor: barFillColor, width: `${Math.min(100, pct)}%` }
          ]}
        />
      </View>
      <View style={styles.kgValueContainer}>
        <Text style={[styles.kgValueText, { color: kgColor }]}>
          {kg} kg <Text style={styles.pctBadge}>{pct}%</Text>
        </Text>
      </View>
    </View>
  );
}

function LineCost({ label, kg, rate, amount }) {
  const rateNum = rate == null || rate === '' ? null : Number(rate);
  const amtNum = amount == null || amount === '' ? null : Number(amount);
  return (
    <View style={styles.valueRow}>
      <Text style={styles.valueRowLabel}>
        {label} ({kg} kg × {displayRatePerKg(rateNum)})
      </Text>
      <Text style={styles.itemAmt}>
        {amtNum != null && !Number.isNaN(amtNum) ? formatINR(amtNum) : '—'}
      </Text>
    </View>
  );
}

export default function BatchDetailScreen({ batchId, onBack }) {
  const [batch, setBatch] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!batchId) return;

    if (typeof batchId === 'object' && batchId !== null) {
      const data = batchId.batch || batchId;
      setBatch(data);
      setLoading(false);
      return;
    }

    setLoading(true);
    api
      .get(`/batches/${batchId}`)
      .then((res) => {
        const item = res.data?.batch || res.data;
        setBatch(item);
      })
      .catch((err) => {
        setError(err.response?.data?.error || 'Could not load batch details');
      })
      .finally(() => setLoading(false));
  }, [batchId]);

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator color={colors.primary} size="large" />
        <Text style={styles.loadingText}>Loading batch breakdown…</Text>
      </View>
    );
  }

  if (error || !batch) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorIcon}>⚠</Text>
        <Text style={styles.errorTitle}>Batch Details Not Found</Text>
        <Text style={styles.errorSub}>{error || 'The requested batch details could not be retrieved.'}</Text>
        <TouchableOpacity style={styles.backBtn} onPress={onBack}>
          <Text style={styles.backBtnText}>← Back to History</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const total = displayTotalKg(batch);
  const good = Number(batch.goodSilkKg ?? batch.quantityKg ?? 0);
  const waste = Number(batch.wasteKg || 0);
  const doubles = Number(batch.doubles || 0);

  const goodRate = batch.goodSilkRatePerKg ?? batch.ratePerKg;
  const wasteRate = batch.wasteRatePerKg ?? 0;
  const doublesRate = batch.doublesRatePerKg ?? 0;

  const goodAmt = batch.goodSilkAmount != null ? Number(batch.goodSilkAmount) : (goodRate != null ? Math.round(good * Number(goodRate)) : null);
  const wasteAmt = batch.wasteAmount != null ? Number(batch.wasteAmount) : (wasteRate != null ? Math.round(waste * Number(wasteRate)) : null);
  const doublesAmt = batch.doublesAmount != null ? Number(batch.doublesAmount) : (doublesRate != null ? Math.round(doubles * Number(doublesRate)) : null);

  const value = batch.estimatedValue;
  const vr = batch.vehicleRental;

  const netSilk =
    vr?.netSilkValue ??
    (goodAmt != null
      ? Number(goodAmt) - Number(wasteAmt || 0) - Number(doublesAmt || 0)
      : value);

  const lotQty = Number(batch.lotQty) || 0;
  const lotPrice = Number(batch.lotPrice) || 0;
  const lotAmt = Number(batch.lotAmount) || (lotQty * lotPrice);

  const rawRentalDeduction = vr?.rentalDeduction ?? vr?.rentalTotal ?? (netSilk != null && batch.displayFinalAmount != null ? Math.max(0, netSilk - Number(batch.displayFinalAmount)) : 0);
  const rentalTotal = Number(rawRentalDeduction) || (vr?.rentalDeduction ?? 0);
  const rentalOnly = Math.max(0, rentalTotal - lotAmt);

  const finalAmount = vr?.finalAmount != null ? Number(vr.finalAmount) : Number(batch.displayFinalAmount ?? (netSilk != null ? netSilk - rentalTotal : value));

  const driverName = vr?.ownerName || (batch.adminNote?.includes('Driver entry:') ? batch.adminNote.replace('Driver entry:', '').trim() : null);

  const hasDriverOrRental = Boolean(vr || driverName || rentalTotal > 0);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Top Nav Bar */}
      <TouchableOpacity style={styles.navBack} onPress={onBack} activeOpacity={0.7}>
        <Text style={styles.navBackText}>← Back to Batch History</Text>
      </TouchableOpacity>

      {/* 1. Header Summary Card */}
      <View style={styles.headerCard}>
        <View style={styles.topPillRow}>
          <Text style={styles.headerDate}>🗓️ Delivery Date: {formatDateDayMonth(batch.date)}</Text>
          <Text style={styles.headerLoc}>📍 {batch.location || 'Market'} Center</Text>
        </View>

        <Text style={styles.headerTotal}>
          {total} <Text style={styles.headerTotalUnit}>kg</Text>
        </Text>
        <Text style={styles.headerSub}>
          Verified Cocoon Weight {driverName ? `· Driver: ${driverName}` : ''}
        </Text>
      </View>

      {/* 2. Weight Classification Breakdown */}
      <View style={styles.cardBlock}>
        <Text style={styles.breakdownTitle}>⚖️ Weight Classification</Text>
        <WeightRow
          label="Good Silk"
          kg={good}
          total={total}
          dotColor="#2e7d52"
          barFillColor="#2e7d52"
          kgColor="#2e7d52"
        />
        <WeightRow
          label="Waste Silk"
          kg={waste}
          total={total}
          dotColor="#f5a623"
          barFillColor="#f5a623"
          kgColor="#d97706"
        />
        <WeightRow
          label="Doubles"
          kg={doubles}
          total={total}
          dotColor="#a0522d"
          barFillColor="#a0522d"
          kgColor="#a0522d"
        />
      </View>

      {/* 3. Market Rates & Net Value */}
      <View style={styles.cardBlock}>
        <Text style={styles.breakdownTitle}>💰 Market Rates & Net Value</Text>

        <View style={styles.financialList}>
          <LineCost label="Good Silk" kg={good} rate={goodRate} amount={goodAmt} />
          <LineCost label="Waste Silk" kg={waste} rate={wasteRate} amount={wasteAmt} />
          <LineCost label="Doubles" kg={doubles} rate={doublesRate} amount={doublesAmt} />

          {netSilk != null && (
            <View style={styles.netSilkRow}>
              <Text style={styles.netSilkLbl}>Net Silk Payout</Text>
              <Text style={styles.netSilkVal}>{formatINR(netSilk)}</Text>
            </View>
          )}

          {!hasDriverOrRental && (
            <View style={styles.estimated}>
              <Text style={styles.estimatedLabel}>Total Amount</Text>
              <Text style={styles.estimatedVal}>{value != null ? formatINR(value) : '—'}</Text>
            </View>
          )}
        </View>
      </View>

      {/* 4. Driver Logistics & Rental Deductions */}
      {hasDriverOrRental && (
        <View style={styles.rentalCard}>
          <Text style={styles.rentalTitle}>🚛 Driver Logistics & Deductions</Text>

          <View style={styles.valueRow}>
            <Text style={styles.valueRowLabel}>Assigned Freight Driver</Text>
            <Text style={styles.driverHighlight}>{driverName || 'kavin-driver'}</Text>
          </View>

          {rentalOnly > 0 ? (
            <View style={styles.valueRow}>
              <Text style={styles.valueRowLabel}>
                Freight Rental ({good} kg {vr?.ratePerKg != null ? `× ${formatINR(vr.ratePerKg)}` : ''})
              </Text>
              <Text style={styles.deductionNegText}>−{formatINR(rentalOnly)}</Text>
            </View>
          ) : null}

          {lotAmt > 0 ? (
            <View style={styles.valueRow}>
              <Text style={styles.valueRowLabel}>
                Lot Charge ({lotQty || batch.lotQty || 0} × {formatINR(lotPrice || batch.lotPrice || 0)})
              </Text>
              <Text style={styles.deductionNegText}>−{formatINR(lotAmt)}</Text>
            </View>
          ) : null}

          <View style={styles.rentalFinalRow}>
            <Text style={styles.rentalFinalLabel}>Total Logistics Deduction</Text>
            <Text style={styles.deductionTotalText}>−{formatINR(rentalTotal)}</Text>
          </View>

          <View style={[styles.rentalFinalRow, styles.payoutHighlightRow]}>
            <Text style={styles.finalPayoutLabel}>Final Farmer Payout</Text>
            <Text style={styles.finalPayoutNumber}>{formatINR(finalAmount)}</Text>
          </View>
        </View>
      )}

      {/* 5. Remarks & Notes */}
      {batch.notes || batch.adminNote ? (
        <View style={styles.notesBox}>
          <Text style={styles.notesTitle}>📝 Logistics & Quality Remarks</Text>
          <Text style={styles.notesText}>{batch.adminNote || batch.notes}</Text>
        </View>
      ) : null}

      {/* 6. Read-Only Note */}
      <View style={styles.readOnlyNote}>
        <Text style={styles.readOnlyText}>
          🔒 {hasDriverOrRental ? 'Verified & entered by driver · Read-only audit record' : 'Verified & entered by admin · Read-only audit record'}
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5'
  },
  content: {
    padding: spacing.md,
    paddingBottom: 90
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
    backgroundColor: '#f5f5f5'
  },
  loadingText: {
    marginTop: 10,
    fontSize: 13,
    color: colors.textSecondary
  },
  errorIcon: {
    fontSize: 36,
    marginBottom: 8
  },
  errorTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.textMain
  },
  errorSub: {
    fontSize: 12,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 16
  },
  backBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: radius.md
  },
  backBtnText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 13
  },
  navBack: {
    marginBottom: spacing.sm,
    paddingVertical: 4
  },
  navBackText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#2e7d52'
  },

  /* Header Summary Card */
  headerCard: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#bde0cc',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    marginBottom: 16,
    ...shadows.card
  },
  topPillRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 12
  },
  headerDate: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#1e293b',
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20
  },
  headerLoc: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#2e7d52',
    backgroundColor: '#e8f4ed',
    borderWidth: 1,
    borderColor: '#bde0cc',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20
  },
  headerTotal: {
    fontSize: 42,
    fontWeight: '800',
    color: '#2e7d52',
    marginVertical: 4,
    lineHeight: 46
  },
  headerTotalUnit: {
    fontSize: 18,
    fontWeight: '600',
    color: '#64748b'
  },
  headerSub: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 4
  },

  /* Section Card Blocks */
  cardBlock: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e0e0dc',
    borderRadius: 16,
    padding: 18,
    marginBottom: 16,
    ...shadows.card
  },
  breakdownTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 14
  },

  /* Weight Breakdown Row */
  breakdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 4
  },
  rowLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    width: 95
  },
  dot: {
    width: 9,
    height: 9,
    borderRadius: 4.5
  },
  labelText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155'
  },
  barTrack: {
    flex: 1,
    height: 9,
    backgroundColor: '#f1f5f9',
    borderRadius: 6,
    overflow: 'hidden'
  },
  barFill: {
    height: '100%',
    borderRadius: 6
  },
  kgValueContainer: {
    width: 80,
    alignItems: 'flex-end'
  },
  kgValueText: {
    fontSize: 13,
    fontWeight: '700'
  },
  pctBadge: {
    fontSize: 10,
    fontWeight: '600',
    color: '#64748b'
  },

  /* Financial Breakdown */
  financialList: {
    gap: 10
  },
  valueRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 2
  },
  valueRowLabel: {
    fontSize: 12.5,
    color: '#64748b',
    flex: 1
  },
  itemAmt: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1e293b'
  },
  netSilkRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#e8f4ed',
    borderWidth: 1,
    borderColor: '#bde0cc',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginTop: 6
  },
  netSilkLbl: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#2e7d52'
  },
  netSilkVal: {
    fontSize: 18,
    fontWeight: '800',
    color: '#2e7d52'
  },
  estimated: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    marginTop: 4
  },
  estimatedLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1e293b'
  },
  estimatedVal: {
    fontSize: 18,
    fontWeight: '800',
    color: '#2e7d52'
  },

  /* Driver / Logistics Card */
  rentalCard: {
    backgroundColor: '#fffbeb',
    borderWidth: 1.5,
    borderColor: '#fde68a',
    borderRadius: 16,
    padding: 18,
    marginBottom: 16,
    gap: 8,
    ...shadows.card
  },
  rentalTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#92400e',
    marginBottom: 4
  },
  driverHighlight: {
    fontSize: 13,
    fontWeight: '800',
    color: '#78350f'
  },
  deductionNegText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#92400e'
  },
  rentalFinalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#fef3c7'
  },
  rentalFinalLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#78350f'
  },
  deductionTotalText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#92400e'
  },
  payoutHighlightRow: {
    borderTopWidth: 1.5,
    borderTopColor: '#d97706',
    backgroundColor: '#fef3c7',
    padding: 10,
    borderRadius: 8,
    marginTop: 8
  },
  finalPayoutLabel: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#78350f'
  },
  finalPayoutNumber: {
    fontSize: 20,
    fontWeight: '900',
    color: '#92400e'
  },

  /* Notes */
  notesBox: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16
  },
  notesTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textMain,
    marginBottom: 4
  },
  notesText: {
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 16
  },

  /* Read Only Note */
  readOnlyNote: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e0e0dc',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10
  },
  readOnlyText: {
    fontSize: 11.5,
    color: '#64748b',
    textAlign: 'center'
  }
});
