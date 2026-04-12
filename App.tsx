import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { StatusBar } from 'expo-status-bar';
import { LoginScreen } from './src/screens/LoginScreen';
import { RegisterScreen } from './src/screens/RegisterScreen';
import { CourseSelectionScreen } from './src/screens/CourseSelectionScreen';
import { OnboardingScreen } from './src/screens/OnboardingScreen';
import { CommunityScreen } from './src/screens/CommunityScreen';
import { MessagesScreen } from './src/screens/MessagesScreen';
import { NotificationsScreen } from './src/screens/NotificationsScreen';
import { FindMentorScreen } from './src/screens/FindMentorScreen';
import { BuddiesScreen } from './src/screens/BuddiesScreen';
import { ProfileScreen } from './src/screens/ProfileScreen';
import { AdminScreen } from './src/screens/AdminScreen';
import { ManageCoursesScreen } from './src/screens/ManageCoursesScreen';
import { SplashScreen } from './src/screens/SplashScreen';
import { getUserProfile, isSupabaseConfigured, supabase } from './src/lib/supabase';
import { materializeAcceptedConnections } from './src/lib/socialService';

type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
};

type AppStackParamList = {
  HomeTabs: undefined;
  Admin: undefined;
  ManageCourses: undefined;
};

type TabsParamList = {
  Community: undefined;
  Messages: undefined;
  Alerts: undefined;
  Mentors: undefined;
  Buddies: undefined;
  Profile: undefined;
};

const AuthStack = createNativeStackNavigator<AuthStackParamList>();
const AppStack = createNativeStackNavigator<AppStackParamList>();
const Tabs = createBottomTabNavigator<TabsParamList>();

function ConfigScreen() {
  return (
    <View style={styles.centerScreen}>
      <Text style={styles.title}>Supabase Not Configured</Text>
      <Text style={styles.message}>Add EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY in mobile/.env</Text>
    </View>
  );
}

function LoadingScreen() {
  return (
    <View style={styles.centerScreen}>
      <ActivityIndicator size="large" color="#166534" />
      <Text style={styles.loadingText}>Loading StudyBuddy...</Text>
    </View>
  );
}

type HomeTabsProps = {
  uid: string;
  onLogout: () => Promise<void>;
  onOpenAdmin: () => void;
  onManageCourses: () => void;
};

function HomeTabs({ uid, onLogout, onOpenAdmin, onManageCourses }: HomeTabsProps) {
  return (
    <Tabs.Navigator
      screenOptions={({ route }) => ({
        headerStyle: { backgroundColor: '#fef3c7' },
        headerTitleStyle: { color: '#14532d', fontWeight: '700' },
        tabBarStyle: {
          backgroundColor: '#ffffff',
          borderTopColor: '#d1d5db',
          height: 62,
          paddingBottom: 6,
          paddingTop: 4,
        },
        tabBarActiveTintColor: '#166534',
        tabBarInactiveTintColor: '#6b7280',
        tabBarLabelStyle: { fontSize: 11, fontWeight: '700' },
        tabBarIcon: ({ color, size, focused }) => {
          const iconByRoute: Record<string, string> = {
            Community: '🏠',
            Messages: '💬',
            Alerts: '🔔',
            Mentors: '🔎',
            Buddies: '👥',
            Profile: '🙍',
          };

          return <Text style={{ fontSize: size, color }}>{iconByRoute[route.name]}</Text>;
        },
      })}
    >
      <Tabs.Screen name="Community" options={{ title: 'Community' }}>
        {() => <CommunityScreen uid={uid} />}
      </Tabs.Screen>
      <Tabs.Screen name="Messages" options={{ title: 'Messages' }}>
        {() => <MessagesScreen uid={uid} />}
      </Tabs.Screen>
      <Tabs.Screen name="Alerts" options={{ title: 'Alerts' }}>
        {() => <NotificationsScreen uid={uid} />}
      </Tabs.Screen>
      <Tabs.Screen name="Mentors" options={{ title: 'Find Mentor' }}>
        {() => <FindMentorScreen uid={uid} />}
      </Tabs.Screen>
      <Tabs.Screen name="Buddies" options={{ title: 'Buddies' }}>
        {() => <BuddiesScreen uid={uid} />}
      </Tabs.Screen>
      <Tabs.Screen name="Profile" options={{ title: 'Profile' }}>
        {() => (
          <ProfileScreen
            uid={uid}
            onLogout={onLogout}
            onOpenAdmin={onOpenAdmin}
            onManageCourses={onManageCourses}
          />
        )}
      </Tabs.Screen>
    </Tabs.Navigator>
  );
}

