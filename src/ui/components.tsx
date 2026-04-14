import type { ReactNode } from 'react';
import { Animated, Pressable, StyleSheet, Text, TextInput, View, type TextInputProps, type ViewProps } from 'react-native';
import { useEffect, useRef } from 'react';
import { colors, radius, shadows, spacing, typography } from './theme';

export function Screen({ children, style }: { children: ReactNode; style?: ViewProps['style'] }) {
  return <View style={[styles.screen, style]}>{children}</View>;
}

export function AnimatedScreen({ children, style }: { children: ReactNode; style?: ViewProps['style'] }) {
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  return (
    <Animated.View style={[styles.screen, style, { opacity: fadeAnim }]}>
      {children}
    </Animated.View>
  );
}

export function Card({ children, style }: { children: ReactNode; style?: ViewProps['style'] }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function Heading({ children }: { children: ReactNode }) {
  return <Text style={styles.heading}>{children}</Text>;
}

export function Subheading({ children }: { children: ReactNode }) {
  return <Text style={styles.subheading}>{children}</Text>;
}

export function Label({ children }: { children: ReactNode }) {
  return <Text style={styles.label}>{children}</Text>;
}

export function AppInput(props: TextInputProps) {
  return <TextInput placeholderTextColor={colors.textMuted} {...props} style={[styles.input, props.style]} />;
}

type ButtonVariant = 'primary' | 'outline' | 'danger' | 'blue' | 'gold' | 'reject';

export function AppButton({
  text,
  onPress,
  disabled,
  variant = 'primary',
}: {
  text: string;
  onPress?: () => void;
  disabled?: boolean;
  variant?: ButtonVariant;
}) {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.95,
      useNativeDriver: true,
      tension: 200,
      friction: 10,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      tension: 200,
      friction: 10,
    }).start();
  };

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <Pressable
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={disabled}
        style={[
          styles.button,
          variant === 'outline' && styles.buttonOutline,
          variant === 'danger' && styles.buttonDanger,
          variant === 'blue' && styles.buttonBlue,
          variant === 'gold' && styles.buttonGold,
          variant === 'reject' && styles.buttonReject,
          disabled && styles.buttonDisabled,
        ]}
      >
        <Text
          style={[
            styles.buttonText,
            (variant === 'outline' || variant === 'reject') && styles.buttonOutlineText,
            variant === 'reject' && styles.buttonRejectText,
          ]}
        >
          {text}
        </Text>
      </Pressable>
    </Animated.View>
  );
}

export function Badge({ text, active = false }: { text: string; active?: boolean }) {
  return (
    <View style={[styles.badge, active && styles.badgeActive]}>
      <Text style={[styles.badgeText, active && styles.badgeTextActive]}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  card: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    backgroundColor: colors.bgCard,
    padding: spacing.lg,
    marginBottom: spacing.md,
    ...shadows.card,
  },
  heading: {
    ...typography.heading,
    color: colors.textStrong,
    marginBottom: spacing.md,
  },
  subheading: {
    ...typography.subheading,
    color: colors.textBody,
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
  },
  label: {
    ...typography.label,
    color: colors.textMuted,
    marginBottom: spacing.sm,
  },
  input: {
    ...typography.bodySmall,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: radius.md,
    backgroundColor: colors.white,
    color: colors.textBody,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    marginBottom: spacing.lg,
  },
  button: {
    ...typography.buttonText,
    borderRadius: radius.md,
    backgroundColor: colors.green,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
    marginVertical: spacing.sm,
  },
  buttonOutline: {
    backgroundColor: colors.white,
    borderWidth: 2,
    borderColor: colors.green,
  },
  buttonDanger: {
    backgroundColor: colors.red,
  },
  buttonBlue: {
    backgroundColor: colors.blue,
  },
  buttonGold: {
    backgroundColor: colors.gold,
  },
  buttonReject: {
    backgroundColor: colors.white,
    borderWidth: 2,
    borderColor: colors.red,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: colors.white,
    fontWeight: '700',
  },
  buttonOutlineText: {
    color: colors.green,
    fontWeight: '700',
  },
  buttonRejectText: {
    color: colors.red,
    fontWeight: '700',
  },
  badge: {
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.white,
    marginHorizontal: spacing.xs,
  },
  badgeActive: {
    borderColor: colors.green,
    backgroundColor: colors.greenSoft,
  },
  badgeText: {
    ...typography.labelSmall,
    color: colors.textBody,
  },
  badgeTextActive: {
    color: colors.green,
    fontWeight: '700',
  },
});
