import React, { useState } from 'react';
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
import api, { setSession } from '../api/client';
import { colors, radius, spacing, shadows } from '../styles/theme';

const LOCATIONS = ['Coimbatore', 'Mamballi', 'Ramnagar', 'Dharmapuri'];

export default function RegisterScreen({ onRegisterSuccess, onGoLogin }) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [location, setLocation] = useState('Coimbatore');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleRegister = async () => {
    setError('');
    if (!name.trim()) {
      setError('Please enter your full name.');
      return;
    }
    if (!phone.trim()) {
      setError('Please enter your 10-digit phone number.');
      return;
    }
    if (!password || password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setLoading(true);
    try {
      const res = await api.post('/auth/register', {
        name: name.trim(),
        phone: phone.trim(),
        password,
        location,
        role: 'client'
      });

      const { token, user } = res.data;
      if (token && user) {
        setSession(token, user);
        onRegisterSuccess(token, user);
      } else {
        onGoLogin();
      }
    } catch (err) {
      const msg =
        err.response?.data?.message ||
        err.response?.data?.error ||
        'Registration failed. Please verify details and try again.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#123824" />
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <BrandLogo size={52} />
          <Text style={styles.title}>Register Farmer Account</Text>
          <Text style={styles.subtitle}>Join TrackNow to schedule cocoon pickups & live tracking</Text>
        </View>

        <View style={styles.card}>
          {/* Name Field */}
          <View style={styles.field}>
            <Text style={styles.label}>Full Name (Farmer / Sericulturist)</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Ramesh Kumar"
              placeholderTextColor={colors.textMuted}
              value={name}
              onChangeText={setName}
            />
          </View>

          {/* Phone Field */}
          <View style={styles.field}>
            <Text style={styles.label}>10-Digit Mobile Number</Text>
            <TextInput
              style={styles.input}
              placeholder="9876543210"
              placeholderTextColor={colors.textMuted}
              keyboardType="phone-pad"
              value={phone}
              onChangeText={setPhone}
            />
          </View>

          {/* Location Chips */}
          <View style={styles.field}>
            <Text style={styles.label}>Nearest Cocoon Market Center</Text>
            <View style={styles.chipRow}>
              {LOCATIONS.map((loc) => {
                const isSelected = location === loc;
                return (
                  <TouchableOpacity
                    key={loc}
                    style={[styles.chip, isSelected && styles.chipActive]}
                    onPress={() => setLocation(loc)}
                  >
                    <Text style={[styles.chipText, isSelected && styles.chipTextActive]}>
                      📍 {loc}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Password Field */}
          <View style={styles.field}>
            <Text style={styles.label}>Create Password (min 6 characters)</Text>
            <TextInput
              style={styles.input}
              placeholder="••••••••"
              placeholderTextColor={colors.textMuted}
              secureTextEntry
              value={password}
              onChangeText={setPassword}
            />
          </View>

          {error ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>⚠ {error}</Text>
            </View>
          ) : null}

          <TouchableOpacity
            style={[styles.btn, loading && styles.btnDisabled]}
            onPress={handleRegister}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#ffffff" size="small" />
            ) : (
              <Text style={styles.btnText}>✓ Complete Registration</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity style={styles.switchBox} onPress={onGoLogin}>
            <Text style={styles.switchText}>
              Already have an account? <Text style={styles.switchLink}>Sign In Here</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0d2217'
  },
  scrollContent: {
    padding: spacing.md,
    paddingVertical: spacing.lg
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing.md
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: '#ffffff',
    marginTop: spacing.sm
  },
  subtitle: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'center',
    marginTop: 4
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: radius.xl,
    padding: spacing.lg,
    ...shadows.float
  },
  field: {
    marginBottom: spacing.md
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary,
    marginBottom: 6
  },
  input: {
    backgroundColor: colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.sm + 4,
    height: 44,
    fontSize: 14,
    color: colors.textMain
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceSubtle
  },
  chipActive: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.primary
  },
  chipText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary
  },
  chipTextActive: {
    color: colors.primaryDark,
    fontWeight: '800'
  },
  errorBox: {
    backgroundColor: colors.errorLight,
    padding: spacing.sm,
    borderRadius: radius.sm,
    marginBottom: spacing.md
  },
  errorText: {
    color: colors.error,
    fontSize: 12,
    fontWeight: '600'
  },
  btn: {
    backgroundColor: colors.primary,
    height: 46,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6
  },
  btnDisabled: {
    opacity: 0.7
  },
  btnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700'
  },
  switchBox: {
    marginTop: spacing.md,
    alignItems: 'center'
  },
  switchText: {
    fontSize: 12,
    color: colors.textSecondary
  },
  switchLink: {
    color: colors.primary,
    fontWeight: '700'
  }
});
