import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet
} from 'react-native';
import {
  addMonths,
  subMonths,
  format,
  isBefore,
  startOfDay,
  parseISO,
  isSameMonth,
  startOfMonth,
  endOfMonth
} from 'date-fns';
import { colors, radius, spacing, shadows } from '../../styles/theme';

export default function DatePickerCalendar({ selectedDate, onSelectDate }) {
  const today = startOfDay(new Date());
  const todayISO = format(today, 'yyyy-MM-dd');

  // Month navigation state - Default is current month of selectedDate or Today
  const initialDate = selectedDate ? parseISO(selectedDate) : today;
  const [currentMonth, setCurrentMonth] = useState(startOfMonth(initialDate));

  // Can go back month? Only if currentMonth is after today's month
  const isCurrentMonth = isSameMonth(currentMonth, today);
  const canGoPrevMonth = !isCurrentMonth && !isBefore(currentMonth, startOfMonth(today));

  const handlePrevMonth = () => {
    if (canGoPrevMonth) {
      setCurrentMonth(subMonths(currentMonth, 1));
    }
  };

  const handleNextMonth = () => {
    setCurrentMonth(addMonths(currentMonth, 1));
  };

  // Calculate full month grid
  const startDayOfWeek = startOfMonth(currentMonth).getDay(); // 0 = Sun
  const totalDaysInMonth = endOfMonth(currentMonth).getDate();

  const monthGrid = [];
  // Empty leading slots before 1st of month
  for (let i = 0; i < startDayOfWeek; i++) {
    monthGrid.push(null);
  }
  // Days of current month
  for (let d = 1; d <= totalDaysInMonth; d++) {
    const dateObj = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), d);
    const iso = format(dateObj, 'yyyy-MM-dd');
    const isPast = isBefore(startOfDay(dateObj), today);
    monthGrid.push({ date: dateObj, dayNum: d, iso, isPast });
  }

  const handleDayPress = (iso, isPast) => {
    if (isPast) return; // Strictly block past days
    onSelectDate(iso);
  };

  return (
    <View style={styles.container}>
      {/* Header Title */}
      <View style={styles.headerRow}>
        <Text style={styles.headerTitle}>📅 Pickup Date Calendar</Text>
        <Text style={styles.headerSub}>Present & Future Days Only</Text>
      </View>

      {/* Selected Date Banner */}
      <View style={styles.selectedBanner}>
        <Text style={styles.selectedBannerLabel}>Selected Date:</Text>
        <Text style={styles.selectedBannerValue}>
          🗓️ {selectedDate ? format(parseISO(selectedDate), 'EEEE, d MMMM yyyy') : 'Select Date'}
        </Text>
      </View>

      {/* FULL MONTH CALENDAR CARD (DEFAULT VIEW) */}
      <View style={styles.monthCard}>
        {/* Month Header Navigation (◀ Month Year ▶) */}
        <View style={styles.monthNavRow}>
          <TouchableOpacity
            style={[styles.navArrowBtn, !canGoPrevMonth && styles.navArrowBtnDisabled]}
            onPress={handlePrevMonth}
            disabled={!canGoPrevMonth}
          >
            <Text style={[styles.navArrowText, !canGoPrevMonth && styles.navArrowTextDisabled]}>
              ◀ Prev
            </Text>
          </TouchableOpacity>

          <Text style={styles.monthYearTitle}>
            {format(currentMonth, 'MMMM yyyy')}
          </Text>

          <TouchableOpacity style={styles.navArrowBtn} onPress={handleNextMonth}>
            <Text style={styles.navArrowText}>Next ▶</Text>
          </TouchableOpacity>
        </View>

        {/* Weekday Labels (Sun to Sat) */}
        <View style={styles.weekHeader}>
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
            <Text key={day} style={styles.weekLabel}>{day}</Text>
          ))}
        </View>

        {/* Month Days Grid */}
        <View style={styles.daysGrid}>
          {monthGrid.map((item, idx) => {
            if (!item) {
              return <View key={`empty-${idx}`} style={styles.emptyGridCell} />;
            }
            const isSelected = selectedDate === item.iso;
            const isTodayDate = item.iso === todayISO;

            return (
              <TouchableOpacity
                key={item.iso}
                style={[
                  styles.dayCell,
                  item.isPast && styles.dayCellPast,
                  isTodayDate && styles.dayCellToday,
                  isSelected && styles.dayCellSelected
                ]}
                onPress={() => handleDayPress(item.iso, item.isPast)}
                disabled={item.isPast}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.dayNum,
                    item.isPast && styles.dayNumPast,
                    isTodayDate && styles.dayNumToday,
                    isSelected && styles.dayNumSelected
                  ]}
                >
                  {item.dayNum}
                </Text>
                {isTodayDate && !isSelected ? <View style={styles.todayIndicatorDot} /> : null}
                {isSelected ? <View style={styles.selectedIndicatorDot} /> : null}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Legend */}
        <View style={styles.legendRow}>
          <View style={styles.legendItem}>
            <View style={[styles.legendBox, { backgroundColor: colors.primary }]} />
            <Text style={styles.legendText}>Selected Date</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendBox, { borderWidth: 1.5, borderColor: colors.primary }]} />
            <Text style={styles.legendText}>Today</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendBox, { backgroundColor: '#e2e8f0', opacity: 0.5 }]} />
            <Text style={styles.legendText}>Past (Disabled)</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.md
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 6
  },
  headerTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.textMain
  },
  headerSub: {
    fontSize: 10,
    color: colors.primary,
    fontWeight: '700'
  },
  selectedBanner: {
    backgroundColor: '#f0fdf4',
    borderWidth: 1,
    borderColor: '#bbf7d0',
    borderRadius: radius.md,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 8,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  selectedBannerLabel: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '600'
  },
  selectedBannerValue: {
    fontSize: 12.5,
    fontWeight: '800',
    color: colors.primaryDark
  },
  monthCard: {
    backgroundColor: '#ffffff',
    borderRadius: radius.xl,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.card
  },
  monthNavRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm + 4,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9'
  },
  monthYearTitle: {
    fontSize: 15,
    fontWeight: '900',
    color: colors.textMain
  },
  navArrowBtn: {
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.sm
  },
  navArrowBtnDisabled: {
    backgroundColor: colors.surfaceSubtle,
    opacity: 0.5
  },
  navArrowText: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.primaryDark
  },
  navArrowTextDisabled: {
    color: colors.textMuted
  },
  weekHeader: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 6
  },
  weekLabel: {
    width: 36,
    textAlign: 'center',
    fontSize: 10.5,
    fontWeight: '800',
    color: colors.textMuted
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start'
  },
  dayCell: {
    width: '14.28%',
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.sm,
    marginVertical: 2
  },
  emptyGridCell: {
    width: '14.28%',
    height: 40
  },
  dayCellPast: {
    opacity: 0.35,
    backgroundColor: '#f8fafc'
  },
  dayCellToday: {
    borderWidth: 1.5,
    borderColor: colors.primary
  },
  dayCellSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primaryDark
  },
  dayNum: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textMain
  },
  dayNumPast: {
    color: colors.textMuted,
    textDecorationLine: 'line-through'
  },
  dayNumToday: {
    color: colors.primaryDark,
    fontWeight: '900'
  },
  dayNumSelected: {
    color: '#ffffff',
    fontWeight: '900'
  },
  todayIndicatorDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.primary,
    marginTop: 2
  },
  selectedIndicatorDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.gold,
    marginTop: 2
  },
  legendRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 14,
    marginTop: 12,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9'
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4
  },
  legendBox: {
    width: 10,
    height: 10,
    borderRadius: 2
  },
  legendText: {
    fontSize: 10,
    color: colors.textMuted
  }
});
