import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { SplashScreen } from '@/app/components/SplashScreen';
import { LoginPage } from '@/app/components/LoginPage';
import { RegisterPage } from '@/app/components/RegisterPage';
import { CourseSelection } from '@/app/components/CourseSelection';
import { OnboardingScreen } from '@/app/components/OnboardingScreen';
import { MainApp } from '@/app/components/MainApp';

export default function App() {
  return (
    <Router>
      <div className="size-full bg-gray-50">
        <Routes>
          <Route path="/" element={<SplashScreen />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/courses" element={<CourseSelection />} />
          <Route path="/onboarding" element={<OnboardingScreen />} />
          <Route path="/app/*" element={<MainApp />} />
        </Routes>
      </div>
    </Router>
  );
}
