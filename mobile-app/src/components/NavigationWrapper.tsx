import React from 'react';
import { NavigationContainer } from '@react-navigation/native';

interface NavigationWrapperProps {
  children: React.ReactNode;
}

export const NavigationWrapper: React.FC<NavigationWrapperProps> = ({ children }) => {
  return (
    <NavigationContainer>
      {children}
    </NavigationContainer>
  );
};