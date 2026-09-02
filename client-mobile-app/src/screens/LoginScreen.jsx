import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  StatusBar,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import BrandLogo from '../components/common/BrandLogo';
import api, { setSession } from '../api/client';
import { hasUpcomingBooking } from '../utils/bookingGate';
import { colors, radius, spacing, shadows } from '../styles/theme';

export default function LoginScreen({ onLoginSuccess, onGoRegister }) {
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async () => {
    setError('');
    const trimmedPhone = phone.trim();
    if (!trimmedPhone) {
      setError('Please enter your 10-digit registered phone number.');
      return;
    }
    if (!password) {
      setError('Please enter your password.');
      return;
    }

    setLoading(true);
    try {
      const res = await api.post('/auth/login', {
        phone: trimmedPhone,
        password: password
      });

      const { token, user } = res.data;
      if (!token || !user) throw new Error('Invalid login response');

      if (user.role === 'admin') {
        setError('Please use the Admin Portal app to sign in as an administrator.');
        setLoading(false);
        return;
      }

      setSession(token, user);
      try {
        await api.post('/logs', { action: 'logged in', type: 'login', page: 'login' });
      } catch {
        /* ignore */
      }

      const hasBooking = await hasUpcomingBooking();
      onLoginSuccess(token, user, hasBooking);
    } catch (err) {
      const serverMsg = err.response?.data?.message || err.response?.data?.error;
      const status = err.response?.status;
      
      let msg = 'Could not connect to TrackNow server. Please check your network connection.';
      if (serverMsg) {
        msg = serverMsg === 'Invalid credentials'
          ? 'Invalid phone number or password. Please check your phone and password.'
          : serverMsg;
      } else if (status === 401) {
        msg = 'Invalid phone number or password. Please check your phone and password.';
      }
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#123824" />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          {/* Header Branding */}
          <View style={styles.brandHero}>
            <BrandLogo size={74} style={{ marginBottom: spacing.md }} />
            <Text style={styles.brandTitle}>TrackNow</Text>
            <View style={styles.portalBadge}>
              <Text style={styles.portalBadgeText}>FARMER PORTAL</Text>
            </View>
            <Text style={styles.brandSub}>
              Sericulture Logistics, Live Harvest Pickup Tracking & Payout Ledger
            </Text>
          </View>

          {/* Form Card */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>🔑 Sign In to Your Account</Text>

            {/* Phone Input */}
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Registered Phone Number</Text>
              <View style={styles.inputWrap}>
                <Text style={styles.inputPrefix}>📞</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter 10-digit phone"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="phone-pad"
                  value={phone}
                  onChangeText={setPhone}
                  autoCapitalize="none"
                />
              </View>
            </View>

            {/* Password Input */}
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Password</Text>
              <View style={styles.inputWrap}>
                <Text style={styles.inputPrefix}>🔒</Text>
                <TextInput
                  style={[styles.input, { flex: 1 }]}
                  placeholder="••••••••"
                  placeholderTextColor={colors.textMuted}
                  secureTextEntry={!showPassword}
                  value={password}
                  onChangeText={setPassword}
                  autoCapitalize="none"
                />
                <TouchableOpacity
                  style={styles.eyeBtn}
                  onPress={() => setShowPassword(!showPassword)}
                  activeOpacity={0.7}
                >
                  <Text style={{ fontSize: 16 }}>{showPassword ? '🙈' : '👁️'}</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Error Message */}
            {error ? (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>⚠ {error}</Text>
              </View>
            ) : null}

            {/* Submit Button */}
            <TouchableOpacity
              style={[styles.submitBtn, loading && styles.submitBtnDisabled]}
              onPress={handleLogin}
              disabled={loading}
              activeOpacity={0.8}
            >
              {loading ? (
                <View style={styles.loadingRow}>
                  <ActivityIndicator size="small" color="#ffffff" />
                  <Text style={styles.submitBtnText}>Authenticating Account…</Text>
                </View>
              ) : (
                <Text style={styles.submitBtnText}>✓ Sign In to Portal</Text>
              )}
            </TouchableOpacity>

            {/* Register link */}
            <TouchableOpacity
              style={styles.signupBox}
              onPress={onGoRegister}
              activeOpacity={0.7}
            >
              <Text style={styles.signupText}>
                Don't have a farmer account yet?{' '}
                <Text style={styles.signupLink}>Register New →</Text>
              </Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.footerNote}>
            🔒 Secured with TrackNow Master Cluster Sericulture Protocol
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0d2217'
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: spacing.md,
    paddingVertical: spacing.xl
  },
  brandHero: {
    alignItems: 'center',
    marginBottom: spacing.lg
  },
  brandTitle: {
    fontSize: 28,
    fontWeight: '900',
    color: '#ffffff',
    letterSpacing: -0.5
  },
  portalBadge: {
    backgroundColor: 'rgba(52, 211, 153, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(52, 211, 153, 0.3)',
    borderRadius: radius.full,
    paddingHorizontal: 12,
    paddingVertical: 3,
    marginTop: 4,
    marginBottom: 8
  },
  portalBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#34d399',
    letterSpacing: 1
  },
  brandSub: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'center',
    maxWidth: 290,
    lineHeight: 18
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: radius.xl,
    padding: spacing.lg,
    ...shadows.float
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.textMain,
    marginBottom: spacing.md
  },
  fieldGroup: {
    marginBottom: spacing.md
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 6
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
  inputPrefix: {
    fontSize: 15,
    marginRight: 8
  },
  input: {
    flex: 1,
    height: 46,
    fontSize: 14,
    color: colors.textMain,
    paddingVertical: 0
  },
  eyeBtn: {
    padding: 6
  },
  errorBox: {
    backgroundColor: colors.errorLight,
    borderWidth: 1,
    borderColor: '#fca5a5',
    borderRadius: radius.md,
    padding: spacing.sm + 2,
    marginBottom: spacing.md
  },
  errorText: {
    fontSize: 12,
    color: colors.error,
    fontWeight: '600',
    lineHeight: 16
  },
  submitBtn: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
    ...shadows.card
  },
  submitBtnDisabled: {
    opacity: 0.7
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  submitBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#ffffff'
  },
  signupBox: {
    marginTop: spacing.md,
    alignItems: 'center',
    paddingVertical: 4
  },
  signupText: {
    fontSize: 12,
    color: colors.textSecondary
  },
  signupLink: {
    color: colors.primary,
    fontWeight: '700'
  },
  footerNote: {
    marginTop: spacing.lg,
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.45)',
    textAlign: 'center'
  }
});
