import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useAppDispatch } from '../../hooks/redux';
import { useAuthNavigation } from '../../hooks/navigation';
import { loginStart, loginSuccess, loginFailure } from '../../store/slices/authSlice';
import authService from '../../services/auth.service';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { Colors } from '../../constants/colors';

export const RegisterScreen: React.FC = () => {
  const dispatch = useAppDispatch();
  const navigation = useAuthNavigation();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'student' as 'student' | 'teacher',
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name) {
      newErrors.name = 'Name is required';
    }

    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email';
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleRegister = async () => {
    if (!validateForm()) return;

    setLoading(true);
    dispatch(loginStart());

    try {
      const response = await authService.register({
        full_name: formData.name,
        email: formData.email,
        password: formData.password,
        role: formData.role,
      });
      
      dispatch(loginSuccess({
        user: response.user,
        accessToken: response.tokens.accessToken,
        refreshToken: response.tokens.refreshToken,
      }));
    } catch (error: any) {
      dispatch(loginFailure(error.message || 'Registration failed'));
      Alert.alert('Registration Failed', error.message || 'Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const updateFormData = (key: string, value: string) => {
    setFormData(prev => ({ ...prev, [key]: value }));
    if (errors[key]) {
      setErrors(prev => ({ ...prev, [key]: '' }));
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <Text style={styles.title}>Create Account</Text>
          <Text style={styles.subtitle}>Join the music practice community</Text>
        </View>

        <View style={styles.form}>
          <View style={styles.roleSelector}>
            <Text style={styles.roleLabel}>I am a:</Text>
            <View style={styles.roleButtons}>
              <TouchableOpacity
                style={[
                  styles.roleButton,
                  formData.role === 'student' && styles.roleButtonActive,
                ]}
                onPress={() => updateFormData('role', 'student')}
              >
                <Text
                  style={[
                    styles.roleButtonText,
                    formData.role === 'student' && styles.roleButtonTextActive,
                  ]}
                >
                  Student
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.roleButton,
                  formData.role === 'teacher' && styles.roleButtonActive,
                ]}
                onPress={() => updateFormData('role', 'teacher')}
              >
                <Text
                  style={[
                    styles.roleButtonText,
                    formData.role === 'teacher' && styles.roleButtonTextActive,
                  ]}
                >
                  Teacher
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          <Input
            label="Full Name"
            placeholder="Enter your full name"
            value={formData.name}
            onChangeText={(value) => updateFormData('name', value)}
            error={errors.name}
            autoCapitalize="words"
          />

          <Input
            label="Email"
            placeholder="Enter your email"
            value={formData.email}
            onChangeText={(value) => updateFormData('email', value)}
            error={errors.email}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
          />

          <Input
            label="Password"
            placeholder="Create a password"
            value={formData.password}
            onChangeText={(value) => updateFormData('password', value)}
            error={errors.password}
            secureTextEntry
            showPasswordToggle
          />

          <Input
            label="Confirm Password"
            placeholder="Confirm your password"
            value={formData.confirmPassword}
            onChangeText={(value) => updateFormData('confirmPassword', value)}
            error={errors.confirmPassword}
            secureTextEntry
            showPasswordToggle
          />

          <Button
            title="Sign Up"
            onPress={handleRegister}
            loading={loading}
            size="large"
            style={styles.registerButton}
          />

          <TouchableOpacity style={styles.loginLink} onPress={() => navigation.navigate('Login')}>
            <Text style={styles.loginText}>
              Already have an account? <Text style={styles.loginTextBold}>Sign In</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingVertical: 48,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: Colors.textSecondary,
  },
  form: {
    flex: 1,
  },
  roleSelector: {
    marginBottom: 24,
  },
  roleLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.text,
    marginBottom: 8,
  },
  roleButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  roleButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
  },
  roleButtonActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  roleButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.textSecondary,
  },
  roleButtonTextActive: {
    color: Colors.surface,
  },
  registerButton: {
    marginTop: 24,
    marginBottom: 24,
  },
  loginLink: {
    alignItems: 'center',
  },
  loginText: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  loginTextBold: {
    color: Colors.primary,
    fontWeight: '600',
  },
});