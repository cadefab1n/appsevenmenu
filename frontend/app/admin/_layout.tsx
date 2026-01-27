import React, { useEffect, useState } from 'react';
import { Stack, useRouter } from 'expo-router';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function AdminLayout() {
  const router = useRouter();
  const [isChecking, setIsChecking] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const authToken = await AsyncStorage.getItem('admin_authenticated');
      const loginTime = await AsyncStorage.getItem('admin_login_time');
      
      if (authToken === 'true' && loginTime) {
        // Check if session is still valid (24 hours)
        const loginDate = new Date(loginTime);
        const now = new Date();
        const diffHours = (now.getTime() - loginDate.getTime()) / (1000 * 60 * 60);
        
        if (diffHours < 24) {
          setIsAuthenticated(true);
        } else {
          // Session expired
          await AsyncStorage.removeItem('admin_authenticated');
          await AsyncStorage.removeItem('admin_login_time');
          router.replace('/admin-login');
        }
      } else {
        router.replace('/admin-login');
      }
    } catch (error) {
      console.error('Auth check error:', error);
      router.replace('/admin-login');
    } finally {
      setIsChecking(false);
    }
  };

  if (isChecking) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#ffea07" />
      </View>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="categories" />
      <Stack.Screen name="products" />
      <Stack.Screen name="qrcode" />
    </Stack>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
  },
});
