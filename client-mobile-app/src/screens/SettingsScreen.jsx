import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert
} from 'react-native';
import BrandLogo from '../components/common/BrandLogo';
import { clearSession } from '../api/client';
import { colors, radius, spacing, shadows } from '../styles/theme';

const LANGUAGES = [
  { code: 'en', label: 'English', native: 'English' },
  { code: 'ta', label: 'Tamil', native: 'தமிழ்' },
  { code: 'kn', label: 'Kannada', native: 'ಕನ್ನಡ' }
];

export default function SettingsScreen({ user, onLogout }) {
  const [selectedLang, setSelectedLang] = useState('en');

  const handleLogoutPress = () => {
    clearSession();
    onLogout();
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Profile Card */}
      <View style={styles.profileCard}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{user?.name?.[0]?.toUpperCase() || 'F'}</Text>
        </View>
        <View style={styles.profileInfo}>
          <Text style={styles.profileName}>{user?.name || 'Farmer Account'}</Text>
          <Text style={styles.profilePhone}>📱 +91 {user?.phone || 'Not available'}</Text>
          <View style={styles.roleBadge}>
            <Text style={styles.roleBadgeText}>VERIFIED SERICULTURIST</Text>
          </View>
        </View>
      </View>

      {/* Language Preferences */}
      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>🌐 Language Preference</Text>
        <Text style={styles.sectionSub}>Select portal display language</Text>

        <View style={styles.langGrid}>
          {LANGUAGES.map((lang) => {
            const isSelected = selectedLang === lang.code;
            return (
              <TouchableOpacity
                key={lang.code}
                style={[styles.langBtn, isSelected && styles.langBtnActive]}
                onPress={() => setSelectedLang(lang.code)}
                activeOpacity={0.7}
              >
                <Text style={[styles.langLabel, isSelected && styles.langLabelActive]}>
                  {lang.native}
                </Text>
                <Text style={[styles.langSub, isSelected && styles.langSubActive]}>
                  {lang.label}
                </Text>
                {isSelected && <Text style={styles.checkIcon}>✓</Text>}
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* System & Support */}
      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>ℹ️ Sericulture Cluster Info</Text>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Platform</Text>
          <Text style={styles.infoVal}>TrackNow Mobile 2.0</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Protocol</Text>
          <Text style={styles.infoVal}>Cluster-Direct IoT Telemetry</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Assigned Market</Text>
          <Text style={styles.infoVal}>📍 {user?.location || 'Coimbatore'} Hub</Text>
        </View>
      </View>

      {/* Logout Button */}
      <TouchableOpacity
        style={styles.logoutBtn}
        onPress={handleLogoutPress}
        activeOpacity={0.8}
      >
        <Text style={styles.logoutText}>🚪 Sign Out from Farmer Account</Text>
      </TouchableOpacity>

      <View style={styles.footerBranding}>
        <BrandLogo size={32} />
        <Text style={styles.footerBrandText}>TrackNow Mobile • Built for Silk Farmers</Text>
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
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: radius.xl,
    padding: spacing.md,
    marginBottom: spacing.md,
    ...shadows.card
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.primaryLight,
    borderWidth: 2,
    borderColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12
  },
  avatarText: {
    fontSize: 22,
    fontWeight: '900',
    color: colors.primaryDark
  },
  profileInfo: {
    flex: 1
  },
  profileName: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.textMain
  },
  profilePhone: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2
  },
  roleBadge: {
    backgroundColor: colors.primaryLight,
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.full,
    marginTop: 5
  },
  roleBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: colors.primaryDark,
    letterSpacing: 0.5
  },
  sectionCard: {
    backgroundColor: '#ffffff',
    borderRadius: radius.xl,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.card
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.textMain
  },
  sectionSub: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
    marginBottom: 10
  },
  langGrid: {
    gap: 6
  },
  langBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.sm + 2
  },
  langBtnActive: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.primary
  },
  langLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textMain,
    flex: 1
  },
  langLabelActive: {
    color: colors.primaryDark,
    fontWeight: '800'
  },
  langSub: {
    fontSize: 11,
    color: colors.textMuted,
    marginRight: 8
  },
  langSubActive: {
    color: colors.primary
  },
  checkIcon: {
    fontSize: 15,
    fontWeight: '900',
    color: colors.primary
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9'
  },
  infoLabel: {
    fontSize: 11.5,
    color: colors.textSecondary
  },
  infoVal: {
    fontSize: 11.5,
    fontWeight: '700',
    color: colors.textMain
  },
  logoutBtn: {
    backgroundColor: colors.errorLight,
    borderWidth: 1,
    borderColor: '#fca5a5',
    borderRadius: radius.md,
    height: 46,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
    marginBottom: spacing.md
  },
  logoutText: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.error
  },
  footerBranding: {
    alignItems: 'center',
    gap: 6,
    marginVertical: spacing.md
  },
  footerBrandText: {
    fontSize: 10.5,
    color: colors.textMuted
  }
});
