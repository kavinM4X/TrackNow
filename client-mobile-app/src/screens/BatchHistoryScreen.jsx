import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator
} from 'react-native';
import Badge from '../components/common/Badge';
import { deduplicatedGet } from '../api/client';
import { displayTotalKg, formatDateDayMonth, formatINR } from '../utils/format';
import { colors, radius, spacing } from '../styles/theme';

export default function BatchHistoryScreen({ onSelectBatch }) {
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const fetchBatches = useCallback(async () => {
    try {
      const res = await deduplicatedGet('/batches/my', {}, 15000);
      const raw = res.data;
      const list = Array.isArray(raw) ? raw : (raw?.batches || raw?.bookings || raw?.data || []);
      
      const dateMap = new Map();
      list.forEach((b) => {
        const d = b.date ? String(b.date).split('T')[0] : String(b._id);
        const amount = Number(b.displayFinalAmount ?? b.estimatedValue ?? 0);
        const existing = dateMap.get(d);
        if (!existing || amount > Number(existing.displayFinalAmount ?? existing.estimatedValue ?? 0)) {
          dateMap.set(d, b);
        }
      });

      const cleanBatches = Array.from(dateMap.values()).filter((b) => {
        const amount = Number(b.displayFinalAmount ?? b.estimatedValue ?? 0);
        return amount > 0;
      });

      setBatches(cleanBatches);
    } catch (err) {
      console.error('Fetch batches error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchBatches();
  }, [fetchBatches]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchBatches();
  };

  const safeBatches = Array.isArray(batches) ? batches : [];
  const filtered = safeBatches.filter((b) => {
    const amount = Number(b.displayFinalAmount ?? b.estimatedValue ?? 0);
    if (amount <= 0) return false;
    if (!search.trim()) return true;
    const term = search.toLowerCase();
    const loc = (b.location || '').toLowerCase();
    const d = (b.date || '').toLowerCase();
    return loc.includes(term) || d.includes(term);
  });

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />}
      keyboardShouldPersistTaps="handled"
    >
      {/* Header Search Box */}
      <View style={styles.searchBox}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          style={styles.searchInput}
          placeholder="Search by market center or date..."
          placeholderTextColor={colors.textMuted}
          value={search}
          onChangeText={setSearch}
        />
        {search ? (
          <TouchableOpacity onPress={() => setSearch('')} style={styles.clearBtn}>
            <Text style={{ fontSize: 13, color: colors.textMuted }}>✕</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      <Text style={styles.countText}>
        Showing {filtered.length} of {batches.length} completed harvest batches
      </Text>

      {loading ? (
        <ActivityIndicator color={colors.primary} size="small" style={{ marginVertical: 30 }} />
      ) : filtered.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyIcon}>📦</Text>
          <Text style={styles.emptyTitle}>No Batches Found</Text>
          <Text style={styles.emptySub}>
            {search ? `No batches matching "${search}".` : 'No completed deliveries recorded yet.'}
          </Text>
        </View>
      ) : (
        <View style={styles.feed}>
          {filtered.map((b, idx) => {
            const amount = b.displayFinalAmount ?? b.estimatedValue ?? 0;
            return (
              <TouchableOpacity
                key={b._id || b.id || `hist-${idx}`}
                style={styles.card}
                onPress={() => onSelectBatch(b._id || b.id)}
                activeOpacity={0.7}
              >
                <View style={styles.cardLeft}>
                  <Text style={styles.batchDate}>
                    🗓️ {formatDateDayMonth(b.date)}
                  </Text>
                  <Text style={styles.batchSub}>
                    📍 {b.location || 'Market'} Center · 📦 {displayTotalKg(b)} kg
                  </Text>
                  {amount > 0 && (
                    <Text style={styles.payoutText}>
                      💰 Net Payout: <Text style={styles.payoutVal}>{formatINR(amount)}</Text>
                    </Text>
                  )}
                  <Text style={styles.tapCue}>Tap for weight breakdown & rates →</Text>
                </View>

                <View style={styles.cardRight}>
                  <Badge status="completed" label="Completed" size="sm" />
                </View>
              </TouchableOpacity>
            );
          })}
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
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: radius.md,
    paddingHorizontal: spacing.sm + 4,
    borderWidth: 1,
    borderColor: colors.border,
    height: 44,
    marginBottom: spacing.xs
  },
  searchIcon: {
    fontSize: 14,
    marginRight: 8
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: colors.textMain
  },
  clearBtn: {
    padding: 4
  },
  countText: {
    fontSize: 11,
    color: colors.textMuted,
    marginBottom: spacing.sm,
    marginLeft: 2
  },
  emptyCard: {
    backgroundColor: '#ffffff',
    borderRadius: radius.lg,
    padding: spacing.xl,
    alignItems: 'center',
    marginTop: 10
  },
  emptyIcon: {
    fontSize: 32,
    marginBottom: 6
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.textMain
  },
  emptySub: {
    fontSize: 11.5,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: 2
  },
  feed: {
    gap: 8
  },
  card: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#ffffff',
    borderRadius: radius.md,
    padding: spacing.sm + 4,
    borderWidth: 1,
    borderColor: colors.border
  },
  cardLeft: {
    flex: 1,
    marginRight: 8
  },
  batchDate: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.textMain
  },
  batchSub: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2
  },
  payoutText: {
    fontSize: 11.5,
    color: colors.primaryDark,
    marginTop: 4
  },
  payoutVal: {
    fontWeight: '800'
  },
  tapCue: {
    fontSize: 9.5,
    color: colors.primary,
    fontWeight: '600',
    marginTop: 4
  },
  cardRight: {
    alignItems: 'flex-end',
    justifyContent: 'flex-start'
  }
});
