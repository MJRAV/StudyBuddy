import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { AppButton, Heading, Screen, Subheading } from '../ui/components';
import { colors } from '../ui/theme';

type Props = {
  onComplete: () => Promise<void> | void;
};

type SlideDetail = {
  icon: string;
  text: string;
};

type Slide = {
  title: string;
  description: string;
  icon: string;
  backgroundColor: string;
  details: SlideDetail[];
};

const slides: Slide[] = [
  {
    title: 'Welcome to StudyBuddy',
    description: 'Your personal academic companion',
    icon: '📖',
    backgroundColor: '#ecfdf3',
    details: [
      { icon: '🎓', text: 'Connect with mentors in your courses' },
      { icon: '👥', text: 'Build study groups with classmates' },
      { icon: '💬', text: 'Direct messaging with peers' },
      { icon: '📚', text: 'Share resources and knowledge' },
    ],
  },
  {
    title: 'Mentorship Network',
    description: 'Learn from experienced mentors',
    icon: '👨‍🏫',
    backgroundColor: '#e0f2fe',
    details: [
      { icon: '✅', text: 'Find mentors in your exact courses' },
      { icon: '⭐', text: 'See mentor ratings and experience' },
      { icon: '📅', text: 'Check availability in real time' },
      { icon: '💡', text: 'Get personalized guidance' },
    ],
  },
  {
    title: 'Dual Roles: Mentor & Mentee',
    description: 'Be both a learner and a teacher',
    icon: '🎯',
    backgroundColor: '#fef9c3',
    details: [
      { icon: '📖', text: 'Take courses as a mentee to learn' },
      { icon: '🎯', text: 'Mentor others in courses you master' },
      { icon: '🤝', text: 'Build mutual support networks' },
      { icon: '🏆', text: 'Grow through teaching and learning' },
    ],
  },
  {
    title: 'Stay Connected',
    description: 'Seamless communication tools',
    icon: '💬',
    backgroundColor: '#dcfce7',
    details: [
      { icon: '💬', text: 'Direct messaging with any peer' },
      { icon: '📢', text: 'Community wall for shared posts' },
      { icon: '🔔', text: 'Real-time notifications' },
      { icon: '👥', text: 'Online status indicators' },
    ],
  },
  {
    title: 'Ready to Begin?',
    description: 'Start exploring and growing together',
    icon: '💡',
    backgroundColor: '#fef3c7',
    details: [
      { icon: '🚀', text: 'Complete your profile' },
      { icon: '📝', text: 'Share your expertise areas' },
      { icon: '🔍', text: 'Find mentors or students' },
      { icon: '🌟', text: 'Build your academic community' },
    ],
  },
];

export function OnboardingScreen({ onComplete }: Props) {
  const [index, setIndex] = useState(0);
  const isLast = index === slides.length - 1;
  const slide = slides[index];

  const handleNext = () => {
    if (isLast) {
      void onComplete();
      return;
    }
    setIndex((prev) => Math.min(prev + 1, slides.length - 1));
  };

  const handlePrev = () => {
    setIndex((prev) => Math.max(prev - 1, 0));
  };

  const handleSkip = () => {
    void onComplete();
  };

  return (
    <Screen style={{ backgroundColor: slide.backgroundColor }}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.headerBar}>
          <Text style={styles.headerCounter}>
            {index + 1} / {slides.length}
          </Text>
          <Pressable onPress={handleSkip}>
            <Text style={styles.headerSkip}>Skip</Text>
          </Pressable>
        </View>

        {/* Main content */}
        <View style={styles.mainContent}>
          <View style={styles.iconWrap}>
            <View style={styles.iconCircle}>
              <Text style={styles.iconEmoji}>{slide.icon}</Text>
            </View>
          </View>

          <View style={styles.textBlock}>
            <Heading>{slide.title}</Heading>
            <Subheading>{slide.description}</Subheading>
          </View>

          <View style={styles.detailList}>
            {slide.details.map((item) => (
              <View key={item.icon + item.text} style={styles.detailItem}>
                <Text style={styles.detailIcon}>{item.icon}</Text>
                <Text style={styles.detailText}>{item.text}</Text>
              </View>
            ))}
          </View>

          <View style={styles.progressRow}>
            {slides.map((_, i) => (
              <View
                key={String(i)}
                style={[styles.dot, i === index ? styles.dotActive : styles.dotInactive]}
              />
            ))}
          </View>
        </View>

        {/* Footer navigation */}
        <View style={styles.footerBar}>
          <View style={styles.footerSide}>
            <AppButton
              text="Back"
              variant="outline"
              onPress={handlePrev}
              disabled={index === 0}
            />
          </View>

          <Text style={styles.footerCounter}>
            {index + 1} of {slides.length}
          </Text>

          <View style={styles.footerSide}>
            <AppButton
              text={isLast ? 'Get Started' : 'Next'}
              onPress={handleNext}
            />
          </View>
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerBar: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.6)',
    backgroundColor: 'rgba(255,255,255,0.7)',
  },
  headerCounter: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textMuted,
  },
  headerSkip: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textBody,
  },
  mainContent: {
    flex: 1,
    paddingHorizontal: 24,
    paddingVertical: 24,
    alignItems: 'center',
  },
  iconWrap: {
    marginTop: 8,
    marginBottom: 20,
  },
  iconCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: colors.greenSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconEmoji: {
    fontSize: 56,
  },
  textBlock: {
    alignItems: 'center',
    marginBottom: 18,
  },
  detailList: {
    alignSelf: 'stretch',
    marginTop: 4,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.9)',
    marginBottom: 10,
  },
  detailIcon: {
    fontSize: 18,
    marginRight: 8,
  },
  detailText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    color: colors.textBody,
  },
  progressRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginTop: 8,
  },
  dot: {
    height: 8,
    borderRadius: 4,
  },
  dotInactive: {
    width: 8,
    backgroundColor: 'rgba(22,163,74,0.3)',
  },
  dotActive: {
    width: 24,
    backgroundColor: colors.green,
  },
  footerBar: {
    height: 72,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.6)',
    backgroundColor: 'rgba(255,255,255,0.85)',
  },
  footerSide: {
    flex: 1,
  },
  footerCounter: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textMuted,
    textAlign: 'center',
    paddingHorizontal: 12,
  },
});
