import { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { isSupabaseConfigured, supabase } from '../lib/supabase';
import { AppButton, AppInput, Card, Heading, Screen, Subheading } from '../ui/components';
import { colors } from '../ui/theme';

type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
};

type Props = NativeStackScreenProps<AuthStackParamList, 'Login'>;

export function LoginScreen({ navigation }: Props) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleLogin = async () => {
    if (!isSupabaseConfigured || !supabase) {
      Alert.alert('Missing config', 'Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY in mobile/.env');
      return;
    }

    try {
      setSubmitting(true);
      const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (error) {
        throw error;
      }

      const user = data.user;
      if (!user) {
        throw new Error('Login succeeded but no user returned.');
      }

      const { data: meData, error: meError } = await supabase
        .from('users')
        .select('suspended_until,is_deleted')
        .eq('uid', user.id)
        .maybeSingle();

      if (meError) {
        await supabase.auth.signOut({ scope: 'local' });
        console.warn('Unable to read timeout/deleted flags during login', meError);
        Alert.alert('Sign in blocked', 'Unable to verify account status right now. Please try again in a moment.');
        return;
      }

      if (!meData) {
        await supabase.auth.signOut({ scope: 'local' });
        Alert.alert('Account unavailable', 'This account no longer exists. Please contact an admin.');
        return;
      }

      const suspendedUntilIso = String((meData as { suspended_until?: unknown } | null)?.suspended_until ?? '');
      const suspendedUntilTs = Date.parse(suspendedUntilIso);
      const isTimedOut = Number.isFinite(suspendedUntilTs) && suspendedUntilTs > Date.now();
      const isDeleted = Boolean((meData as { is_deleted?: unknown } | null)?.is_deleted);

      if (isDeleted || isTimedOut) {
        await supabase.auth.signOut({ scope: 'local' });
        Alert.alert(
          'Account disabled',
          isDeleted
            ? 'This account has been disabled by an administrator.'
            : `Your account is temporarily disabled until ${new Date(suspendedUntilTs).toLocaleString()}.`,
        );
        return;
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to sign in.';
      Alert.alert('Sign in failed', message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogleLogin = async () => {
    Alert.alert('Not configured', 'Google sign-in is not set up yet in this prototype.');
  };

  return (
    <Screen style={styles.container}>
      <Card>
        <View style={styles.heroIconWrap}>
          <View style={styles.heroIconCircle}>
            <Text style={styles.heroIconGlyph}>🎓</Text>
          </View>
        </View>
        <Heading>Welcome to StudyBuddy</Heading>
        <Subheading>Sign in to your account to continue</Subheading>

        <View style={styles.formSpacing}>
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
            style={styles.noMargin}
          />
        </View>

        <AppButton
          text={submitting ? 'Signing in...' : 'Sign In'}
          onPress={handleLogin}
          disabled={submitting}
          variant="gold"
        />

        <View style={styles.dividerRow}>
          <View style={styles.divider} />
          <Text style={styles.dividerLabel}>Or continue with</Text>
          <View style={styles.divider} />
        </View>

        <AppButton text="Sign in with Google" variant="outline" onPress={handleGoogleLogin} />

        <Pressable onPress={() => navigation.navigate('Register')}>
          <Text style={styles.link}>Don't have an account? Sign up</Text>
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
