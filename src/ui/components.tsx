import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View, type TextInputProps, type ViewProps } from 'react-native';
import { colors, radius, shadows, spacing } from './theme';

export function Screen({ children, style }: { children: ReactNode; style?: ViewProps['style'] }) {
  return <View style={[styles.screen, style]}>{children}</View>;
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

type ButtonVariant = 'primary' | 'outline' | 'danger' | 'blue' | 'gold';

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
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={[
        styles.button,
        variant === 'outline' && styles.buttonOutline,
        variant === 'danger' && styles.buttonDanger,
        variant === 'blue' && styles.buttonBlue,
        variant === 'gold' && styles.buttonGold,
        disabled && styles.buttonDisabled,
      ]}
    >
      <Text
        style={[
          styles.buttonText,
          variant === 'outline' && styles.buttonOutlineText,
        ]}
      >
        {text}
      </Text>
    </Pressable>
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
    padding: spacing.md,
    ...shadows.card,
  },
  heading: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.textStrong,
  },
  subheading: {
    marginTop: 6,
    color: colors.textBody,
    fontSize: 16,
  },
  label: {
    fontSize: 12,
    color: colors.textMuted,
    marginBottom: 4,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: radius.md,
    backgroundColor: colors.white,
    color: colors.textBody,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 10,
  },
  button: {
    borderRadius: radius.md,
    backgroundColor: colors.green,
    paddingHorizontal: 14,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 42,
  },
  buttonOutline: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.borderStrong,
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
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: colors.white,
    fontWeight: '700',
  },
  buttonOutlineText: {
    color: colors.textBody,
  },
  badge: {
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: colors.white,
  },
  badgeActive: {
    borderColor: colors.green,
    backgroundColor: colors.greenSoft,
  },
  badgeText: {
    color: colors.textBody,
    fontWeight: '600',
    fontSize: 12,
  },
  badgeTextActive: {
    color: colors.green,
  },
});
