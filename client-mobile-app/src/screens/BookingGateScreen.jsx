import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  StatusBar,
  ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import BrandLogo from '../components/common/BrandLogo';
import Badge from '../components/common/Badge';
import DatePickerCalendar from '../components/common/DatePickerCalendar';
import api from '../api/client';
import { storage } from '../utils/storage';
import { formatDateShort, todayISO } from '../utils/format';
import { colors, radius, spacing, shadows } from '../styles/theme';

const LOCATIONS = [
  { name: 'Coimbatore', region: 'Tamil Nadu • Main Hub', icon: '🏬' },
  { name: 'Mamballi', region: 'Karnataka Border Center', icon: '📍' },
  { name: 'Ramnagar', region: 'Silk Cocoon Exchange', icon: '🏛️' },
  { name: 'Dharmapuri', region: 'Tamil Nadu Region', icon: '🌿' }
];

const WEIGHT_PRESETS = [25, 50, 100, 250, 500];

export default function BookingGateScreen({ user, onCompleteGate }) {
  const [step, setStep] = useState('form'); // 'form' | 'success'
  const [date, setDate] = useState(todayISO());
  const [location, setLocation] = useState('Coimbatore');
  const [quantityKg, setQuantityKg] = useState('100');
  const [confirmedBooking, setConfirmedBooking] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [countdown, setCountdown] = useState(3);

  const firstName = user?.name?.split(' ')[0] || 'Farmer';

  useEffect(() => {
    let timer;
    if (step === 'success' && countdown > 0) {
      timer = setTimeout(() => setCountdown((c) => c - 1), 1000);
    } else if (step === 'success' && countdown <= 0) {
      onCompleteGate();
    }
    return () => clearTimeout(timer);
  }, [step, countdown, onCompleteGate]);

  const handleSubmit = async () => {
    setError('');
    const qty = Number(quantityKg);
    if (!qty || qty < 1) {
      setError('Please enter a valid harvest quantity of at least 1 kg.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await api.post('/bookings', {
        date,
        location,
        quantityKg: qty,
        notes: ''
      });

      const uid = user?._id || user?.id || 'anon';
      storage.setItem(`has_active_booking_${uid}`, 'true');
      storage.setItem(`last_booking_date_${uid}`, date);
      storage.setItem(`last_location_${uid}`, location);

      setConfirmedBooking(res.data);
      setStep('success');
    } catch (err) {
      const msg =
        err.response?.data?.error ||
        err.response?.data?.message ||
        'Could not save booking. Please check details.';
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  // SUCCESS STEP (Digital Ticket / Receipt)
  if (step === 'success' && confirmedBooking) {
    const bookingId = `TN-${Math.floor(100000 + Math.random() * 900000)}`;
    const pct = ((3 - countdown) / 3) * 100;

    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#0e2a1b" />
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.headerHero}>
            <View style={styles.badgeRow}>
              <View style={styles.greenPulse} />
              <Text style={styles.badgeText}>SERICULTURE PORTAL</Text>
            </View>
            <Text style={styles.title}>Booking Confirmed!</Text>
            <Text style={styles.sub}>Your cocoon batch is registered on the cluster</Text>
          </View>

          {/* Ticket Card */}
          <View style={styles.ticketCard}>
            <View style={styles.ticketHeader}>
              <Text style={styles.ticketBrand}>TRACKNOW BATCH RECEIPT</Text>
              <Text style={styles.ticketId}>{bookingId}</Text>
            </View>

            <View style={styles.ticketBody}>
              <View style={styles.receiptRow}>
                <Text style={styles.receiptLabel}>Destination Market</Text>
                <Text style={styles.receiptValue}>{confirmedBooking.location} Market</Text>
              </View>

              <View style={styles.receiptRow}>
                <Text style={styles.receiptLabel}>Scheduled Date</Text>
                <Text style={styles.receiptValue}>{formatDateShort(confirmedBooking.date)}</Text>
              </View>

              <View style={styles.receiptRow}>
                <Text style={styles.receiptLabel}>Estimated Quantity</Text>
                <Text style={styles.receiptValue}>{confirmedBooking.quantityKg} kg</Text>
              </View>

              <View style={styles.receiptRow}>
                <Text style={styles.receiptLabel}>Status</Text>
                <Badge status="confirmed" label="CONFIRMED" />
              </View>
            </View>

            {/* Digital Barcode visual */}
            <View style={styles.barcodeBox}>
              <Text style={styles.barcodeVisual}>||| | |||| | ||| |||| | || |||| | |||</Text>
              <Text style={styles.barcodeText}>{bookingId} • VERIFIED CLUSTER BATCH</Text>
            </View>
          </View>

          {/* Countdown & Redirect */}
          <View style={styles.countdownCard}>
            <View style={styles.countdownHeader}>
              <Text style={styles.countdownTitle}>Redirecting to Dashboard</Text>
              <Text style={styles.countdownNum}>{countdown}s</Text>
            </View>
            <View style={styles.progressBarBg}>
              <View style={[styles.progressBarFill, { width: `${pct}%` }]} />
            </View>
          </View>

          <TouchableOpacity style={styles.primaryBtn} onPress={onCompleteGate}>
            <Text style={styles.primaryBtnText}>Go to Dashboard Now →</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // FORM STEP
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0e2a1b" />
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        {/* Header */}
        <View style={styles.headerHero}>
          <BrandLogo size={46} style={{ alignSelf: 'center', marginBottom: 6 }} />
          <View style={styles.badgeRow}>
            <View style={styles.greenPulse} />
            <Text style={styles.badgeText}>FARMER ONBOARDING</Text>
          </View>
          <Text style={styles.welcome}>Welcome back, {firstName}</Text>
          <Text style={styles.title}>Schedule Upcoming Batch</Text>
          <Text style={styles.sub}>Confirm your next cocoon market delivery details</Text>
        </View>

        {/* Stepper */}
        <View style={styles.stepperBox}>
          <View style={styles.stepsRow}>
            <View style={[styles.stepDot, styles.stepDotActive]}>
              <Text style={styles.stepNumActive}>1</Text>
            </View>
            <View style={[styles.stepLine, styles.stepLineActive]} />
            <View style={styles.stepDot}>
              <Text style={styles.stepNum}>2</Text>
            </View>
            <View style={styles.stepLine} />
            <View style={styles.stepDot}>
              <Text style={styles.stepNum}>✓</Text>
            </View>
          </View>
          <View style={styles.stepLabelsRow}>
            <Text style={[styles.stepLabel, styles.stepLabelActive]}>Batch Form</Text>
            <Text style={styles.stepLabel}>Confirm</Text>
            <Text style={styles.stepLabel}>Dashboard</Text>
          </View>
        </View>

        {/* Main Form Card */}
        <View style={styles.card}>
          {/* Interactive Calendar Date Picker (Present & Future Days Only) */}
          <DatePickerCalendar
            selectedDate={date}
            onSelectDate={setDate}
          />

          {/* Location Selector */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>📍 Market Center Destination</Text>
            <View style={styles.locGrid}>
              {LOCATIONS.map((loc) => {
                const isActive = location === loc.name;
                return (
                  <TouchableOpacity
                    key={loc.name}
                    style={[styles.locCard, isActive && styles.locCardActive]}
                    onPress={() => setLocation(loc.name)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.locIcon}>{loc.icon}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.locName, isActive && styles.locNameActive]}>
                        {loc.name}
                      </Text>
                      <Text style={styles.locRegion} numberOfLines={1}>{loc.region}</Text>
                    </View>
                    {isActive && <Text style={styles.checkBadge}>✓</Text>}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Quantity & Presets */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>⚖️ Estimated Quantity (kg)</Text>
            <View style={styles.qtyInputWrap}>
              <TextInput
                style={styles.qtyInput}
                value={quantityKg}
                onChangeText={setQuantityKg}
                keyboardType="numeric"
                placeholder="Enter kg"
              />
              <Text style={styles.qtyUnit}>kg</Text>
            </View>

            {/* Quick Touch Presets */}
            <Text style={styles.presetTitle}>Quick select presets:</Text>
            <View style={styles.presetGrid}>
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

          {/* Live Preview */}
          <View style={styles.previewCard}>
            <View style={styles.previewHeader}>
              <Text style={styles.previewTitle}>BATCH BOOKING PREVIEW</Text>
              <Text style={styles.liveTag}>LIVE</Text>
            </View>
            <View style={styles.previewRow}>
              <View>
                <Text style={styles.previewCellLabel}>Market</Text>
                <Text style={styles.previewCellVal}>{location}</Text>
              </View>
              <View>
                <Text style={styles.previewCellLabel}>Date</Text>
                <Text style={styles.previewCellVal}>{formatDateShort(date)}</Text>
              </View>
              <View>
                <Text style={styles.previewCellLabel}>Est. Quantity</Text>
                <Text style={styles.previewCellVal}>{quantityKg || '0'} kg</Text>
              </View>
            </View>
          </View>

          {error ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>⚠ {error}</Text>
            </View>
          ) : null}

          {/* Submit */}
          <TouchableOpacity
            style={[styles.primaryBtn, submitting && styles.primaryBtnDisabled]}
            onPress={handleSubmit}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator color="#ffffff" size="small" />
            ) : (
              <Text style={styles.primaryBtnText}>Confirm Booking & Continue →</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a1d13'
  },
  scrollContent: {
    padding: spacing.md,
    paddingBottom: spacing.xl
  },
  headerHero: {
    alignItems: 'center',
    marginBottom: spacing.md
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(52, 211, 153, 0.12)',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: radius.full,
    marginBottom: 4
  },
  greenPulse: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#34d399'
  },
  badgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#34d399',
    letterSpacing: 0.8
  },
  welcome: {
    fontSize: 12,
    color: colors.gold,
    fontWeight: '700',
    marginTop: 2
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: '#ffffff',
    marginTop: 2
  },
  sub: {
    fontSize: 11.5,
    color: 'rgba(255, 255, 255, 0.7)',
    marginTop: 2,
    textAlign: 'center'
  },
  stepperBox: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: radius.md,
    padding: spacing.sm,
    marginBottom: spacing.md
  },
  stepsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8
  },
  stepDot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center'
  },
  stepDotActive: {
    backgroundColor: colors.primary
  },
  stepNum: {
    fontSize: 11,
    fontWeight: '700',
    color: '#ffffff'
  },
  stepNumActive: {
    fontSize: 11,
    fontWeight: '800',
    color: '#ffffff'
  },
  stepLine: {
    width: 32,
    height: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.2)'
  },
  stepLineActive: {
    backgroundColor: colors.primary
  },
  stepLabelsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    marginTop: 4
  },
  stepLabel: {
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.45)'
  },
  stepLabelActive: {
    color: '#ffffff',
    fontWeight: '700'
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: radius.xl,
    padding: spacing.md,
    ...shadows.float
  },
  section: {
    marginBottom: spacing.md
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.textMain,
    marginBottom: 6
  },
  dateInputWrap: {
    backgroundColor: colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 4
  },
  dateInput: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textMain
  },
  dateHint: {
    fontSize: 10,
    color: colors.textMuted
  },
  locGrid: {
    gap: 6
  },
  locCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.sm,
    gap: 10
  },
  locCardActive: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.primary
  },
  locIcon: {
    fontSize: 20
  },
  locName: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textMain
  },
  locNameActive: {
    color: colors.primaryDark,
    fontWeight: '800'
  },
  locRegion: {
    fontSize: 10,
    color: colors.textMuted
  },
  checkBadge: {
    color: colors.primary,
    fontWeight: '900',
    fontSize: 16
  },
  qtyInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.sm + 4
  },
  qtyInput: {
    flex: 1,
    height: 44,
    fontSize: 16,
    fontWeight: '800',
    color: colors.textMain
  },
  qtyUnit: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textMuted
  },
  presetTitle: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
    marginTop: 8,
    marginBottom: 4
  },
  presetGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6
  },
  presetBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: colors.border
  },
  presetBtnActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary
  },
  presetBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textSecondary
  },
  presetBtnTextActive: {
    color: '#ffffff'
  },
  previewCard: {
    backgroundColor: '#f0fdf4',
    borderWidth: 1,
    borderColor: '#bbf7d0',
    borderRadius: radius.md,
    padding: spacing.sm,
    marginBottom: spacing.md
  },
  previewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6
  },
  previewTitle: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.primaryDark,
    letterSpacing: 0.6
  },
  liveTag: {
    backgroundColor: colors.primary,
    color: '#ffffff',
    fontSize: 8,
    fontWeight: '900',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 3
  },
  previewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between'
  },
  previewCellLabel: {
    fontSize: 9.5,
    color: colors.textMuted
  },
  previewCellVal: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.textMain
  },
  primaryBtn: {
    backgroundColor: colors.primary,
    height: 48,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.card
  },
  primaryBtnDisabled: {
    opacity: 0.7
  },
  primaryBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700'
  },
  errorBox: {
    backgroundColor: colors.errorLight,
    padding: spacing.sm,
    borderRadius: radius.sm,
    marginBottom: spacing.md
  },
  errorText: {
    color: colors.error,
    fontSize: 11.5,
    fontWeight: '600'
  },
  // Success ticket styles
  ticketCard: {
    backgroundColor: '#ffffff',
    borderRadius: radius.xl,
    padding: spacing.md,
    marginBottom: spacing.md,
    ...shadows.float
  },
  ticketHeader: {
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    paddingBottom: 8,
    marginBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  ticketBrand: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.primary,
    letterSpacing: 0.8
  },
  ticketId: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.textMain
  },
  ticketBody: {
    gap: 8
  },
  receiptRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  receiptLabel: {
    fontSize: 12,
    color: colors.textSecondary
  },
  receiptValue: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textMain
  },
  barcodeBox: {
    marginTop: 14,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    alignItems: 'center'
  },
  barcodeVisual: {
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 2,
    color: '#64748b'
  },
  barcodeText: {
    fontSize: 9,
    color: '#94a3b8',
    marginTop: 2
  },
  countdownCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: radius.md,
    padding: spacing.sm,
    marginBottom: spacing.md
  },
  countdownHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6
  },
  countdownTitle: {
    color: '#ffffff',
    fontSize: 12
  },
  countdownNum: {
    color: colors.gold,
    fontSize: 12,
    fontWeight: '800'
  },
  progressBarBg: {
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 2,
    overflow: 'hidden'
  },
  progressBarFill: {
    height: 4,
    backgroundColor: colors.gold
  }
});
