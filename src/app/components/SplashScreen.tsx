import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

export function SplashScreen() {
  const navigate = useNavigate();
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    // Check if user is already logged in
    const isLoggedIn = localStorage.getItem('isLoggedIn');
    const hasSeenOnboarding = localStorage.getItem('hasSeenOnboarding');
    
    let targetRoute = '/login';
    if (isLoggedIn === 'true') {
      targetRoute = hasSeenOnboarding === 'true' ? '/app/community' : '/onboarding';
    }

    // Start fade out after 2 seconds
    const fadeTimer = setTimeout(() => {
      setFadeOut(true);
    }, 2000);

    // Navigate after fade out animation completes
    const navTimer = setTimeout(() => {
      navigate(targetRoute);
    }, 2500);

    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(navTimer);
    };
  }, [navigate]);

  return (
    <div
      className={`flex h-screen w-full flex-col items-center justify-center bg-gradient-to-br from-green-50 via-amber-50 to-green-50 transition-opacity duration-500 ${
        fadeOut ? 'opacity-0' : 'opacity-100'
      }`}
    >
      {/* Logo Container */}
      <div className="mb-8 animate-pulse">
        <div className="flex h-32 w-32 items-center justify-center rounded-full bg-green-100 shadow-lg ring-4 ring-green-200 ring-opacity-50">
          <img 
            src="/images/Logo1.png" 
            alt="StudyBuddy Logo" 
            className="h-20 w-20 object-contain" 
          />
        </div>
      </div>

      {/* App Name */}
      <h1 className="mb-4 text-5xl font-bold text-green-600 animate-fade-in">
        StudyBuddy
      </h1>

      {/* Tagline */}
      <p className="text-lg text-zinc-600 animate-fade-in-delay">
        Your Learning Companion
      </p>

      {/* Loading Indicator */}
      <div className="mt-12 flex space-x-2">
        <div className="h-3 w-3 animate-bounce rounded-full bg-green-500 [animation-delay:-0.3s]"></div>
        <div className="h-3 w-3 animate-bounce rounded-full bg-green-400 [animation-delay:-0.15s]"></div>
        <div className="h-3 w-3 animate-bounce rounded-full bg-green-300"></div>
      </div>
    </div>
  );
}
