import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/app/components/ui/button';
import { getCurrentUserId } from '@/app/lib/authService';
import { updateUserProfile } from '@/app/lib/userService';
import { 
  BookOpen, 
  Users, 
  MessageCircle, 
  Target, 
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Lightbulb
} from 'lucide-react';

interface OnboardingSlide {
  id: number;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  details: string[];
  color: string;
}

const slides: OnboardingSlide[] = [
  {
    id: 1,
    icon: BookOpen,
    title: 'Welcome to StudyBuddy',
    description: 'Your personal academic companion',
    details: [
      '🎓 Connect with mentors in your courses',
      '👥 Build study groups with classmates',
      '💬 Direct messaging with peers',
      '📚 Share resources and knowledge'
    ],
    color: 'from-green-50 to-green-100'
  },
  {
    id: 2,
    icon: Users,
    title: 'Mentorship Network',
    description: 'Learn from experienced mentors',
    details: [
      '✅ Find mentors in your exact courses',
      '⭐ View mentor ratings and experience',
      '📅 Check availability in real-time',
      '💡 Get personalized guidance'
    ],
    color: 'from-blue-50 to-green-50'
  },
  {
    id: 3,
    icon: Target,
    title: 'Dual Roles: Mentor & Mentee',
    description: 'Be both a learner and a teacher',
    details: [
      '📖 Take courses as a mentee to learn',
      '🎯 Mentor others in courses you master',
      '🤝 Build mutual support networks',
      '🏆 Grow through teaching and learning'
    ],
    color: 'from-yellow-50 to-amber-50'
  },
  {
    id: 4,
    icon: MessageCircle,
    title: 'Stay Connected',
    description: 'Seamless communication tools',
    details: [
      '💬 Direct messaging with any peer',
      '📢 Community wall for shared posts',
      '🔔 Real-time notifications',
      '👥 Online status indicators'
    ],
    color: 'from-green-50 to-emerald-50'
  },
  {
    id: 5,
    icon: Lightbulb,
    title: 'Ready to Begin?',
    description: 'Start exploring and growing together',
    details: [
      '🚀 Complete your profile',
      '📝 Share your expertise areas',
      '🔍 Find mentors or students',
      '🌟 Build your academic community'
    ],
    color: 'from-amber-50 to-yellow-50'
  }
];

export function OnboardingScreen() {
  const navigate = useNavigate();
  const [currentSlide, setCurrentSlide] = useState(0);
  const [slideDirection, setSlideDirection] = useState('next');
  const [touchStart, setTouchStart] = useState(0);
  const [touchEnd, setTouchEnd] = useState(0);

  useEffect(() => {
    const markSeen = async () => {
      // Mark onboarding as seen
      localStorage.setItem('hasSeenOnboarding', 'true');

      const uid = getCurrentUserId();
      if (uid) {
        await updateUserProfile(uid, { hasSeenOnboarding: true });
      }
    };

    void markSeen();
  }, []);

  const handleNext = () => {
    if (currentSlide < slides.length - 1) {
      setSlideDirection('next');
      setCurrentSlide(currentSlide + 1);
    } else {
      navigate('/app/community');
    }
  };

  const handlePrevious = () => {
    if (currentSlide > 0) {
      setSlideDirection('prev');
      setCurrentSlide(currentSlide - 1);
    }
  };

  const handleSkip = () => {
    navigate('/app/community');
  };

  // Touch handlers for swipe detection
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    setTouchEnd(e.changedTouches[0].clientX);
    handleSwipe();
  };

  const handleSwipe = () => {
    if (!touchStart || !touchEnd) return;

    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > 50; // Swipe left (move to next)
    const isRightSwipe = distance < -50; // Swipe right (move to previous)

    if (isLeftSwipe) {
      handleNext();
    }
    if (isRightSwipe) {
      handlePrevious();
    }

    // Reset touch values
    setTouchStart(0);
    setTouchEnd(0);
  };

  const slide = slides[currentSlide];
  const Icon = slide.icon;

  return (
    <div 
      className={`flex h-screen flex-col bg-gradient-to-br ${slide.color} transition-all duration-500`}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Header with Skip Button */}
      <div className="flex h-16 items-center justify-between border-b border-white border-opacity-20 bg-white bg-opacity-50 px-6 backdrop-blur-sm">
        <div className="text-sm font-semibold text-zinc-600">
          {currentSlide + 1} / {slides.length}
        </div>
        <button
          onClick={handleSkip}
          className="text-sm font-medium text-zinc-600 underline transition-colors hover:text-zinc-800"
        >
          Skip
        </button>
      </div>

      {/* Main Content */}
      <div className="flex flex-1 flex-col items-center justify-center px-4 py-8 overflow-hidden">
        <div className="max-w-md space-y-6 text-center max-h-full overflow-y-auto">
          {/* Icon Container */}
          <div className="flex justify-center flex-shrink-0">
            <div className="rounded-full bg-green-100 p-6 shadow-lg ring-4 ring-green-200 ring-opacity-30">
              <Icon className="h-16 w-16 text-green-600" />
            </div>
          </div>

          {/* Title and Description */}
          <div className="space-y-3 flex-shrink-0">
            <h1 className="text-3xl font-bold text-green-600 leading-tight">
              {slide.title}
            </h1>
            <p className="text-base text-zinc-600">
              {slide.description}
            </p>
          </div>

          {/* Details List */}
          <div className="space-y-2">
            {slide.details.map((detail, index) => (
              <div
                key={index}
                className="flex items-start space-x-3 rounded-lg bg-white bg-opacity-60 p-3 backdrop-blur-sm"
              >
                <div className="mt-1 flex-shrink-0 text-lg">
                  {detail.split(' ')[0]}
                </div>
                <p className="flex-1 text-sm font-medium text-zinc-700 text-left">
                  {detail.split(' ').slice(1).join(' ')}
                </p>
              </div>
            ))}
          </div>

          {/* Progress Dots */}
          <div className="flex justify-center gap-2 pt-2">
            {slides.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentSlide(index)}
                className={`h-2 rounded-full transition-all duration-300 ${
                  index === currentSlide
                    ? 'w-8 bg-green-600'
                    : 'w-2 bg-green-300 hover:bg-green-400'
                }`}
                aria-label={`Go to slide ${index + 1}`}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Footer Navigation */}
      <div className="flex h-20 items-center justify-between gap-4 border-t border-white border-opacity-20 bg-white bg-opacity-50 px-6 backdrop-blur-sm">
        {/* Previous Button */}
        <Button
          variant="outline"
          onClick={handlePrevious}
          disabled={currentSlide === 0}
          className="flex items-center gap-2 border-green-300 text-green-600 hover:bg-green-50 hover:text-green-700 disabled:opacity-50"
        >
          <ChevronLeft className="h-5 w-5" />
          <span className="hidden sm:inline">Previous</span>
        </Button>

        {/* Slide Counter */}
        <span className="text-sm font-medium text-zinc-600">
          {currentSlide + 1} of {slides.length}
        </span>

        {/* Next/Complete Button */}
        <Button
          onClick={handleNext}
          className="flex items-center gap-2 bg-green-600 hover:bg-green-700"
        >
          <span className="hidden sm:inline">
            {currentSlide === slides.length - 1 ? 'Get Started' : 'Next'}
          </span>
          {currentSlide === slides.length - 1 ? (
            <ArrowRight className="h-5 w-5" />
          ) : (
            <ChevronRight className="h-5 w-5" />
          )}
        </Button>
      </div>
    </div>
  );
}
