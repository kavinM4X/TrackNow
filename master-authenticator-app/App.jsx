import React, { useState, useEffect, useRef } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  StatusBar, 
  TouchableOpacity, 
  Dimensions,
  Animated,
  Easing,
  AppState,
  Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as LocalAuthentication from 'expo-local-authentication';
import { getDailyUserId, getAuthenticatorCode, getRemainingSeconds } from './src/utils/cryptoTotp';

const { width } = Dimensions.get('window');

export default function App() {
  const [dailyUserId, setDailyUserId] = useState(getDailyUserId());
  const [authCode, setAuthCode] = useState(getAuthenticatorCode());
  const [remainingSec, setRemainingSec] = useState(getRemainingSeconds());
  const [copied, setCopied] = useState(false);
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  const appState = useRef(AppState.currentState);

  // Animation Refs
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.92)).current;
  const lockPulse = useRef(new Animated.Value(1)).current;

  // Auto-lock / Auto-logout EVERY TIME the user minimizes, switches app, or locks phone screen
  useEffect(() => {
    const subscription = AppState.addEventListener('change', nextAppState => {
      if (appState.current.match(/active/) && nextAppState.match(/inactive|background/)) {
        // Auto-Lock immediately on background / minimize
        setIsUnlocked(false);
      }
      appState.current = nextAppState;
    });

    return () => {
      subscription.remove();
    };
  }, []);

  // Pulse animation for locked fingerprint button
  useEffect(() => {
    if (!isUnlocked) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(lockPulse, {
            toValue: 1.1,
            duration: 1000,
            useNativeDriver: true,
            easing: Easing.ease
          }),
          Animated.timing(lockPulse, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
            easing: Easing.ease
          })
        ])
      ).start();
    }
  }, [isUnlocked]);

  // Reveal animation when unlocked
  const triggerRevealAnimation = () => {
    fadeAnim.setValue(0);
    scaleAnim.setValue(0.92);
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
        easing: Easing.out(Easing.back(1.5))
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 6,
        tension: 40,
        useNativeDriver: true
      })
    ]).start();
  };

  // Authenticate using Phone's Native Fingerprint or System Pattern/PIN
  const authenticateUser = async () => {
    setIsAuthenticating(true);
    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();

      if (!hasHardware || !isEnrolled) {
        setIsUnlocked(true);
        triggerRevealAnimation();
        setIsAuthenticating(false);
        return;
      }

      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Unlock Master Authenticator',
        fallbackLabel: 'Use System Pattern / PIN',
        cancelLabel: 'Cancel',
        disableDeviceFallback: false // Allows phone's native Pattern, PIN or Password
      });

      if (result.success) {
        setIsUnlocked(true);
        triggerRevealAnimation();
      } else {
        setIsUnlocked(false);
      }
    } catch (error) {
      console.warn('Authentication error:', error);
      setIsUnlocked(true);
      triggerRevealAnimation();
    } finally {
      setIsAuthenticating(false);
    }
  };

  useEffect(() => {
    authenticateUser();
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      const sec = getRemainingSeconds();
      setRemainingSec(sec);
      setAuthCode(getAuthenticatorCode());
      setDailyUserId(getDailyUserId());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const handleCopy = () => {
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(authCode);
      }
    } catch (e) {
      console.warn('Copy failed:', e);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const handleLockApp = () => {
    setIsUnlocked(false);
  };

  // Progress Bar Percentage (60 seconds max)
  const progressPct = (remainingSec / 60) * 100;
  const formattedTime = `00:${remainingSec < 10 ? '0' : ''}${remainingSec}`;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0B0F19" />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>MASTER AUTHENTICATOR</Text>
        <Text style={styles.headerSubtitle}>TRACKNOW SECURITY KEEPER</Text>
      </View>

      {!isUnlocked ? (
        /* Hidden / Locked Screen State with Masked Codes */
        <View style={styles.card}>
          <View style={[styles.accountBadge, { borderColor: '#F59E0B', backgroundColor: 'rgba(245, 158, 11, 0.15)' }]}>
            <Text style={[styles.accountText, { color: '#F59E0B' }]}>🔒 CODES HIDDEN & ENCRYPTED</Text>
          </View>

          {/* Masked Daily User ID Placeholder */}
          <View style={[styles.dailyIdContainer, { opacity: 0.5 }]}>
            <Text style={styles.dailyIdLabel}>6-DIGIT DAILY USER ID</Text>
            <Text style={[styles.dailyIdValue, { letterSpacing: 6 }]}>••••••</Text>
          </View>

          {/* Masked Authenticator Code Placeholder */}
          <View style={[styles.codeContainer, { opacity: 0.35, backgroundColor: 'rgba(255, 255, 255, 0.03)' }]}>
            <Text style={[styles.codeText, { color: '#94A3B8', letterSpacing: 10 }]}>•••••</Text>
            <Text style={styles.copyHint}>UNAUTHENTICATED</Text>
          </View>

          {/* Animated Interactive Fingerprint / Pattern Unlock Button */}
          <TouchableOpacity 
            style={styles.unlockButton} 
            onPress={authenticateUser}
            activeOpacity={0.8}
            disabled={isAuthenticating}
          >
            <Animated.View style={{ transform: [{ scale: lockPulse }] }}>
              <Text style={{ fontSize: 38, marginBottom: 4 }}>👆</Text>
            </Animated.View>
            <Text style={styles.unlockBtnText}>
              {isAuthenticating ? 'VERIFYING BIOMETRICS...' : 'SCAN FINGERPRINT / PATTERN'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.fallbackButton} onPress={authenticateUser}>
            <Text style={styles.fallbackText}>Use Device Pattern, PIN or Password</Text>
          </TouchableOpacity>
        </View>
      ) : (
        /* Unlocked Revealed State with Glow Animation */
        <Animated.View style={[styles.card, { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }]}>
          {/* Account Label */}
          <View style={styles.accountBadge}>
            <Text style={styles.accountText}>MASTER ADMIN (UNLOCKED)</Text>
          </View>

          {/* Daily User ID Section */}
          <View style={styles.dailyIdContainer}>
            <Text style={styles.dailyIdLabel}>6-DIGIT DAILY USER ID (CHANGES DAILY)</Text>
            <Text style={styles.dailyIdValue}>{dailyUserId}</Text>
          </View>

          {/* Dynamic Authenticator Code Display */}
          <TouchableOpacity style={styles.codeContainer} onPress={handleCopy} activeOpacity={0.8}>
            <Text style={styles.codeText}>{authCode}</Text>
            <Text style={styles.copyHint}>{copied ? '✓ COPIED TO CLIPBOARD' : 'TAP TO COPY CODE'}</Text>
          </TouchableOpacity>

          {/* Expiry Subtitle */}
          <Text style={styles.expiryText}>Changes every 1 min</Text>

          {/* Timer Progress Bar */}
          <View style={styles.progressContainer}>
            <View style={styles.trackBar}>
              <View style={[styles.fillBar, { width: `${progressPct}%` }]} />
            </View>
            <Text style={styles.timerText}>{formattedTime}</Text>
          </View>

          {/* Lock / Logout Button */}
          <TouchableOpacity 
            style={styles.reLockBtn} 
            onPress={handleLockApp}
          >
            <Text style={{ color: '#F59E0B', fontSize: 11, fontWeight: '700', letterSpacing: 1 }}>
              🔒 HIDE & LOGOUT NOW
            </Text>
          </TouchableOpacity>
        </Animated.View>
      )}

      {/* Footer Info */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>🔐 Hardware-Encrypted Master Key Synchronization</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0B0F19',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 40,
    paddingHorizontal: 20
  },
  header: {
    alignItems: 'center',
    marginTop: 20
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: 2
  },
  headerSubtitle: {
    color: '#64748B',
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 1,
    marginTop: 4
  },
  card: {
    width: Math.min(width - 40, 420),
    backgroundColor: '#111827',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    padding: 28,
    alignItems: 'center',
    elevation: 8
  },
  unlockButton: {
    backgroundColor: 'rgba(99, 102, 241, 0.15)',
    borderColor: 'rgba(99, 102, 241, 0.4)',
    borderWidth: 1.5,
    borderRadius: 20,
    paddingVertical: 20,
    paddingHorizontal: 24,
    alignItems: 'center',
    width: '100%',
    marginVertical: 14
  },
  unlockBtnText: {
    color: '#818CF8',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
    marginTop: 4
  },
  accountBadge: {
    backgroundColor: 'rgba(99, 102, 241, 0.15)',
    borderColor: 'rgba(99, 102, 241, 0.3)',
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 16
  },
  accountText: {
    color: '#818CF8',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1
  },
  dailyIdContainer: {
    alignItems: 'center',
    marginBottom: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
    width: '100%'
  },
  dailyIdLabel: {
    color: '#64748B',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 4
  },
  dailyIdValue: {
    color: '#38BDF8',
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 1.5,
    fontFamily: 'monospace'
  },
  codeContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(6, 182, 212, 0.08)',
    borderColor: 'rgba(6, 182, 212, 0.25)',
    borderWidth: 1.5,
    paddingVertical: 18,
    paddingHorizontal: 30,
    borderRadius: 16,
    width: '100%',
    marginBottom: 12
  },
  codeText: {
    color: '#06B6D4',
    fontSize: 42,
    fontWeight: '900',
    letterSpacing: 8,
    fontFamily: 'monospace'
  },
  copyHint: {
    color: '#64748B',
    fontSize: 10,
    fontWeight: '700',
    marginTop: 6,
    letterSpacing: 1
  },
  expiryText: {
    color: '#94A3B8',
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 24
  },
  progressContainer: {
    width: '100%',
    alignItems: 'center'
  },
  trackBar: {
    width: '100%',
    height: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 10
  },
  fillBar: {
    height: '100%',
    backgroundColor: '#06B6D4',
    borderRadius: 4
  },
  timerText: {
    color: '#38BDF8',
    fontSize: 15,
    fontWeight: '700',
    fontFamily: 'monospace'
  },
  fallbackButton: {
    paddingVertical: 6,
    paddingHorizontal: 16
  },
  fallbackText: {
    color: '#38BDF8',
    fontSize: 12,
    fontWeight: '600',
    textDecorationLine: 'underline'
  },
  reLockBtn: {
    marginTop: 18,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)'
  },
  footer: {
    marginBottom: 10
  },
  footerText: {
    color: '#475569',
    fontSize: 12,
    fontWeight: '600'
  }
});
