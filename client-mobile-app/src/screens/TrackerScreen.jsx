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
import { deduplicatedGet } from '../api/client';
import { colors, radius, spacing, shadows } from '../styles/theme';

export default function TrackerScreen() {
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    deduplicatedGet('/tracker/my', {}, 10000)
      .then((res) => setConfig(res.data))
      .catch((err) => console.error('Tracker error:', err))
      .finally(() => setLoading(false));
  }, []);

  const enabled = config?.isEnabled;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header Banner */}
      <View style={styles.heroBanner}>
        <View>
          <Text style={styles.heroTitle}>📍 Driver GPS Live Radar</Text>
          <Text style={styles.heroSub}>Track your assigned cocoon pickup vehicle in real time</Text>
        </View>
        {enabled ? (
          <Badge status="live" label="LIVE GPS" />
        ) : (
          <Badge status="pending" label="STANDBY MODE" />
        )}
      </View>

      {loading ? (
        <ActivityIndicator color={colors.primary} size="large" style={{ marginVertical: 40 }} />
      ) : !enabled ? (
        /* Standby Card */
        <View style={styles.standbyCard}>
          <Text style={styles.standbyIcon}>🚚</Text>
          <Text style={styles.standbyTitle}>Tracking Standby Mode</Text>
          <Text style={styles.standbySub}>
            Live GPS telemetry automatically activates during your scheduled harvest booking pickup window once your driver is dispatched.
          </Text>

          <View style={styles.standbyTips}>
            <Text style={styles.tipItem}>✓ Driver location broadcasts every 10 seconds</Text>
            <Text style={styles.tipItem}>✓ Live ETA & route telemetry on pickup day</Text>
            <Text style={styles.tipItem}>✓ Direct driver contact hotline</Text>
          </View>
        </View>
      ) : (
        /* Live Telemetry View */
        <View style={styles.liveWrapper}>
          {/* Radar Visual */}
          <View style={styles.radarCard}>
            <View style={styles.radarScreen}>
              <View style={styles.radarRingOuter} />
              <View style={styles.radarRingMid} />
              <View style={styles.radarRingInner} />
              <View style={styles.radarDotPulse} />
              <Text style={styles.truckEmoji}>🚚</Text>
            </View>
            <View style={styles.radarOverlay}>
              <Text style={styles.radarVehicleName}>
                Vehicle: {config.vehicleId || 'TrackNow Logistics Fleet #04'}
              </Text>
              <Text style={styles.radarCoords}>
                LAT: {config.latitude?.toFixed(4) || '11.0168'}° N · LNG: {config.longitude?.toFixed(4) || '76.9558'}° E
              </Text>
            </View>
          </View>

          {/* Telemetry Stats Grid */}
          <View style={styles.telemetryGrid}>
            <View style={styles.telemetryBox}>
              <Text style={styles.telemLabel}>Speed</Text>
              <Text style={styles.telemVal}>38 km/h</Text>
            </View>
            <View style={styles.telemetryBox}>
              <Text style={styles.telemLabel}>Est. Arrival</Text>
              <Text style={styles.telemVal}>22 mins</Text>
            </View>
            <View style={styles.telemetryBox}>
              <Text style={styles.telemLabel}>Distance</Text>
              <Text style={styles.telemVal}>11.4 km</Text>
            </View>
          </View>

          {/* Driver Contact Box */}
          <View style={styles.driverBox}>
            <View style={styles.driverAvatar}>
              <Text style={styles.driverInitial}>D</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.driverName}>Assigned Driver: Murugan S.</Text>
              <Text style={styles.driverVehicle}>Tata Ace Mini Truck • TN-38-AX-9941</Text>
            </View>
            <TouchableOpacity style={styles.callBtn}>
              <Text style={styles.callBtnText}>📞 Call</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Support Info Box */}
      <View style={styles.supportBox}>
        <Text style={styles.supportTitle}>📞 Sericulture Logistics Dispatch</Text>
        <Text style={styles.supportSub}>Need route assistance or change of pickup location?</Text>
        <Text style={styles.supportPhone}>Toll Free: 1800-425-SILK (7455)</Text>
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
    marginTop: 2
  },
  standbyCard: {
    backgroundColor: '#ffffff',
    borderRadius: radius.xl,
    padding: spacing.xl,
    alignItems: 'center',
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.card
  },
  standbyIcon: {
    fontSize: 48,
    marginBottom: 8
  },
  standbyTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.textMain
  },
  standbySub: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 18
  },
  standbyTips: {
    backgroundColor: colors.surfaceSubtle,
    borderRadius: radius.md,
    padding: spacing.md,
    width: '100%',
    marginTop: spacing.md,
    gap: 6
  },
  tipItem: {
    fontSize: 11.5,
    color: colors.primaryDark,
    fontWeight: '600'
  },
  liveWrapper: {
    gap: spacing.md,
    marginBottom: spacing.md
  },
  radarCard: {
    backgroundColor: '#0f172a',
    borderRadius: radius.xl,
    overflow: 'hidden',
    ...shadows.float
  },
  radarScreen: {
    height: 220,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative'
  },
  radarRingOuter: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    borderWidth: 1,
    borderColor: 'rgba(52, 211, 153, 0.25)'
  },
  radarRingMid: {
    position: 'absolute',
    width: 130,
    height: 130,
    borderRadius: 65,
    borderWidth: 1,
    borderColor: 'rgba(52, 211, 153, 0.4)'
  },
  radarRingInner: {
    position: 'absolute',
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 1,
    borderColor: 'rgba(52, 211, 153, 0.7)'
  },
  radarDotPulse: {
    position: 'absolute',
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#34d399'
  },
  truckEmoji: {
    fontSize: 28
  },
  radarOverlay: {
    backgroundColor: 'rgba(15, 23, 42, 0.95)',
    padding: spacing.sm + 2,
    borderTopWidth: 1,
    borderTopColor: '#334155'
  },
  radarVehicleName: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#ffffff'
  },
  radarCoords: {
    fontSize: 10,
    color: '#34d399',
    marginTop: 2
  },
  telemetryGrid: {
    flexDirection: 'row',
    gap: 8
  },
  telemetryBox: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: radius.md,
    padding: spacing.sm + 2,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center'
  },
  telemLabel: {
    fontSize: 10,
    color: colors.textMuted
  },
  telemVal: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.primaryDark,
    marginTop: 2
  },
  driverBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: radius.md,
    padding: spacing.sm + 4,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 10
  },
  driverAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center'
  },
  driverInitial: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.primaryDark
  },
  driverName: {
    fontSize: 12.5,
    fontWeight: '700',
    color: colors.textMain
  },
  driverVehicle: {
    fontSize: 10.5,
    color: colors.textMuted,
    marginTop: 1
  },
  callBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.sm
  },
  callBtnText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '700'
  },
  supportBox: {
    backgroundColor: '#ffffff',
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border
  },
  supportTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.textMain
  },
  supportSub: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2
  },
  supportPhone: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primaryDark,
    marginTop: 4
  }
});
