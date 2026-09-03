import React from 'react';
import { View, Text, StyleSheet, StatusBar, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import BrandLogo from '../common/BrandLogo';
import { colors, spacing } from '../../styles/theme';

export default function AppShell({ title, subtitle, user, children }) {
  const firstName = user?.name?.split(' ')[0] || 'Farmer';

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#1b4d32" />
      
      {/* Top Brand Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <BrandLogo size={36} />
          <View style={styles.headerTitles}>
            <View style={styles.badgeRow}>
              <View style={styles.greenPulseDot} />
              <Text style={styles.badgeText}>FARMER PORTAL</Text>
            </View>
            <Text style={styles.headerMainTitle}>{title || 'TrackNow'}</Text>
          </View>
        </View>

        <View style={styles.headerRight}>
          <View style={styles.userChip}>
            <Text style={styles.userAvatarText}>{firstName[0]?.toUpperCase()}</Text>
            <View style={styles.userInfo}>
              <Text style={styles.userName} numberOfLines={1}>{firstName}</Text>
              <Text style={styles.userRole}>Sericulturist</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Subtitle / context bar if provided */}
      {subtitle ? (
        <View style={styles.subtitleBar}>
          <Text style={styles.subtitleText}>{subtitle}</Text>
        </View>
      ) : null}

      {/* Screen Body */}
      <View style={styles.body}>
        {children}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.bg,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight || 0 : 0
  },
  header: {
    backgroundColor: '#1b4d32',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 4,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)'
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm + 2
  },
  headerTitles: {
    justifyContent: 'center'
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4
  },
  greenPulseDot: {
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
  headerMainTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: -0.3
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  userChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: 20,
    gap: 6
  },
  userAvatarText: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.gold,
    color: '#000000',
    fontSize: 11,
    fontWeight: '800',
    textAlign: 'center',
    lineHeight: 22
  },
  userInfo: {
    maxWidth: 70
  },
  userName: {
    fontSize: 11,
    fontWeight: '700',
    color: '#ffffff'
  },
  userRole: {
    fontSize: 8.5,
    color: 'rgba(255, 255, 255, 0.65)'
  },
  subtitleBar: {
    backgroundColor: '#123824',
    paddingHorizontal: spacing.md,
    paddingVertical: 5
  },
  subtitleText: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.75)',
    fontWeight: '500'
  },
  body: {
    flex: 1,
    backgroundColor: colors.bg
  }
});
