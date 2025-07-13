import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAppSelector } from '../hooks/redux';
import { RootStackParamList } from './types';
import { AuthNavigator } from './AuthNavigator';
import { StudentNavigator } from './StudentNavigator';
import { TeacherNavigator } from './TeacherNavigator';
import { NotificationProvider } from '../components/NotificationProvider';

const Stack = createNativeStackNavigator<RootStackParamList>();

export const RootNavigator: React.FC = () => {
  const { isAuthenticated, user } = useAppSelector((state) => state.auth);

  return (
    <NavigationContainer>
      <NotificationProvider>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          {!isAuthenticated ? (
            <Stack.Screen name="Auth" component={AuthNavigator} />
          ) : user?.role === 'student' ? (
            <Stack.Screen name="Student" component={StudentNavigator} />
          ) : (
            <Stack.Screen name="Teacher" component={TeacherNavigator} />
          )}
        </Stack.Navigator>
      </NotificationProvider>
    </NavigationContainer>
  );
};