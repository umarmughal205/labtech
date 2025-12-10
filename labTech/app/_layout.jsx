import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, LogBox, Text, TouchableOpacity, View, useColorScheme } from 'react-native';
import { AuthProvider } from '../src/context/AuthContext';
import { ProfileProvider } from '../src/context/ProfileContext';
import { NotificationProvider, useNotifications } from '../src/context/NotificationContext';

function NotificationToast() {
  const { latestPopupNotification, clearLatestPopupNotification } = useNotifications();
  const [visible, setVisible] = useState(false);
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!latestPopupNotification) {
      return;
    }

    setVisible(true);
    opacity.setValue(0);
    Animated.timing(opacity, {
      toValue: 1,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      const timer = setTimeout(() => {
        Animated.timing(opacity, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }).start(() => {
          setVisible(false);
          clearLatestPopupNotification();
        });
      }, 3000);

      return () => clearTimeout(timer);
    });
  }, [latestPopupNotification]);

  if (!visible || !latestPopupNotification) {
    return null;
  }

  const handlePress = () => {
    Animated.timing(opacity, {
      toValue: 0,
      duration: 150,
      useNativeDriver: true,
    }).start(() => {
      setVisible(false);
      clearLatestPopupNotification();
    });
  };

  return (
    <Animated.View
      style={{
        position: 'absolute',
        top: 50,
        left: 16,
        right: 16,
        backgroundColor: '#111827',
        borderRadius: 12,
        paddingVertical: 10,
        paddingHorizontal: 14,
        elevation: 4,
        shadowColor: '#000',
        shadowOpacity: 0.25,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 4 },
        opacity,
        zIndex: 1000,
      }}
    >
      <TouchableOpacity onPress={handlePress} activeOpacity={0.9}>
        <Text style={{ color: '#E5E7EB', fontSize: 12, marginBottom: 2 }}>New notification</Text>
        <Text style={{ color: '#F9FAFB', fontSize: 14, fontWeight: '600' }} numberOfLines={1}>
          {latestPopupNotification.title}
        </Text>
        {latestPopupNotification.message ? (
          <Text
            style={{ color: '#D1D5DB', fontSize: 13, marginTop: 2 }}
            numberOfLines={2}
          >
            {latestPopupNotification.message}
          </Text>
        ) : null}
      </TouchableOpacity>
    </Animated.View>
  );
}

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [appIsReady, setAppIsReady] = useState(false);

  useEffect(() => {


    let mounted = true;
    const prepare = async () => {
      try {
        await SplashScreen.preventAutoHideAsync();
      } finally {
        if (mounted) setAppIsReady(true);
      }
    };
    prepare();
    return () => {
      mounted = false;
    };
  }, []);

  if (!appIsReady) {
    return null;
  }

  return (
    <AuthProvider>
      <View
        onLayout={async () => {
          if (appIsReady) {
            await SplashScreen.hideAsync();
          }
        }}
        style={{ flex: 1 }}
      >
        <ProfileProvider>
          <NotificationProvider>
            <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
              <NotificationToast />
              <Stack>
                <Stack.Screen name="index" options={{ headerShown: false }} />
                <Stack.Screen name="login" options={{ headerShown: false }} />
                <Stack.Screen name="signup" options={{ headerShown: false }} />
                <Stack.Screen name="home" options={{ headerShown: false }} />
                <Stack.Screen name="appointments" options={{ headerShown: false }} />
                <Stack.Screen name="healthpackages" options={{ headerShown: false }} />
                <Stack.Screen name="bookappointment" options={{ headerShown: false }} />
                <Stack.Screen name="payment" options={{ headerShown: false }} />
                <Stack.Screen name="reports" options={{ headerShown: false }} />
                <Stack.Screen name="settings" options={{ headerShown: false }} />
                <Stack.Screen name="profile" options={{ headerShown: false }} />
                <Stack.Screen name="notifications" options={{ headerShown: false }} />
                <Stack.Screen name="tests" options={{ headerShown: false }} />
                <Stack.Screen name="financereport" options={{ headerShown: false }} />
                <Stack.Screen name="admin-notifications" options={{ headerShown: false }} />
              </Stack>
            </ThemeProvider>
          </NotificationProvider>
        </ProfileProvider>
      </View>
    </AuthProvider>
  );
}
