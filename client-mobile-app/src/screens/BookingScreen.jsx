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
import DatePickerCalendar from '../components/common/DatePickerCalendar';
import api, { deduplicatedGet, invalidateClientCache } from '../api/client';
import { formatDateDayMonth, todayISO } from '../utils/format';
import { colors, radius, spacing, shadows } from '../styles/theme';

const LOCATIONS = ['Coimbatore', 'Mamballi', 'Ramnagar', 'Dharmapuri'];
const WEIGHT_PRESETS = [50, 100, 250, 500];

export default function BookingScreen() {
  const [date, setDate] = useState(todayISO());
  const [location, setLocation] = useState('Coimbatore');
  const [quantityKg, setQuantityKg] = useState('100');
  const [notes, setNotes] = useState('');

  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const fetchBookings = useCallback(async () => {
    try {
      const res = await deduplicatedGet('/bookings/my', {}, 10000);
      const raw = res.data;
      const list = Array.isArray(raw) ? raw : (raw?.bookings || raw?.batches || raw?.data || []);
      setBookings(list);
    } catch (e) {
      console.error('Fetch bookings error:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

  const onRefresh = () => {
    setRefreshing(true);
    invalidateClientCache('/bookings');
    fetchBookings();
  };

  const handleSubmit = async () => {
    setError('');
    setSuccess('');
    const qty = Number(quantityKg);
    if (!qty || qty < 1) {
      setError('Please enter a harvest weight of at least 1 kg.');
      return;
    }

    setSubmitting(true);
    try {
      await api.post('/bookings', {
        date,
        location,
        quantityKg: qty,
        notes: notes.trim()
      });

      // Clear cache so the new booking renders immediately
      invalidateClientCache('/bookings');

      setSuccess('✓ Booking submitted successfully! Driver tracking will activate on pickup date.');
      setQuantityKg('');
      setNotes('');
      await fetchBookings();
    } catch (err) {
      setError(
        err.response?.data?.error ||
        err.response?.data?.message ||
        'Could not save booking. Please verify details.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />}
      keyboardShouldPersistTaps="handled"
    >
      {/* Hero Banner */}
      <View style={styles.heroBanner}>
        <Text style={styles.heroTitle}>📦 Farmer Harvest Pickup Booking</Text>
        <Text style={styles.heroSub}>
          Schedule your cocoon harvest pickup date and nearest market center.
        </Text>
      </View>

      {/* Form Card */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>✨ Create New Booking</Text>

        {/* Interactive Calendar Date Picker (Present & Future Days Only) */}
        <DatePickerCalendar
          selectedDate={date}
          onSelectDate={setDate}
        />

        {/* Location Chips */}
        <View style={styles.field}>
          <Text style={styles.label}>🏛️ Delivery Market Center</Text>
          <View style={styles.chipGrid}>
            {LOCATIONS.map((loc) => {
              const isSelected = location === loc;
              return (
                <TouchableOpacity
                  key={loc}
                  style={[styles.chip, isSelected && styles.chipActive]}
                  onPress={() => setLocation(loc)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.chipText, isSelected && styles.chipTextActive]}>
                    📍 {loc}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Quantity Field & Presets */}
        <View style={styles.field}>
          <View style={styles.labelRow}>
            <Text style={styles.label}>⚖️ Quantity (kg)</Text>
            <Text style={styles.quickText}>Quick Select:</Text>
          </View>

          <View style={styles.inputWrap}>
            <TextInput
              style={styles.input}
              value={quantityKg}
              onChangeText={setQuantityKg}
              placeholder="e.g. 100"
              keyboardType="numeric"
            />
            <Text style={styles.unitText}>kg</Text>
          </View>

          <View style={styles.presetRow}>
            {WEIGHT_PRESETS.map((preset) => {
              const isSelected = Number(quantityKg) === preset;
              return (
                <TouchableOpacity
                  key={preset}
                  style={[styles.presetBtn, isSelected && styles.presetBtnActive]}
                  onPress={() => setQuantityKg(String(preset))}
                >
                  <Text style={[styles.presetBtnText, isSelected && styles.presetBtnTextActive]}>
                    {preset} kg
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Notes Field */}
        <View style={styles.field}>
          <Text style={styles.label}>📝 Notes / Farmer Instructions (Optional)</Text>
          <TextInput
            style={styles.textarea}
            value={notes}
            onChangeText={setNotes}
            placeholder="e.g. Call before arrival, farm landmark..."
            placeholderTextColor={colors.textMuted}
            multiline
            numberOfLines={2}
          />
        </View>

        {error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>⚠ {error}</Text>
          </View>
        ) : null}

        {success ? (
          <View style={styles.successBox}>
            <Text style={styles.successText}>{success}</Text>
          </View>
        ) : null}

        <TouchableOpacity
          style={[styles.submitBtn, submitting && styles.submitBtnDisabled]}
          onPress={handleSubmit}
          disabled={submitting}
          activeOpacity={0.8}
        >
          {submitting ? (
            <ActivityIndicator color="#ffffff" size="small" />
          ) : (
            <Text style={styles.submitBtnText}>✓ Confirm Pickup Booking</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Bookings List */}
      <View style={styles.historySection}>
        <Text style={styles.historyTitle}>
          📜 My Scheduled Bookings ({bookings.length})
        </Text>

        {(() => {
          const safeBookings = Array.isArray(bookings) ? bookings : [];
          return loading ? (
            <ActivityIndicator color={colors.primary} size="small" style={{ marginVertical: 14 }} />
          ) : safeBookings.length === 0 ? (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyText}>
                No bookings created yet. Complete the form above to schedule your first harvest pickup.
              </Text>
            </View>
          ) : (
            safeBookings.map((b, idx) => (
            <View key={b._id || b.id || `booking-${idx}`} style={styles.bookingCard}>
              <View style={styles.bookingLeft}>
                <Text style={styles.bookingMainText}>
                  📍 {b.location} · 🗓️ {formatDateDayMonth(b.date)}
                </Text>
                <Text style={styles.bookingSubText}>
                  📦 Harvest Weight: <Text style={{ fontWeight: '800' }}>{b.quantityKg} kg</Text>
                  {b.notes ? ` · 📝 "${b.notes}"` : ''}
                </Text>
              </View>
              <Badge status={b.status} />
            </View>
          ))
          );
        })()}
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
    paddingBottom: 110
  },
  heroBanner: {
    backgroundColor: '#1b4d32',
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    ...shadows.card
  },
  heroTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#ffffff'
  },
  heroSub: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.75)',
    marginTop: 3
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: radius.xl,
    padding: spacing.md,
    marginBottom: spacing.md,
    ...shadows.card
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.textMain,
    marginBottom: spacing.sm + 4
  },
  field: {
    marginBottom: spacing.sm + 4
  },
  label: {
    fontSize: 11.5,
    fontWeight: '700',
    color: colors.textSecondary,
    marginBottom: 4
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4
  },
  quickText: {
    fontSize: 10,
    color: colors.textMuted
  },
  hint: {
    fontSize: 9.5,
    color: colors.textMuted,
    marginTop: 2
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.sm + 2
  },
  input: {
    flex: 1,
    height: 42,
    fontSize: 14,
    fontWeight: '600',
    color: colors.textMain
  },
  unitText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textMuted
  },
  chipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6
  },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: colors.border
  },
  chipActive: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.primary
  },
  chipText: {
    fontSize: 11.5,
    color: colors.textSecondary,
    fontWeight: '600'
  },
  chipTextActive: {
    color: colors.primaryDark,
    fontWeight: '800'
  },
  presetRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 6
  },
  presetBtn: {
    flex: 1,
    backgroundColor: colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 6,
    borderRadius: radius.sm,
    alignItems: 'center'
  },
  presetBtnActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary
  },
  presetBtnText: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '700'
  },
  presetBtnTextActive: {
    color: '#ffffff'
  },
  textarea: {
    backgroundColor: colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.sm,
    fontSize: 13,
    color: colors.textMain,
    minHeight: 52
  },
  submitBtn: {
    backgroundColor: colors.primary,
    height: 46,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
    ...shadows.card
  },
  submitBtnDisabled: {
    opacity: 0.7
  },
  submitBtnText: {
    color: '#ffffff',
    fontSize: 13.5,
    fontWeight: '700'
  },
  errorBox: {
    backgroundColor: colors.errorLight,
    padding: spacing.sm,
    borderRadius: radius.sm,
    marginBottom: spacing.sm
  },
  errorText: {
    color: colors.error,
    fontSize: 11.5,
    fontWeight: '600'
  },
  successBox: {
    backgroundColor: colors.primaryLight,
    padding: spacing.sm,
    borderRadius: radius.sm,
    marginBottom: spacing.sm
  },
  successText: {
    color: colors.primaryDark,
    fontSize: 11.5,
    fontWeight: '700'
  },
  historySection: {
    marginTop: 4
  },
  historyTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.textMain,
    marginBottom: 8
  },
  emptyBox: {
    backgroundColor: '#ffffff',
    borderRadius: radius.md,
    padding: spacing.md,
    alignItems: 'center'
  },
  emptyText: {
    fontSize: 11.5,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 16
  },
  bookingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#ffffff',
    borderRadius: radius.md,
    padding: spacing.sm + 4,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: colors.border
  },
  bookingLeft: {
    flex: 1,
    marginRight: 6
  },
  bookingMainText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: colors.textMain
  },
  bookingSubText: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2
  }
});
