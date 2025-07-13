import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Platform } from 'react-native';
import { Colors } from '../constants/colors';
import { Button } from '../components/common/Button';

export const TestConnectionScreen: React.FC = () => {
  const [results, setResults] = useState<string[]>([]);
  const [testing, setTesting] = useState(false);

  const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

  const addResult = (message: string) => {
    setResults(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  const testConnection = async () => {
    setTesting(true);
    setResults([]);

    try {
      // 1. Show API URL being used
      addResult(`API URL: ${API_URL}`);

      // 2. Test direct health endpoint
      addResult('Testing health endpoint...');
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);
        
        const healthResponse = await fetch(`${API_URL}/health`, {
          signal: controller.signal,
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });
        
        clearTimeout(timeoutId);
        
        if (healthResponse.ok) {
          const data = await healthResponse.json();
          addResult(`✅ Health check passed: ${JSON.stringify(data)}`);
        } else {
          addResult(`❌ Health check failed: ${healthResponse.status} ${healthResponse.statusText}`);
        }
      } catch (error: any) {
        if (error.name === 'AbortError') {
          addResult('❌ Health check timed out after 10 seconds');
        } else {
          addResult(`❌ Health check error: ${error.message}`);
        }
      }

      // 3. Test login endpoint
      addResult('Testing login endpoint...');
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);
        
        const loginResponse = await fetch(`${API_URL}/auth/login`, {
          signal: controller.signal,
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email: 'test@test.com',
            password: 'wrongpassword',
          }),
        });
        
        clearTimeout(timeoutId);
        
        if (loginResponse.status === 401) {
          addResult('✅ Login endpoint reachable (got expected 401)');
        } else {
          addResult(`⚠️ Login endpoint returned: ${loginResponse.status}`);
        }
      } catch (error: any) {
        if (error.name === 'AbortError') {
          addResult('❌ Login endpoint timed out after 10 seconds');
        } else {
          addResult(`❌ Login endpoint error: ${error.message}`);
        }
      }

      // 4. Check if using correct IP
      addResult('\n📱 For physical devices:');
      addResult('1. Find your computer\'s IP: ipconfig (Windows) or ifconfig (Mac/Linux)');
      addResult('2. Update .env: EXPO_PUBLIC_API_URL=http://YOUR_IP:8000/api/v1');
      addResult('3. Restart Expo: npx expo start -c');
      
      addResult('\n🖥️ For emulators:');
      addResult('Android: Use http://10.0.2.2:8000/api/v1');
      addResult('iOS Simulator: Use http://localhost:8000/api/v1');

    } catch (error: any) {
      addResult(`❌ Unexpected error: ${error.message}`);
    } finally {
      setTesting(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Connection Test</Text>
      
      <View style={styles.info}>
        <Text style={styles.infoText}>Current API URL:</Text>
        <Text style={styles.apiUrl}>{API_URL}</Text>
      </View>

      <Button
        title={testing ? 'Testing...' : 'Test Connection'}
        onPress={testConnection}
        loading={testing}
        disabled={testing}
        size="large"
      />

      <View style={styles.results}>
        <Text style={styles.resultsTitle}>Results:</Text>
        {results.map((result, index) => (
          <Text 
            key={index} 
            style={[
              styles.resultText,
              result.includes('✅') && styles.successText,
              result.includes('❌') && styles.errorText,
              result.includes('⚠️') && styles.warningText,
            ]}
          >
            {result}
          </Text>
        ))}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 20,
  },
  info: {
    backgroundColor: Colors.surface,
    padding: 16,
    borderRadius: 8,
    marginBottom: 20,
  },
  infoText: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 4,
  },
  apiUrl: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.primary,
  },
  results: {
    marginTop: 20,
    backgroundColor: Colors.surface,
    padding: 16,
    borderRadius: 8,
    minHeight: 200,
  },
  resultsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 12,
  },
  resultText: {
    fontSize: 14,
    color: Colors.text,
    marginBottom: 8,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  successText: {
    color: Colors.success,
  },
  errorText: {
    color: Colors.error,
  },
  warningText: {
    color: Colors.warning,
  },
});