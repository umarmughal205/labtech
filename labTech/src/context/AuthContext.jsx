import React, { createContext, useContext, useState, useEffect } from 'react';
import * as SecureStore from 'expo-secure-store';
import { API_ENDPOINTS } from '../config/api';
import { registerForPushNotificationsAsync } from '../utils/notifications';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [userRole, setUserRole] = useState(null); // 'patient' or 'admin'
  const [isLoading, setIsLoading] = useState(true);
  const [authToken, setAuthToken] = useState(null);
  const [hasRegisteredPushToken, setHasRegisteredPushToken] = useState(false);

  // Load user data from storage on app start
  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      const token = await SecureStore.getItemAsync('authToken');
      const role = await SecureStore.getItemAsync('userRole');
      const userData = await SecureStore.getItemAsync('userData');

      if (token && role && userData) {
        setAuthToken(token);
        setUserRole(role);
        setUser(JSON.parse(userData));
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Register Expo push token once per session when we have an authenticated user
  useEffect(() => {
    const registerPushToken = async () => {
      if (!authToken || !user || hasRegisteredPushToken) {
        return;
      }

      const expoPushToken = await registerForPushNotificationsAsync();
      if (!expoPushToken) {
        setHasRegisteredPushToken(true);
        return;
      }

      try {
        await fetch(API_ENDPOINTS.PROFILE_PUSH_TOKEN, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${authToken}`,
          },
          body: JSON.stringify({ expoPushToken }),
        });
      } catch (err) {
        console.warn('Error sending expoPushToken to backend:', err);
      } finally {
        setHasRegisteredPushToken(true);
      }
    };

    registerPushToken();
  }, [authToken, user, hasRegisteredPushToken]);

  /**
   * Login function - Ready for backend API integration
   * 
   * @param {string} email - User email or phone
   * @param {string} password - User password
   * @param {string} role - User role ('patient' or 'admin')
   * @returns {Promise} - Returns user data and token from backend
   * 
   * Backend API should return:
   * {
   *   success: true,
   *   token: 'jwt_token_here',
   *   user: {
   *     id: 123,
   *     email: 'user@example.com',
   *     name: 'John Doe',
   *     role: 'patient' or 'admin',
   *     ...other user data
   *   }
   * }
   */
  const login = async (email, password) => {
    try {
      const response = await fetch(API_ENDPOINTS.LOGIN, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          emailOrPhone: email.trim(),
          password,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Login failed');
      }

      const returnedRole = data.user.role || 'patient';

      await SecureStore.setItemAsync('authToken', data.token);
      await SecureStore.setItemAsync('userRole', returnedRole);
      await SecureStore.setItemAsync('userData', JSON.stringify(data.user));

      setAuthToken(data.token);
      setUserRole(returnedRole);
      setUser(data.user);

      return { success: true, user: data.user, role: returnedRole };
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  };

  /**
   * Logout function
   */
  const logout = async () => {
    try {
      // TODO: Call backend logout endpoint if needed
      /*
      await fetch('YOUR_API_URL/api/auth/logout', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
        },
      });
      */

      // Clear storage
      await SecureStore.deleteItemAsync('authToken');
      await SecureStore.deleteItemAsync('userRole');
      await SecureStore.deleteItemAsync('userData');

      // Clear state
      setAuthToken(null);
      setUserRole(null);
      setUser(null);
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  /**
   * Check if user is authenticated
   */
  const isAuthenticated = () => {
    return !!authToken && !!user && !!userRole;
  };

  /**
   * Check if user is admin
   */
  const isAdmin = () => {
    return userRole === 'admin';
  };

  /**
   * Check if user is patient
   */
  const isPatient = () => {
    return userRole === 'patient';
  };

  const value = {
    user,
    userRole,
    authToken,
    isLoading,
    login,
    logout,
    isAuthenticated,
    isAdmin,
    isPatient,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
