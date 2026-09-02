import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator
} from 'react-native';
import Badge from '../components/common/Badge';
import api from '../api/client';
import { displayTotalKg, formatDateShort, formatINR } from '../utils/format';
import { colors, radius, spacing, shadows } from '../styles/theme';

export default function BatchDetailScreen({ batchId, onBack }) {
  const [batch, setBatch] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!batchId) return;
    
    // If an object was passed directly
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
        setError(err.response?.data?.error || 'Could not load batch receipt.');
      })
      .finally(() => setLoading(false));
  }, [batchId]);

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator color={colors.primary} size="large" />
        <Text style={styles.loadingText}>Loading harvest receipt…</Text>
      </View>
    );
  }

  if (error || !batch) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorIcon}>⚠</Text>
        <Text style={styles.errorTitle}>Receipt Not Found</Text>
        <Text style={styles.errorSub}>{error || 'The requested batch details could not be retrieved.'}</Text>
        <TouchableOpacity style={styles.backBtn} onPress={onBack}>
          <Text style={styles.backBtnText}>← Back to History</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const finalPayout = batch.displayFinalAmount ?? batch.estimatedValue ?? 0;
  const goodWeight = batch.goodSilkKg ?? batch.quantityKg ?? 0;
  const goodRate = batch.goodSilkRate ?? batch.ratePerKg ?? 0;
  const wasteWeight = batch.wasteKg ?? 0;
  const wasteRate = batch.wasteRate ?? 0;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Top Nav Bar */}
      <TouchableOpacity style={styles.navBack} onPress={onBack} activeOpacity={0.7}>
        <Text style={styles.navBackText}>← Back to Batch History</Text>
      </TouchableOpacity>

      {/* Verified Receipt Header Card */}
      <View style={styles.receiptCard}>
        <View style={styles.receiptHeader}>
          <View>
            <View style={styles.sealRow}>
              <View style={styles.greenSealDot} />
              <Text style={styles.sealText}>DIGITAL HARVEST LEDGER</Text>
            </View>
            <Text style={styles.receiptTitle}>Silk Cocoon Batch Receipt</Text>
            <Text style={styles.receiptId}>Batch ID: #{batch._id?.slice(-8).toUpperCase() || 'TN-BATCH'}</Text>
          </View>
          <Badge status="completed" label="VERIFIED" />
        </View>

        {/* Hero Payout Box */}
        <View style={styles.payoutBox}>
          <Text style={styles.payoutLabel}>Total Net Payout</Text>
          <Text style={styles.payoutNumber}>{formatINR(finalPayout)}</Text>
          <Text style={styles.payoutSub}>Credited to Farmer Account upon market clearance</Text>
        </View>

        {/* Primary Meta Grid */}
        <View style={styles.metaGrid}>
          <View style={styles.metaCell}>
            <Text style={styles.metaLabel}>Delivery Market</Text>
            <Text style={styles.metaVal}>📍 {batch.location || 'Center'}</Text>
          </View>
          <View style={styles.metaCell}>
            <Text style={styles.metaLabel}>Harvest Date</Text>
            <Text style={styles.metaVal}>🗓️ {formatDateShort(batch.date)}</Text>
          </View>
          <View style={styles.metaCell}>
            <Text style={styles.metaLabel}>Gross Weight</Text>
            <Text style={styles.metaVal}>⚖️ {displayTotalKg(batch)} kg</Text>
          </View>
          <View style={styles.metaCell}>
            <Text style={styles.metaLabel}>Status</Text>
            <Text style={styles.metaValGreen}>Cleared & Paid</Text>
          </View>
        </View>

        {/* Quality & Breakdown Table */}
        <Text style={styles.tableTitle}>Cocoon Quality Breakdown</Text>
        <View style={styles.table}>
          <View style={styles.tableHeaderRow}>
            <Text style={[styles.th, { flex: 2 }]}>Grade / Category</Text>
            <Text style={[styles.th, { flex: 1, textAlign: 'center' }]}>Weight</Text>
            <Text style={[styles.th, { flex: 1, textAlign: 'right' }]}>Rate</Text>
            <Text style={[styles.th, { flex: 1.2, textAlign: 'right' }]}>Subtotal</Text>
          </View>

          {/* Grade A / Good Silk */}
          <View style={styles.tableRow}>
            <View style={{ flex: 2 }}>
              <Text style={styles.gradeTitle}>Good Cocoon (Grade A)</Text>
              <Text style={styles.gradeSub}>Prime reelable silk</Text>
            </View>
            <Text style={[styles.td, { flex: 1, textAlign: 'center' }]}>{goodWeight} kg</Text>
            <Text style={[styles.td, { flex: 1, textAlign: 'right' }]}>{formatINR(goodRate)}</Text>
            <Text style={[styles.tdBold, { flex: 1.2, textAlign: 'right' }]}>
              {formatINR(goodWeight * goodRate)}
            </Text>
          </View>

          {/* Waste / Defective */}
          {wasteWeight > 0 ? (
            <View style={styles.tableRow}>
              <View style={{ flex: 2 }}>
                <Text style={styles.gradeTitle}>Double / Waste</Text>
                <Text style={styles.gradeSub}>Non-reelable silk</Text>
              </View>
              <Text style={[styles.td, { flex: 1, textAlign: 'center' }]}>{wasteWeight} kg</Text>
              <Text style={[styles.td, { flex: 1, textAlign: 'right' }]}>{formatINR(wasteRate)}</Text>
              <Text style={[styles.tdBold, { flex: 1.2, textAlign: 'right' }]}>
                {formatINR(wasteWeight * wasteRate)}
              </Text>
            </View>
          ) : null}

          {/* Total Net Row */}
          <View style={styles.tableTotalRow}>
            <Text style={styles.totalLabel}>Calculated Net Value</Text>
            <Text style={styles.totalAmount}>{formatINR(finalPayout)}</Text>
          </View>
        </View>

        {/* Notes if present */}
        {batch.notes || batch.adminNote ? (
          <View style={styles.notesBox}>
            <Text style={styles.notesTitle}>📝 Logistics & Quality Remarks</Text>
            <Text style={styles.notesText}>{batch.adminNote || batch.notes}</Text>
          </View>
        ) : null}

        <View style={styles.ticketFooter}>
          <Text style={styles.footerBarcode}>||| | |||| | ||| |||| | || |||| | |||</Text>
          <Text style={styles.footerNote}>Verified by Sericulture Market Inspector • TrackNow</Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg
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
    backgroundColor: colors.bg
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
    color: colors.primary
  },
  receiptCard: {
    backgroundColor: '#ffffff',
    borderRadius: radius.xl,
    padding: spacing.md,
    ...shadows.float
  },
  receiptHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    paddingBottom: 10,
    marginBottom: 12
  },
  sealRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 2
  },
  greenSealDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.primary
  },
  sealText: {
    fontSize: 9,
    fontWeight: '800',
    color: colors.primaryDark,
    letterSpacing: 0.6
  },
  receiptTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: colors.textMain
  },
  receiptId: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 1
  },
  payoutBox: {
    backgroundColor: '#1b4d32',
    borderRadius: radius.lg,
    padding: spacing.md,
    alignItems: 'center',
    marginBottom: spacing.md
  },
  payoutLabel: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.75)',
    fontWeight: '600'
  },
  payoutNumber: {
    fontSize: 28,
    fontWeight: '900',
    color: colors.gold,
    marginVertical: 2
  },
  payoutSub: {
    fontSize: 9.5,
    color: 'rgba(255, 255, 255, 0.65)',
    textAlign: 'center'
  },
  metaGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    backgroundColor: colors.surfaceSubtle,
    borderRadius: radius.md,
    padding: spacing.sm,
    marginBottom: spacing.md,
    gap: 8
  },
  metaCell: {
    width: '48%'
  },
  metaLabel: {
    fontSize: 10,
    color: colors.textMuted
  },
  metaVal: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textMain,
    marginTop: 1
  },
  metaValGreen: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.primary,
    marginTop: 1
  },
  tableTitle: {
    fontSize: 12.5,
    fontWeight: '800',
    color: colors.textMain,
    marginBottom: 6
  },
  table: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    overflow: 'hidden',
    marginBottom: spacing.md
  },
  tableHeaderRow: {
    flexDirection: 'row',
    backgroundColor: '#f8fafc',
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border
  },
  th: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.textSecondary
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9'
  },
  gradeTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textMain
  },
  gradeSub: {
    fontSize: 9,
    color: colors.textMuted
  },
  td: {
    fontSize: 11,
    color: colors.textSecondary
  },
  tdBold: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.textMain
  },
  tableTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f0fdf4',
    paddingVertical: 8,
    paddingHorizontal: 10
  },
  totalLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.primaryDark
  },
  totalAmount: {
    fontSize: 13,
    fontWeight: '900',
    color: colors.primaryDark
  },
  notesBox: {
    backgroundColor: '#fffbeb',
    borderWidth: 1,
    borderColor: '#fef3c7',
    borderRadius: radius.md,
    padding: spacing.sm,
    marginBottom: spacing.md
  },
  notesTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#92400e',
    marginBottom: 2
  },
  notesText: {
    fontSize: 11,
    color: '#78350f',
    lineHeight: 15
  },
  ticketFooter: {
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    paddingTop: 10,
    alignItems: 'center'
  },
  footerBarcode: {
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 2,
    color: '#94a3b8'
  },
  footerNote: {
    fontSize: 9,
    color: colors.textMuted,
    marginTop: 3
  }
});
