import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/app/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Users, UserPlus } from 'lucide-react';
import { getCurrentUserId } from '@/app/lib/authService';
import { updateUserProfile } from '@/app/lib/userService';

export function RoleSelection() {
  const navigate = useNavigate();
  const [selectedRole, setSelectedRole] = useState<'mentor' | 'mentee' | null>(null);

  const handleContinue = async () => {
    if (selectedRole) {
      localStorage.setItem('userRole', selectedRole);

      const uid = getCurrentUserId();
      if (uid) {
        await updateUserProfile(uid, { userRole: selectedRole });
      }

      navigate('/courses');
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-4 bg-amber-50">
      <Card className="w-full max-w-2xl shadow-lg">
        <CardHeader className="text-center space-y-3 pb-6 pt-8">
          <CardTitle className="text-2xl font-bold">Choose Your Role</CardTitle>
          <CardDescription className="text-base">Select how you'd like to participate in the community</CardDescription>
        </CardHeader>
        <CardContent className="px-6 pb-8">
          <div className="grid gap-6 md:grid-cols-2 mb-6">
            <button
              onClick={() => setSelectedRole('mentee')}
              className={`flex flex-col items-center gap-4 rounded-xl border-3 p-8 transition-all hover:shadow-lg ${
                selectedRole === 'mentee'
                  ? 'border-green-500 bg-green-50 shadow-md'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-green-100">
                <UserPlus className="h-10 w-10 text-green-600" />
              </div>
              <div className="text-center">
                <h3 className="text-xl font-bold mb-2">Mentee</h3>
                <p className="text-sm text-zinc-600">Looking for guidance and support</p>
              </div>
            </button>

            <button
              onClick={() => setSelectedRole('mentor')}
              className={`flex flex-col items-center gap-4 rounded-xl border-3 p-8 transition-all hover:shadow-lg ${
                selectedRole === 'mentor'
                  ? 'border-green-500 bg-green-50 shadow-md'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-green-100">
                <Users className="h-10 w-10 text-green-600" />
              </div>
              <div className="text-center">
                <h3 className="text-xl font-bold mb-2">Mentor</h3>
                <p className="text-sm text-zinc-600">Ready to share knowledge and help others</p>
              </div>
            </button>
          </div>

          <Button onClick={handleContinue} disabled={!selectedRole} className="w-full h-12 text-base font-semibold">
            Continue
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
