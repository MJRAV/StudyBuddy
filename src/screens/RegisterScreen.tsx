import { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ensureUserProfile, isSupabaseConfigured, supabase } from '../lib/supabase';
import { AppButton, AppInput, Card, Heading, Screen, Subheading } from '../ui/components';
import { colors } from '../ui/theme';

type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
};

type Props = NativeStackScreenProps<AuthStackParamList, 'Register'>;

export function RegisterScreen({ navigation }: Props) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleRegister = async () => {
    if (password !== confirmPassword) {
      Alert.alert('Validation', 'Passwords do not match.');
      return;
    }

    if (!isSupabaseConfigured || !supabase) {
      Alert.alert('Missing config', 'Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY in mobile/.env');
      return;
    }

    try {
      setSubmitting(true);
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: {
            display_name: name.trim() || null,
          },
        },
      });

      if (error) {
        throw error;
      }

      if (!data.user) {
        throw new Error('Registration succeeded but no user returned.');
      }

      await ensureUserProfile(data.user.id, data.user.email ?? email.trim(), name.trim());

      if (!data.session) {
        Alert.alert('Check your email', 'Your account was created. Confirm your email then sign in.');
        navigation.replace('Login');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to create account.';
      Alert.alert('Registration failed', message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogleRegister = async () => {
    Alert.alert('Not configured', 'Google sign-up is not set up yet in this prototype.');
  };

  return (
    <Screen style={styles.container}>
      <Card>
        <View style={styles.heroIconWrap}>
          <View style={styles.heroIconCircle}>
            <Text style={styles.heroIconGlyph}>🎓</Text>
          </View>
        </View>

        <Heading>Create Account</Heading>
        <Subheading>Join our mentorship community</Subheading>

        <View style={styles.formSpacing}>
          <AppInput placeholder="Full Name" value={name} onChangeText={setName} />
          <AppInput
            placeholder="Email"
            autoCapitalize="none"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
          />
          <AppInput
            placeholder="Password"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />
          <AppInput
            placeholder="Confirm Password"
            secureTextEntry
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            style={styles.noMargin}
          />
        </View>

        <AppButton
          text={submitting ? 'Creating...' : 'Create Account'}
          onPress={handleRegister}
          disabled={submitting}
          variant="gold"
        />

        <View style={styles.dividerRow}>
          <View style={styles.divider} />
          <Text style={styles.dividerLabel}>Or continue with</Text>
          <View style={styles.divider} />
        </View>

        <AppButton text="Sign up with Google" variant="outline" onPress={handleGoogleRegister} />

        <Pressable onPress={() => navigation.replace('Login')}>
          <Text style={styles.link}>Already have an account? Sign in</Text>
        </Pressable>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 18,
    justifyContent: 'center',
  },
  heroIconWrap: {
    alignItems: 'center',
    marginBottom: 12,
  },
  heroIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#d9f99d',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroIconGlyph: {
    fontSize: 32,
  },
  formSpacing: {
    marginTop: 14,
    marginBottom: 6,
  },
  noMargin: {
    marginBottom: 0,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 18,
    marginBottom: 10,
    gap: 8,
  },
  divider: {
    flex: 1,
    height: 1,
    backgroundColor: colors.borderStrong,
  },
  dividerLabel: {
    fontSize: 12,
    color: colors.textMuted,
  },
  link: {
    marginTop: 18,
    textAlign: 'center',
    color: colors.green,
    fontWeight: '600',
  },
});
