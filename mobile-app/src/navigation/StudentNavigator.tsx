import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { StudentStackParamList, StudentTabParamList } from './types';
import { HomeScreen } from '../screens/student/HomeScreen';
import { NewSessionScreen } from '../screens/student/NewSessionScreen';
import { AnalyticsScreen } from '../screens/student/AnalyticsScreen';
import { ProfileScreen } from '../screens/common/ProfileScreen';
import { UploadsScreen } from '../screens/common/UploadsScreen';
import { PracticeHistoryScreen } from '../screens/student/PracticeHistoryScreen';
import { NotificationsScreen } from '../screens/common/NotificationsScreen';
import { NotificationSettingsScreen } from '../screens/common/NotificationSettingsScreen';
import { ForumListScreen } from '../screens/common/ForumListScreen';
import { PostDetailScreen } from '../screens/common/PostDetailScreen';
import { CreatePostScreen } from '../screens/common/CreatePostScreen';
import { LeaderboardScreen } from '../screens/common/LeaderboardScreen';
import ChallengesScreen from '../screens/common/ChallengesScreen';
import { PieceSelectionScreen } from '../screens/student/PieceSelectionScreen';
import { SegmentTrackingScreen } from '../screens/student/SegmentTrackingScreen';
import { PieceSummaryScreen } from '../screens/student/PieceSummaryScreen';
import { ArchivedPiecesScreen } from '../screens/student/ArchivedPiecesScreen';
import PracticePartnersScreen from '../screens/common/PracticePartnersScreen';
import { Colors } from '../constants/colors';
import { View, Text } from 'react-native';

const Stack = createNativeStackNavigator<StudentStackParamList>();
const Tab = createBottomTabNavigator<StudentTabParamList>();

const StudentTabs: React.FC = () => {
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
        name="Home"
        component={HomeScreen}
        options={{
          tabBarLabel: 'Home',
          tabBarIcon: ({ color, size }) => (
            <Text style={{ color, fontSize: size }}>🏠</Text>
          ),
        }}
      />
      <Tab.Screen
        name="Practice"
        component={PracticeHistoryScreen}
        options={{
          tabBarLabel: 'Practice',
          tabBarIcon: ({ color, size }) => (
            <Text style={{ color, fontSize: size }}>🎵</Text>
          ),
        }}
      />
      <Tab.Screen
        name="Analytics"
        component={AnalyticsScreen}
        options={{
          tabBarLabel: 'Progress',
          tabBarIcon: ({ color, size }) => (
            <Text style={{ color, fontSize: size }}>📊</Text>
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

export const StudentNavigator: React.FC = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: Colors.background },
      }}
    >
      <Stack.Screen name="StudentTabs" component={StudentTabs} />
      <Stack.Screen 
        name="NewSession" 
        component={NewSessionScreen}
        options={{
          headerShown: true,
          headerTitle: 'New Session',
          headerStyle: {
            backgroundColor: Colors.surface,
          },
          headerTintColor: Colors.text,
          headerTitleStyle: {
            fontWeight: '600',
          },
        }}
      />
      <Stack.Screen 
        name="Uploads" 
        component={UploadsScreen}
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen 
        name="Notifications" 
        component={NotificationsScreen}
        options={{
          headerShown: true,
          headerTitle: 'Notifications',
          headerStyle: {
            backgroundColor: Colors.surface,
          },
          headerTintColor: Colors.text,
          headerTitleStyle: {
            fontWeight: '600',
          },
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
        name="PieceSelection" 
        component={PieceSelectionScreen}
        options={{
          headerShown: true,
          headerTitle: 'Musical Pieces',
          headerStyle: {
            backgroundColor: Colors.surface,
          },
          headerTintColor: Colors.text,
          headerTitleStyle: {
            fontWeight: '600',
          },
        }}
      />
      <Stack.Screen 
        name="SegmentTracking" 
        component={SegmentTrackingScreen}
        options={{
          headerShown: false, // Screen handles its own header
        }}
      />
      <Stack.Screen 
        name="PieceSummary" 
        component={PieceSummaryScreen}
        options={{
          headerShown: true,
          headerTitle: 'Archive Piece',
          headerStyle: {
            backgroundColor: Colors.surface,
          },
          headerTintColor: Colors.text,
          headerTitleStyle: {
            fontWeight: '600',
          },
        }}
      />
      <Stack.Screen 
        name="ArchivedPieces" 
        component={ArchivedPiecesScreen}
        options={{
          headerShown: true,
          headerTitle: 'Archived Pieces',
          headerStyle: {
            backgroundColor: Colors.surface,
          },
          headerTintColor: Colors.text,
          headerTitleStyle: {
            fontWeight: '600',
          },
        }}
      />
      <Stack.Screen 
        name="PracticePartners" 
        component={PracticePartnersScreen}
        options={{
          headerShown: false, // Screen handles its own header
        }}
      />
    </Stack.Navigator>
  );
};