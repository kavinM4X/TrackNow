import React, { useState, useEffect } from 'react';
import { View, Text, ActivityIndicator, StyleSheet, StatusBar } from 'react-native';

// Storage & API
import { getStoredUser, getToken } from './src/api/client';
import { hasUpcomingBooking } from './src/utils/bookingGate';

// Layout Components
import AppShell from './src/components/layout/AppShell';
import BottomNav from './src/components/layout/BottomNav';

// Screens
import LoginScreen from './src/screens/LoginScreen';
import RegisterScreen from './src/screens/RegisterScreen';
import BookingGateScreen from './src/screens/BookingGateScreen';
import DashboardScreen from './src/screens/DashboardScreen';
import BookingScreen from './src/screens/BookingScreen';
import BatchHistoryScreen from './src/screens/BatchHistoryScreen';
import BatchDetailScreen from './src/screens/BatchDetailScreen';
import TrackerScreen from './src/screens/TrackerScreen';
import SettingsScreen from './src/screens/SettingsScreen';

import { colors } from './src/styles/theme';

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Routing State
  const [authView, setAuthView] = useState('login'); // 'login' | 'register'
  const [inGate, setInGate] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard'); // 'dashboard' | 'booking' | 'history' | 'tracker' | 'settings'
  const [selectedBatchId, setSelectedBatchId] = useState(null);

  // Initialize Session on App Startup
  useEffect(() => {
    async function init() {
      const storedUser = getStoredUser();
      const token = getToken();
      if (token && storedUser) {
        setUser(storedUser);
        const hasBooking = await hasUpcomingBooking();
        setInGate(!hasBooking);
      }
      setLoading(false);
    }
    init();
  }, []);

  const handleLoginSuccess = (token, userData, hasBooking) => {
    setUser(userData);
    setInGate(!hasBooking);
    setActiveTab('dashboard');
  };

  const handleRegisterSuccess = (token, userData) => {
    setUser(userData);
    setInGate(true); // New user must complete booking gate
    setActiveTab('dashboard');
  };

  const handleLogout = () => {
    setUser(null);
    setInGate(false);
    setAuthView('login');
    setActiveTab('dashboard');
    setSelectedBatchId(null);
  };

  const handleSelectBatch = (batchId) => {
    setSelectedBatchId(batchId);
  };

  const handleBackFromBatch = () => {
    setSelectedBatchId(null);
  };

  const handleTabChange = (tabId) => {
    setSelectedBatchId(null);
    setActiveTab(tabId);
  };

  // Loading Screen
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Initializing TrackNow…</Text>
        <StatusBar barStyle="light-content" />
      </View>
    );
  }

  // Auth Flow (Logged Out)
  if (!user) {
    if (authView === 'register') {
      return (
        <>
          <RegisterScreen
            onRegisterSuccess={handleRegisterSuccess}
            onGoLogin={() => setAuthView('login')}
          />
          <StatusBar barStyle="light-content" />
        </>
      );
    }
    return (
      <>
        <LoginScreen
          onLoginSuccess={handleLoginSuccess}
          onGoRegister={() => setAuthView('register')}
        />
        <StatusBar barStyle="light-content" />
      </>
    );
  }

  // Pre-Dashboard Mandatory Booking Gatekeeper
  if (inGate) {
    return (
      <>
        <BookingGateScreen
          user={user}
          onCompleteGate={() => setInGate(false)}
        />
        <StatusBar barStyle="light-content" />
      </>
    );
  }

  // Main Authenticated Farmer Portal (Tab-Based AppShell)
  const getHeaderTitle = () => {
    if (selectedBatchId) return 'Batch Breakdown';
    switch (activeTab) {
      case 'dashboard':
        return 'Farmer Portal';
      case 'booking':
        return 'Book Pickup';
      case 'history':
        return 'Batch History';
      case 'tracker':
        return 'Live GPS Map';
      case 'settings':
        return 'Account Settings';
      default:
        return 'TrackNow';
    }
  };

  const renderActiveScreen = () => {
    if (selectedBatchId) {
      return (
        <BatchDetailScreen
          batchId={selectedBatchId}
          onBack={handleBackFromBatch}
        />
      );
    }

    switch (activeTab) {
      case 'dashboard':
        return (
          <DashboardScreen
            user={user}
            onNavigateTab={handleTabChange}
            onSelectBatch={handleSelectBatch}
          />
        );
      case 'booking':
        return <BookingScreen />;
      case 'history':
        return (
          <BatchHistoryScreen
            onSelectBatch={handleSelectBatch}
          />
        );
      case 'tracker':
        return <TrackerScreen />;
      case 'settings':
        return (
          <SettingsScreen
            user={user}
            onLogout={handleLogout}
          />
        );
      default:
        return (
          <DashboardScreen
            user={user}
            onNavigateTab={handleTabChange}
            onSelectBatch={handleSelectBatch}
          />
        );
    }
  };

  return (
    <View style={styles.appRoot}>
      <AppShell
        title={getHeaderTitle()}
        subtitle={activeTab === 'dashboard' ? 'Cocoon harvest logistics & real-time payout ledger' : null}
        user={user}
      >
        {renderActiveScreen()}
      </AppShell>

      {/* Floating Bottom Tab Bar (hidden when inspecting a full receipt) */}
      {!selectedBatchId && (
        <BottomNav
          activeTab={activeTab}
          onSelectTab={handleTabChange}
        />
      )}

      <StatusBar barStyle="light-content" />
    </View>
  );
}

const styles = StyleSheet.create({
  appRoot: {
    flex: 1,
    backgroundColor: colors.bg
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#0d2217',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12
  },
  loadingText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600'
  }
});
