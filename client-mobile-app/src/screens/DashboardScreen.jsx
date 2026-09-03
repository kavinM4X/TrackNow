import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator
} from 'react-native';
import Badge from '../components/common/Badge';
import api, { deduplicatedGet } from '../api/client';
import { displayTotalKg, formatDateDayMonth, formatINR } from '../utils/format';
import { colors, radius, spacing, shadows } from '../styles/theme';

const MARKET_LOCATIONS = [
  { label: 'Coimbatore', key: 'coimbatore', avgKey: 'coimbatoreAvg', minKey: 'coimbatoreMin', code: 'CBE' },
  { label: 'Mamballi', key: 'mamballi', avgKey: 'mamballiAvg', minKey: 'mamballiMin', code: 'MBL' },
  { label: 'Ramnagar', key: 'ramnagar', avgKey: 'ramnagarAvg', minKey: 'ramnagarMin', code: 'RNG' },
  { label: 'Dharmapuri', key: 'dharmapuri', avgKey: 'dharmapuriAvg', minKey: 'dharmapuriMin', code: 'DHP' }
];

export default function DashboardScreen({ user, onNavigateTab, onSelectBatch }) {
  const [refreshing, setRefreshing] = useState(false);
  const [marketRate, setMarketRate] = useState(null);
  const [rateIndex, setRateIndex] = useState(0);

  const [upcoming, setUpcoming] = useState(null);
  const [upcomingLoading, setUpcomingLoading] = useState(true);

  const [stats, setStats] = useState({ totalBatches: 0, totalKg: 0 });
  const [recentBatches, setRecentBatches] = useState([]);
  const [recentLoading, setRecentLoading] = useState(true);

  const loadData = useCallback(async () => {
    try {
      // Market Rates
      deduplicatedGet('/market-rates/latest', {}, 60000)
        .then((res) => setMarketRate(res.data))
        .catch(() => {});

      // Upcoming Booking
      deduplicatedGet('/bookings/upcoming', {}, 15000)
        .then((res) => setUpcoming(res.data))
        .catch(() => {})
        .finally(() => setUpcomingLoading(false));

      // Stats
      deduplicatedGet('/batches/stats', {}, 30000)
        .then((res) => setStats(res.data || { totalBatches: 0, totalKg: 0 }))
        .catch(() => {});

      // Recent Batches
      deduplicatedGet('/batches/recent', {}, 15000)
        .then((res) => setRecentBatches(res.data || []))
        .catch(() => {})
        .finally(() => setRecentLoading(false));
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Auto-cycle market rate ticker
  useEffect(() => {
    const timer = setInterval(() => {
      setRateIndex((prev) => (prev + 1) % MARKET_LOCATIONS.length);
    }, 4500);
    return () => clearInterval(timer);
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const currentLoc = MARKET_LOCATIONS[rateIndex];
  const currentRateVal = marketRate?.[currentLoc.key] || 0;
  const currentAvgVal = marketRate?.[currentLoc.avgKey] || 0;
  const currentMinVal = marketRate?.[currentLoc.minKey] || 0;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />}
    >
      {/* 1. Live Silk Cocoon Market Rates Ticker */}
      <View style={styles.rateCard}>
        <View style={styles.rateCardHeader}>
          <View style={styles.rateTag}>
            <View style={styles.pulseDot} />
            <Text style={styles.rateTagText}>LIVE SILK COCOON RATES</Text>
          </View>
          <Text style={styles.todayDateText}>{formatDateDayMonth(new Date().toISOString())}</Text>
        </View>

        <View style={styles.rateBody}>
          <View style={styles.rateMainCol}>
            <Text style={styles.marketName}>📍 {currentLoc.label} Exchange</Text>
            <View style={styles.priceRow}>
              <Text style={styles.priceVal}>{currentRateVal > 0 ? formatINR(currentRateVal) : '-'}</Text>
              {currentRateVal > 0 && <Text style={styles.priceUnit}>/ kg</Text>}
            </View>
          </View>

          <View style={styles.rateSubCol}>
            <View style={styles.subPill}>
              <Text style={styles.subPillLabel}>Day Avg</Text>
              <Text style={styles.subPillVal}>{currentAvgVal > 0 ? formatINR(currentAvgVal) : '-'}</Text>
            </View>
            <View style={styles.subPill}>
              <Text style={styles.subPillLabel}>Day Min</Text>
              <Text style={styles.subPillVal}>{currentMinVal > 0 ? formatINR(currentMinVal) : '-'}</Text>
            </View>
          </View>
        </View>

        {/* Dots Pagination */}
        <View style={styles.dotsRow}>
          {MARKET_LOCATIONS.map((loc, idx) => (
            <TouchableOpacity
              key={loc.code}
              style={[styles.dot, idx === rateIndex && styles.dotActive]}
              onPress={() => setRateIndex(idx)}
            />
          ))}
        </View>
      </View>

      {/* 2. Upcoming Booking Card */}
      {upcomingLoading ? (
        <View style={styles.cardSkeleton}>
          <ActivityIndicator color={colors.primary} size="small" />
        </View>
      ) : upcoming ? (
        <View style={styles.upcomingCard}>
          <View style={styles.upcomingHeader}>
            <View style={styles.upcomingLeftBadge}>
              <Text style={styles.upcomingIcon}>📦</Text>
              <Text style={styles.upcomingBadgeTitle}>ACTIVE HARVEST PICKUP</Text>
            </View>
            <Badge status={upcoming.status} />
          </View>

          <View style={styles.upcomingDetails}>
            <Text style={styles.upcomingDest}>📍 Market: {upcoming.location} Center</Text>
            <Text style={styles.upcomingMeta}>
              🗓️ Scheduled: <Text style={{ fontWeight: '800' }}>{formatDateDayMonth(upcoming.date)}</Text> · ⚖️ {upcoming.quantityKg} kg
            </Text>
          </View>

          <TouchableOpacity
            style={styles.trackBtn}
            onPress={() => onNavigateTab('tracker')}
            activeOpacity={0.8}
          >
            <Text style={styles.trackBtnText}>📍 Live GPS Driver Tracker →</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.noUpcomingCard}>
          <View style={{ flex: 1 }}>
            <Text style={styles.noUpcomingTitle}>No Pickups Scheduled</Text>
            <Text style={styles.noUpcomingSub}>Schedule your cocoon harvest for driver dispatch.</Text>
          </View>
          <TouchableOpacity style={styles.bookNowBtn} onPress={() => onNavigateTab('booking')}>
            <Text style={styles.bookNowBtnText}>+ Book</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* 3. Quick Actions Row */}
      <Text style={styles.sectionHeading}>⚡ Quick Actions</Text>
      <View style={styles.quickGrid}>
        <TouchableOpacity
          style={styles.quickCard}
          onPress={() => onNavigateTab('booking')}
          activeOpacity={0.7}
        >
          <Text style={styles.quickIcon}>📦</Text>
          <Text style={styles.quickTitle}>Book Pickup</Text>
          <Text style={styles.quickSub}>Schedule harvest</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.quickCard}
          onPress={() => onNavigateTab('history')}
          activeOpacity={0.7}
        >
          <Text style={styles.quickIcon}>📜</Text>
          <Text style={styles.quickTitle}>Batch History</Text>
          <Text style={styles.quickSub}>Payout receipts</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.quickCard}
          onPress={() => onNavigateTab('tracker')}
          activeOpacity={0.7}
        >
          <Text style={styles.quickIcon}>📍</Text>
          <Text style={styles.quickTitle}>GPS Tracker</Text>
          <Text style={styles.quickSub}>Live fleet route</Text>
        </TouchableOpacity>
      </View>

      {/* 4. Lifetime Farmer Statistics */}
      <Text style={styles.sectionHeading}>📊 Lifetime Harvest Summary</Text>
      <View style={styles.statsRow}>
        <View style={styles.statBox}>
          <Text style={styles.statNumber}>{stats.totalBatches || 0}</Text>
          <Text style={styles.statLabel}>Batches Delivered</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statNumber}>{Number(stats.totalKg || 0)}</Text>
          <Text style={styles.statLabel}>Total Cocoon kg</Text>
        </View>
      </View>

      {/* 5. Recent Completed Batches */}
      <View style={styles.recentHeaderRow}>
        <Text style={styles.sectionHeading}>📜 Recent Completed Batches</Text>
        <TouchableOpacity onPress={() => onNavigateTab('history')}>
          <Text style={styles.viewAllText}>View All →</Text>
        </TouchableOpacity>
      </View>

      {recentLoading ? (
        <ActivityIndicator color={colors.primary} size="small" style={{ marginVertical: 20 }} />
      ) : recentBatches.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyCardText}>No completed harvest batches recorded yet.</Text>
        </View>
      ) : (
        <View style={styles.batchList}>
          {recentBatches.map((b, idx) => (
            <TouchableOpacity
              key={b._id || b.id || `batch-${idx}`}
              style={styles.batchCard}
              onPress={() => onSelectBatch(b._id || b.id)}
              activeOpacity={0.7}
            >
              <View style={styles.batchCardLeft}>
                <Text style={styles.batchCardLoc}>📍 {b.location || 'Market'}</Text>
                <Text style={styles.batchCardSub}>
                  🗓️ {formatDateDayMonth(b.date)} · 📦 {displayTotalKg(b)} kg
                </Text>
              </View>

              <View style={styles.batchCardRight}>
                {b.estimatedValue > 0 && (
                  <Text style={styles.batchAmount}>{formatINR(b.estimatedValue)}</Text>
                )}
                <Text style={styles.chevron}>→</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      )}
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
    paddingBottom: 110
  },
  rateCard: {
    backgroundColor: '#1b4d32',
    borderRadius: radius.xl,
    padding: spacing.md,
    marginBottom: spacing.md,
    ...shadows.float
  },
  rateCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8
  },
  rateTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.full,
    gap: 5
  },
  pulseDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#34d399'
  },
  rateTagText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#34d399',
    letterSpacing: 0.5
  },
  todayDateText: {
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.65)'
  },
  rateBody: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 4
  },
  rateMainCol: {
    flex: 1
  },
  marketName: {
    fontSize: 13,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.85)',
    marginBottom: 2
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline'
  },
  priceVal: {
    fontSize: 26,
    fontWeight: '900',
    color: '#ffffff',
    letterSpacing: -0.5
  },
  priceUnit: {
    fontSize: 12,
    color: colors.gold,
    fontWeight: '700',
    marginLeft: 4
  },
  rateSubCol: {
    gap: 4
  },
  subPill: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: radius.sm,
    paddingHorizontal: 8,
    paddingVertical: 3,
    alignItems: 'flex-end'
  },
  subPillLabel: {
    fontSize: 8.5,
    color: 'rgba(255, 255, 255, 0.6)'
  },
  subPillVal: {
    fontSize: 11,
    fontWeight: '700',
    color: '#ffffff'
  },
  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
    marginTop: 10
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.25)'
  },
  dotActive: {
    width: 16,
    backgroundColor: colors.gold
  },
  upcomingCard: {
    backgroundColor: '#ffffff',
    borderRadius: radius.xl,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.primaryBorder,
    ...shadows.card
  },
  upcomingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8
  },
  upcomingLeftBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4
  },
  upcomingIcon: {
    fontSize: 14
  },
  upcomingBadgeTitle: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.primaryDark,
    letterSpacing: 0.5
  },
  upcomingDetails: {
    marginVertical: 4
  },
  upcomingDest: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.textMain
  },
  upcomingMeta: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2
  },
  trackBtn: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: 10,
    alignItems: 'center',
    marginTop: 10
  },
  trackBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700'
  },
  noUpcomingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: radius.xl,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border
  },
  noUpcomingTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textMain
  },
  noUpcomingSub: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 1
  },
  bookNowBtn: {
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.sm
  },
  bookNowBtnText: {
    color: colors.primaryDark,
    fontWeight: '800',
    fontSize: 12
  },
  cardSkeleton: {
    height: 90,
    backgroundColor: '#ffffff',
    borderRadius: radius.xl,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md
  },
  sectionHeading: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.textMain,
    marginBottom: 8
  },
  quickGrid: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: spacing.md
  },
  quickCard: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: radius.md,
    padding: spacing.sm + 2,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    ...shadows.card
  },
  quickIcon: {
    fontSize: 22,
    marginBottom: 4
  },
  quickTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.textMain
  },
  quickSub: {
    fontSize: 9,
    color: colors.textMuted,
    marginTop: 1
  },
  statsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: spacing.md
  },
  statBox: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.card
  },
  statNumber: {
    fontSize: 20,
    fontWeight: '900',
    color: colors.primaryDark
  },
  statLabel: {
    fontSize: 10.5,
    color: colors.textSecondary,
    fontWeight: '600',
    marginTop: 2
  },
  recentHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6
  },
  viewAllText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primary
  },
  emptyCard: {
    backgroundColor: '#ffffff',
    borderRadius: radius.md,
    padding: spacing.lg,
    alignItems: 'center'
  },
  emptyCardText: {
    fontSize: 12,
    color: colors.textMuted
  },
  batchList: {
    gap: 6
  },
  batchCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#ffffff',
    borderRadius: radius.md,
    padding: spacing.sm + 4,
    borderWidth: 1,
    borderColor: colors.border
  },
  batchCardLeft: {
    flex: 1
  },
  batchCardLoc: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textMain
  },
  batchCardSub: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2
  },
  batchCardRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6
  },
  batchAmount: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.primaryDark
  },
  chevron: {
    fontSize: 14,
    color: colors.textMuted
  }
});
