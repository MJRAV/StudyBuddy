import { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import { colors } from '../ui/theme';

export function SplashScreen() {
  const dot1 = useRef(new Animated.Value(0)).current;
  const dot2 = useRef(new Animated.Value(0)).current;
  const dot3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const makeLoop = (value: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(value, {
            toValue: -6,
            duration: 250,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(value, {
            toValue: 0,
            duration: 250,
            easing: Easing.in(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.delay(150),
        ]),
      );

    const loops = [
      makeLoop(dot1, 0),
      makeLoop(dot2, 120),
      makeLoop(dot3, 240),
    ];

    loops.forEach((loop) => loop.start());
    return () => {
      loops.forEach((loop) => loop.stop());
    };
  }, [dot1, dot2, dot3]);

  return (
    <View style={styles.container}>
      <View style={styles.bgCircleOne} />
      <View style={styles.bgCircleTwo} />

      <View style={styles.inner}>
        <View style={styles.logoWrap}>
          <Text style={styles.logoGlyph}>SB</Text>
        </View>
        <Text style={styles.title}>StudyBuddy</Text>
        <Text style={styles.subtitle}>Your Learning Companion</Text>
        <View style={styles.dotsRow}>
          <Animated.View
            style={[styles.dot, styles.dotStrong, { transform: [{ translateY: dot1 }] }]}
          />
          <Animated.View
            style={[styles.dot, styles.dotMid, { transform: [{ translateY: dot2 }] }]}
          />
          <Animated.View
            style={[styles.dot, styles.dotSoft, { transform: [{ translateY: dot3 }] }]}
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fef9c3',
    overflow: 'hidden',
  },
  inner: {
    alignItems: 'center',
    padding: 18,
  },
  bgCircleOne: {
    position: 'absolute',
    width: 420,
    height: 420,
    borderRadius: 210,
    backgroundColor: '#bbf7d0',
    top: -180,
    left: -140,
    opacity: 0.7,
  },
  bgCircleTwo: {
    position: 'absolute',
    width: 420,
    height: 420,
    borderRadius: 210,
    backgroundColor: '#fef3c7',
    bottom: -200,
    right: -150,
    opacity: 0.9,
  },
  logoWrap: {
    width: 106,
    height: 106,
    borderRadius: 53,
    backgroundColor: '#d9f99d',
    borderWidth: 3,
    borderColor: '#86efac',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoGlyph: {
    color: colors.green,
    fontSize: 30,
    fontWeight: '900',
    letterSpacing: 1,
  },
  title: {
    marginTop: 24,
    fontSize: 40,
    fontWeight: '900',
    color: colors.textStrong,
    letterSpacing: 0.3,
  },
  subtitle: {
    marginTop: 8,
    fontSize: 15,
    color: colors.textBody,
    fontWeight: '600',
  },
  dotsRow: {
    marginTop: 28,
    flexDirection: 'row',
    gap: 8,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  dotStrong: {
    backgroundColor: colors.green,
  },
  dotMid: {
    backgroundColor: '#84cc16',
  },
  dotSoft: {
    backgroundColor: '#bef264',
  },
});
