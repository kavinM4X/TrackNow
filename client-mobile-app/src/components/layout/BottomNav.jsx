import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { colors, spacing, shadows } from '../../styles/theme';

export const TABS = [
  { id: 'dashboard', label: 'Dashboard', icon: '📊' },
  { id: 'booking', label: 'Book Pickup', icon: '📦' },
  { id: 'history', label: 'Batches', icon: '📜' },
  { id: 'tracker', label: 'Live Map', icon: '📍' },
  { id: 'settings', label: 'Settings', icon: '⚙️' }
];

export default function BottomNav({ activeTab, onSelectTab }) {
  return (
    <View style={styles.container} pointerEvents="box-none">
      <View style={styles.navBar} pointerEvents="auto">
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <TouchableOpacity
              key={tab.id}
              style={[styles.tabBtn, isActive && styles.tabBtnActive]}
              onPress={() => onSelectTab(tab.id)}
              activeOpacity={0.7}
            >
              <Text style={[styles.tabIcon, isActive && styles.tabIconActive]}>
                {tab.icon}
              </Text>
              <Text style={[styles.tabLabel, isActive && styles.tabLabelActive]}>
                {tab.label}
              </Text>
              {isActive && <View style={styles.activePill} />}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'transparent',
    paddingBottom: Platform.OS === 'ios' ? 24 : 10,
    paddingHorizontal: spacing.sm,
    zIndex: 9999,
    elevation: 20
  },
  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: '#ffffff',
    borderRadius: 24,
    paddingVertical: spacing.xs + 2,
    paddingHorizontal: spacing.xs,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    ...shadows.float
  },
  tabBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 16,
    minWidth: 54,
    position: 'relative',
    cursor: 'pointer'
  },
  tabBtnActive: {
    backgroundColor: colors.primaryLight
  },
  tabIcon: {
    fontSize: 18,
    marginBottom: 2,
    opacity: 0.7
  },
  tabIconActive: {
    opacity: 1,
    transform: [{ scale: 1.1 }]
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.textMuted
  },
  tabLabelActive: {
    color: colors.primaryDark,
    fontWeight: '800'
  },
  activePill: {
    position: 'absolute',
    bottom: 2,
    width: 14,
    height: 3,
    borderRadius: 2,
    backgroundColor: colors.primary
  }
});
