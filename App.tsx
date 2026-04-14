import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { StatusBar } from 'expo-status-bar';
import MaterialCommunityIcons from '@expo/vector-icons/build/MaterialCommunityIcons';
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

function toBadgeText(count: number): string {
  if (count > 99) {
    return '99+';
  }
  return String(count);
}

function HomeTabs({ uid, onLogout, onOpenAdmin, onManageCourses }: HomeTabsProps) {
  const [unreadMessageCount, setUnreadMessageCount] = useState(0);
  const [unreadAlertCount, setUnreadAlertCount] = useState(0);

  useEffect(() => {
    if (!supabase || !uid) {
      setUnreadMessageCount(0);
      setUnreadAlertCount(0);
      return;
    }

    const client = supabase;
    let active = true;

    const loadUnreadCounts = async () => {
      const [directUnreadResp, groupsResp, meResp, friendReqResp, incomingGroupReqResp, myGroupReqResp, ownPostsResp] = await Promise.all([
        client
          .from('direct_messages')
          .select('id', { count: 'exact', head: true })
          .eq('recipient_id', uid)
          .eq('is_read', false),
        client
          .from('study_groups')
          .select('id,owner_id,member_ids'),
        client
          .from('users')
          .select('notifications_last_seen_at')
          .eq('uid', uid)
          .maybeSingle(),
        client
          .from('friend_requests')
          .select('id,created_at')
          .eq('target_id', uid)
          .eq('status', 'pending')
          .order('created_at', { ascending: false }),
        client
          .from('study_group_requests')
          .select('id,created_at')
          .eq('status', 'pending')
          .order('created_at', { ascending: false }),
        client
          .from('study_group_requests')
          .select('id,created_at')
          .eq('requester_id', uid)
          .neq('status', 'pending')
          .order('created_at', { ascending: false }),
        client
          .from('community_posts')
          .select('id')
          .eq('author_id', uid),
      ]);

      if (
        !active ||
        directUnreadResp.error ||
        groupsResp.error ||
        meResp.error ||
        friendReqResp.error ||
        incomingGroupReqResp.error ||
        myGroupReqResp.error ||
        ownPostsResp.error
      ) {
        return;
      }

      const directUnread = Number(directUnreadResp.count ?? 0);

      const myGroupIds = (groupsResp.data ?? [])
        .filter((row) => {
          const ownerId = String((row as { owner_id?: unknown }).owner_id ?? '');
          if (ownerId === uid) {
            return true;
          }
          const memberIdsRaw = (row as { member_ids?: unknown }).member_ids;
          const memberIds = Array.isArray(memberIdsRaw)
            ? memberIdsRaw.map((item: unknown) => String(item))
            : [];
          return memberIds.includes(uid);
        })
        .map((row) => String((row as { id?: unknown }).id ?? ''))
        .filter((id) => id.length > 0);

      let groupUnread = 0;

      if (myGroupIds.length > 0) {
        const [readsResp, groupMsgsResp] = await Promise.all([
          client
            .from('study_group_read_states')
            .select('group_id,last_seen_at')
            .eq('user_id', uid)
            .in('group_id', myGroupIds),
          client
            .from('study_group_messages')
            .select('group_id,created_at,sender_id')
            .in('group_id', myGroupIds)
            .neq('sender_id', uid)
            .order('created_at', { ascending: false })
            .limit(1000),
        ]);

        if (!readsResp.error && !groupMsgsResp.error) {
          const lastSeenByGroup = new Map<string, number>();
          for (const row of readsResp.data ?? []) {
            const groupId = String((row as { group_id?: unknown }).group_id ?? '');
            const seenAtIso = String((row as { last_seen_at?: unknown }).last_seen_at ?? '');
            const seenAt = Date.parse(seenAtIso);
            if (groupId && Number.isFinite(seenAt)) {
              lastSeenByGroup.set(groupId, seenAt);
            }
          }

          groupUnread = (groupMsgsResp.data ?? []).filter((row) => {
            const groupId = String((row as { group_id?: unknown }).group_id ?? '');
            const createdAtIso = String((row as { created_at?: unknown }).created_at ?? '');
            const createdAt = Date.parse(createdAtIso);
            if (!groupId || !Number.isFinite(createdAt)) {
              return false;
            }
            const lastSeen = lastSeenByGroup.get(groupId);
            if (lastSeen === undefined) {
              return true;
            }
            return createdAt > lastSeen;
          }).length;
        }
      }

      const notificationsLastSeenAt = String(
        (meResp.data as { notifications_last_seen_at?: unknown } | null)?.notifications_last_seen_at ?? '',
      );
      const notificationsSeenTs = Date.parse(notificationsLastSeenAt);
      const hasSeenTs = Number.isFinite(notificationsSeenTs);

      const isNewAlert = (createdAtIso: string) => {
        if (!hasSeenTs) {
          return true;
        }
        const createdAt = Date.parse(createdAtIso);
        return Number.isFinite(createdAt) && createdAt > notificationsSeenTs;
      };

      const ownPostIds = (ownPostsResp.data ?? [])
        .map((row) => String((row as { id?: unknown }).id ?? ''))
        .filter((id) => id.length > 0);

      let postActivityUnread = 0;
      if (ownPostIds.length > 0) {
        const [likesResp, commentsResp] = await Promise.all([
          client
            .from('community_post_likes')
            .select('created_at,user_id')
            .in('post_id', ownPostIds)
            .neq('user_id', uid)
            .order('created_at', { ascending: false }),
          client
            .from('community_post_comments')
            .select('created_at,author_id')
            .in('post_id', ownPostIds)
            .neq('author_id', uid)
            .order('created_at', { ascending: false }),
        ]);

        if (!likesResp.error && !commentsResp.error) {
          const likeUnread = (likesResp.data ?? []).filter((row) => {
            const createdAtIso = String((row as { created_at?: unknown }).created_at ?? '');
            return isNewAlert(createdAtIso);
          }).length;

          const commentUnread = (commentsResp.data ?? []).filter((row) => {
            const createdAtIso = String((row as { created_at?: unknown }).created_at ?? '');
            return isNewAlert(createdAtIso);
          }).length;

          postActivityUnread = likeUnread + commentUnread;
        }
      }

      const friendReqUnread = (friendReqResp.data ?? []).filter((row) => {
        const createdAtIso = String((row as { created_at?: unknown }).created_at ?? '');
        return isNewAlert(createdAtIso);
      }).length;

      const incomingGroupReqUnread = (incomingGroupReqResp.data ?? []).filter((row) => {
        const createdAtIso = String((row as { created_at?: unknown }).created_at ?? '');
        return isNewAlert(createdAtIso);
      }).length;

      const groupUpdatesUnread = (myGroupReqResp.data ?? []).filter((row) => {
        const createdAtIso = String((row as { created_at?: unknown }).created_at ?? '');
        return isNewAlert(createdAtIso);
      }).length;

      if (!active) {
        return;
      }

      setUnreadMessageCount(directUnread + groupUnread);
      setUnreadAlertCount(friendReqUnread + postActivityUnread + incomingGroupReqUnread + groupUpdatesUnread);
    };

    void loadUnreadCounts();
    const id = setInterval(() => {
      void loadUnreadCounts();
    }, 5000);

    return () => {
      active = false;
      clearInterval(id);
    };
  }, [uid]);

  return (
    <Tabs.Navigator
      screenOptions={({ route }) => ({
        headerStyle: { backgroundColor: '#fef3c7', elevation: 2 },
        headerTitleStyle: { color: '#14532d', fontWeight: '900', fontSize: 18 },
        tabBarStyle: {
          backgroundColor: '#ffffff',
          borderTopColor: '#d1d5db',
          borderTopWidth: 1,
          height: 68,
          paddingBottom: 8,
          paddingTop: 4,
          elevation: 8,
          shadowColor: '#000',
          shadowOpacity: 0.1,
          shadowRadius: 12,
          shadowOffset: { width: 0, height: -4 },
        },
        tabBarActiveTintColor: '#16a34a',
        tabBarInactiveTintColor: '#9ca3af',
        tabBarLabelStyle: { fontSize: 11, fontWeight: '700', marginTop: 4 },
        tabBarBadgeStyle: {
          backgroundColor: '#dc2626',
          color: '#ffffff',
          fontSize: 10,
          fontWeight: '700',
          borderRadius: 10,
        },
        tabBarIcon: ({ color, size, focused }) => {
          const iconMap: Record<string, string> = {
            Community: 'home-outline',
            Messages: 'chat-outline',
            Alerts: 'bell-outline',
            Mentors: 'school-outline',
            Buddies: 'account-multiple-outline',
            Profile: 'account-circle-outline',
          };

          return (
            <MaterialCommunityIcons
              name={iconMap[route.name] as keyof typeof MaterialCommunityIcons.glyphMap}
              size={size}
              color={color}
            />
          );
        },
      })}
    >
      <Tabs.Screen name="Community" options={{ title: 'Community' }}>
        {() => <CommunityScreen uid={uid} />}
      </Tabs.Screen>
      <Tabs.Screen
        name="Messages"
        options={{
          title: 'Messages',
          tabBarBadge: unreadMessageCount > 0 ? toBadgeText(unreadMessageCount) : undefined,
        }}
      >
        {() => <MessagesScreen uid={uid} />}
      </Tabs.Screen>
      <Tabs.Screen
        name="Alerts"
        options={{
          title: 'Alerts',
          tabBarBadge: unreadAlertCount > 0 ? toBadgeText(unreadAlertCount) : undefined,
        }}
      >
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
