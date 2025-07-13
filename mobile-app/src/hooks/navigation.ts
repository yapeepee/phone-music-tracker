import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AuthStackParamList, StudentStackParamList, TeacherStackParamList } from '../navigation/types';

export const useAuthNavigation = () => {
  return useNavigation<NativeStackNavigationProp<AuthStackParamList>>();
};

export const useStudentNavigation = () => {
  return useNavigation<NativeStackNavigationProp<StudentStackParamList>>();
};

export const useTeacherNavigation = () => {
  return useNavigation<NativeStackNavigationProp<TeacherStackParamList>>();
};