import 'react-native-get-random-values';
import { StatusBar } from 'expo-status-bar';
import { Provider } from 'react-redux';
import { QueryClientProvider } from '@tanstack/react-query';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StatusBar as RNStatusBar, Platform } from 'react-native';
import * as NavigationBar from 'expo-navigation-bar';
import { store } from './src/store';
import { queryClient } from './src/services/queryClient';
import { RootNavigator } from './src/navigation/RootNavigator';
import { NotificationProvider } from './src/components/NotificationProvider';
import { ErrorBoundary } from './src/utils/errorBoundary';
import { setupAuthEventListeners } from './src/store/auth-listener';

export default function App() {
  useEffect(() => {
    // Set up auth event listeners when app initializes
    setupAuthEventListeners();
    
    // Configure system bars for immersive experience
    if (Platform.OS === 'android') {
      // Make status bar translucent on Android
      RNStatusBar.setTranslucent(true);
      RNStatusBar.setBackgroundColor('transparent');
      RNStatusBar.setBarStyle('dark-content');
      
      // Configure navigation bar
      NavigationBar.setBackgroundColorAsync('transparent');
      NavigationBar.setButtonStyleAsync('dark');
      NavigationBar.setPositionAsync('absolute');
    }
    
    // For iOS, the status bar is handled by the StatusBar component below
  }, []);
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ErrorBoundary>
        <Provider store={store}>
          <QueryClientProvider client={queryClient}>
            <RootNavigator />
            <StatusBar style="dark" translucent backgroundColor="transparent" />
          </QueryClientProvider>
        </Provider>
      </ErrorBoundary>
    </GestureHandlerRootView>
  );
}