export default function App() {
  const [showSplash, setShowSplash] = useState(true);
  const [uid, setUid] = useState('');
  const [ready, setReady] = useState(false);
  const [needsCourseSelection, setNeedsCourseSelection] = useState(false);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);
  const [openAdminFlag, setOpenAdminFlag] = useState(false);

  useEffect(() => {
    const id = setTimeout(() => {
      setShowSplash(false);
    }, 1600);

    return () => {
      clearTimeout(id);
    };
  }, []);

  const refreshFlowState = async (currentUid: string) => {
    try {
      const profile = await getUserProfile(currentUid).catch(() => null);

      if (!profile) {
        setNeedsCourseSelection(true);
        setNeedsOnboarding(true);
        return;
      }

      if (!supabase) {
        setNeedsCourseSelection(profile.selectedCourses.length === 0);
        setNeedsOnboarding(false);
        return;
      }

      const { data, error } = await supabase
        .from('users')
        .select('has_seen_onboarding,selected_courses')
        .eq('uid', currentUid)
        .maybeSingle();

      if (error) {
        console.warn('Failed to read onboarding flags', error);
        setNeedsCourseSelection(profile.selectedCourses.length === 0);
        setNeedsOnboarding(false);
        return;
      }

      const selectedCourses = Array.isArray(data?.selected_courses)
        ? data.selected_courses
        : profile.selectedCourses;
      const hasSeenOnboarding = Boolean(data?.has_seen_onboarding);

      setNeedsCourseSelection(selectedCourses.length === 0);
      setNeedsOnboarding(!hasSeenOnboarding);
    } catch (error) {
      console.warn('refreshFlowState failed', error);
      setNeedsCourseSelection(false);
      setNeedsOnboarding(false);
    }
  };

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) {
      setReady(true);
      return;
    }

    const client = supabase;

    let active = true;

    const boot = async () => {
      try {
        const { data } = await client.auth.getSession();
        const currentUid = data.session?.user?.id ?? '';

        if (!active) {
          return;
        }

        setUid(currentUid);
        setReady(true);

        if (currentUid) {
          void refreshFlowState(currentUid);
        } else {
          setNeedsCourseSelection(false);
          setNeedsOnboarding(false);
        }
      } catch (error) {
        console.warn('Initial auth boot failed', error);
      } finally {
        if (!active) return;
      }
    };

    void boot();

    const { data: listener } = client.auth.onAuthStateChange(async (_event, session) => {
      const currentUid = session?.user?.id ?? '';
      setUid(currentUid);

      try {
        if (currentUid) {
          void refreshFlowState(currentUid);
        } else {
          setNeedsCourseSelection(false);
          setNeedsOnboarding(false);
        }
      } catch (error) {
        console.warn('Auth state change handler failed', error);
      } finally {
        setReady(true);
      }
    });

    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  // Keep buddy rows in sync for users who previously sent requests that
  // have since been accepted, mirroring the legacy materializeAcceptedConnections
  useEffect(() => {
    if (!uid || !supabase) {
      return;
    }

    let active = true;

    const run = async () => {
      try {
        await materializeAcceptedConnections(uid);
      } catch (error) {
        if (active) {
          console.warn('materializeAcceptedConnections failed', error);
        }
      }
    };

    void run();
    const id = setInterval(() => {
      void run();
    }, 6000);

    return () => {
      active = false;
      clearInterval(id);
    };
  }, [uid]);

  const logout = async () => {
    if (!supabase) {
      return;
    }
    await supabase.auth.signOut({ scope: 'local' });
    setUid('');
    setNeedsCourseSelection(false);
    setNeedsOnboarding(false);
  };

  const authNavigator = useMemo(
    () => (
      <AuthStack.Navigator screenOptions={{ headerShown: false }}>
        <AuthStack.Screen name="Login" component={LoginScreen} />
        <AuthStack.Screen name="Register" component={RegisterScreen} />
      </AuthStack.Navigator>
    ),
    [],
  );

  if (!isSupabaseConfigured) {
    return <ConfigScreen />;
  }

  if (showSplash) {
    return <SplashScreen />;
  }

  if (!ready) {
    return <LoadingScreen />;
  }

  if (!uid) {
    return (
      <NavigationContainer>
        {authNavigator}
        <StatusBar style="dark" />
      </NavigationContainer>
    );
  }

  if (needsCourseSelection) {
    return (
      <View style={styles.fill}>
        <CourseSelectionScreen
          uid={uid}
          onComplete={async () => {
            await refreshFlowState(uid);
          }}
        />
        <StatusBar style="dark" />
      </View>
    );
  }

  if (needsOnboarding) {
    return (
      <View style={styles.fill}>
        <OnboardingScreen
          onComplete={async () => {
            await supabase?.from('users').update({ has_seen_onboarding: true }).eq('uid', uid);
            await refreshFlowState(uid);
          }}
        />
        <StatusBar style="dark" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <AppStack.Navigator>
        <AppStack.Screen name="HomeTabs" options={{ headerShown: false }}>
          {({ navigation }) => (
            <HomeTabs
              uid={uid}
              onLogout={logout}
              onOpenAdmin={() => {
                setOpenAdminFlag(true);
                navigation.navigate('Admin');
              }}
              onManageCourses={() => {
                navigation.navigate('ManageCourses');
              }}
            />
          )}
        </AppStack.Screen>
        <AppStack.Screen name="Admin" options={{ title: 'Admin' }}>
          {() => (
            <View style={styles.fill}>
              {openAdminFlag ? <AdminScreen uid={uid} /> : <Text style={styles.message}>Open Admin from Profile.</Text>}
            </View>
          )}
        </AppStack.Screen>
        <AppStack.Screen name="ManageCourses" options={{ title: 'Manage Courses' }}>
          {({ navigation }) => (
            <View style={styles.fill}>
              <ManageCoursesScreen
                uid={uid}
                onComplete={async () => {
                  await refreshFlowState(uid);
                  navigation.goBack();
                }}
              />
            </View>
          )}
        </AppStack.Screen>
      </AppStack.Navigator>
      <StatusBar style="dark" />
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: '#fef3c7' },
  centerScreen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 22,
    backgroundColor: '#fef3c7',
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#14532d',
    textAlign: 'center',
  },
  message: {
    marginTop: 10,
    textAlign: 'center',
    color: '#374151',
    fontSize: 15,
  },
  loadingText: {
    marginTop: 10,
    color: '#374151',
    fontWeight: '600',
  },
  linkButton: {
    marginTop: 14,
    backgroundColor: '#166534',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  linkButtonText: {
    color: '#fff',
    fontWeight: '700',
  },
});
