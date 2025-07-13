import { useNavigation } from '@react-navigation/native';
import { useEffect, useState } from 'react';

export const useSafeNavigation = () => {
  const [isNavigationReady, setIsNavigationReady] = useState(false);
  const navigation = useNavigation();

  useEffect(() => {
    // Check if navigation is ready
    if (navigation) {
      setIsNavigationReady(true);
    }
  }, [navigation]);

  const safeNavigate = (name: string, params?: any) => {
    if (isNavigationReady && navigation) {
      (navigation as any).navigate(name, params);
    }
  };

  const safeGoBack = () => {
    if (isNavigationReady && navigation && navigation.canGoBack()) {
      navigation.goBack();
    }
  };

  return {
    navigation: isNavigationReady ? navigation : null,
    safeNavigate,
    safeGoBack,
    isNavigationReady,
  };
};