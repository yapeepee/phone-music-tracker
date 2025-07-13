import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { TeacherStackParamList, TeacherTabParamList } from './types';
import { DashboardScreen } from '../screens/teacher/DashboardScreen';
import { StudentsListScreen } from '../screens/teacher/StudentsListScreen';
import { StudentProfileScreen } from '../screens/teacher/StudentProfileScreen';
import { SessionDetailScreen } from '../screens/teacher/SessionDetailScreen';
import { VideoAnnotationScreen } from '../screens/teacher/VideoAnnotationScreen';
import { TagManagementScreen } from '../screens/teacher/TagManagementScreen';
import { CreateTagScreen } from '../screens/teacher/CreateTagScreen';
import { EditTagScreen } from '../screens/teacher/EditTagScreen';
import { ProfileScreen } from '../screens/common/ProfileScreen';
import { NotificationsScreen } from '../screens/common/NotificationsScreen';
import { NotificationSettingsScreen } from '../screens/common/NotificationSettingsScreen';
import { ForumListScreen } from '../screens/common/ForumListScreen';
import { PostDetailScreen } from '../screens/common/PostDetailScreen';
import { CreatePostScreen } from '../screens/common/CreatePostScreen';
import { LeaderboardScreen } from '../screens/common/LeaderboardScreen';
import ChallengesScreen from '../screens/common/ChallengesScreen';
import { ScheduleScreen } from '../screens/teacher/ScheduleScreen';
import { EventDetailsScreen } from '../screens/teacher/EventDetailsScreen';
import { CreateEventScreen } from '../screens/teacher/CreateEventScreen';
import PracticePartnersScreen from '../screens/common/PracticePartnersScreen';
import { Colors } from '../constants/colors';
import { View, Text } from 'react-native';

const Stack = createNativeStackNavigator<TeacherStackParamList>();
const Tab = createBottomTabNavigator<TeacherTabParamList>();

// Placeholder screens

const TeacherTabs: React.FC = () => {
  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.textSecondary,
        tabBarStyle: {
          backgroundColor: Colors.surface,
          borderTopColor: Colors.border,
          borderTopWidth: 1,
          paddingBottom: 4,
          paddingTop: 4,
          height: 60,
        },
        headerStyle: {
          backgroundColor: Colors.surface,
          shadowColor: 'transparent',
          elevation: 0,
        },
        headerTitleStyle: {
          fontWeight: '600',
          fontSize: 18,
        },
      }}
    >
      <Tab.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{
          tabBarLabel: 'Dashboard',
          tabBarIcon: ({ color, size }) => (
            <Text style={{ color, fontSize: size }}>📊</Text>
          ),
        }}
      />
      <Tab.Screen
        name="Students"
        component={StudentsListScreen}
        options={{
          tabBarLabel: 'Students',
          tabBarIcon: ({ color, size }) => (
            <Text style={{ color, fontSize: size }}>👥</Text>
          ),
        }}
      />
      <Tab.Screen
        name="Schedule"
        component={ScheduleScreen}
        options={{
          tabBarLabel: 'Schedule',
          tabBarIcon: ({ color, size }) => (
            <Text style={{ color, fontSize: size }}>📅</Text>
          ),
        }}
      />
      <Tab.Screen
        name="Community"
        component={ForumListScreen}
        options={{
          tabBarLabel: 'Community',
          tabBarIcon: ({ color, size }) => (
            <Text style={{ color, fontSize: size }}>💬</Text>
          ),
          headerShown: false,
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          tabBarLabel: 'Profile',
          tabBarIcon: ({ color, size }) => (
            <Text style={{ color, fontSize: size }}>👤</Text>
          ),
        }}
      />
    </Tab.Navigator>
  );
};

export const TeacherNavigator: React.FC = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: Colors.background },
      }}
    >
      <Stack.Screen name="TeacherTabs" component={TeacherTabs} />
      <Stack.Screen 
        name="StudentProfile" 
        component={StudentProfileScreen}
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen 
        name="SessionDetail" 
        component={SessionDetailScreen}
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen 
        name="VideoAnnotation" 
        component={VideoAnnotationScreen}
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen 
        name="TagManagement" 
        component={TagManagementScreen}
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen 
        name="CreateTag" 
        component={CreateTagScreen}
        options={{
          headerShown: true,
          title: 'Create Tag',
          headerStyle: {
            backgroundColor: Colors.surface,
          },
          headerTintColor: Colors.text,
        }}
      />
      <Stack.Screen 
        name="EditTag" 
        component={EditTagScreen}
        options={{
          headerShown: true,
          title: 'Edit Tag',
          headerStyle: {
            backgroundColor: Colors.surface,
          },
          headerTintColor: Colors.text,
        }}
      />
      <Stack.Screen 
        name="Notifications" 
        component={NotificationsScreen}
        options={{
          headerShown: true,
          title: 'Notifications',
          headerStyle: {
            backgroundColor: Colors.surface,
          },
          headerTintColor: Colors.text,
        }}
      />
      <Stack.Screen 
        name="NotificationSettings" 
        component={NotificationSettingsScreen}
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen 
        name="PostDetail" 
        component={PostDetailScreen}
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen 
        name="CreatePost" 
        component={CreatePostScreen}
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen 
        name="Leaderboard" 
        component={LeaderboardScreen}
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen 
        name="Challenges" 
        component={ChallengesScreen}
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen 
        name="EventDetails" 
        component={EventDetailsScreen}
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen 
        name="CreateEvent" 
        component={CreateEventScreen}
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen 
        name="PracticePartners" 
        component={PracticePartnersScreen}
        options={{
          headerShown: false, // Screen handles its own header
        }}
      />
      {/* Additional screens will be added here */}
    </Stack.Navigator>
  );
};