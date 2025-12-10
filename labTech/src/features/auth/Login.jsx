import React, { useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Image, ScrollView, useWindowDimensions, Alert, Modal, KeyboardAvoidingView, Platform, StatusBar } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth } from '../../context/AuthContext';

export default function Login({ navigation }) {
  const router = useRouter();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showForgotPasswordModal, setShowForgotPasswordModal] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotEmailError, setForgotEmailError] = useState('');
  const [isSendingReset, setIsSendingReset] = useState(false);
  const [showSnackbar, setShowSnackbar] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const { width, height } = useWindowDimensions();

  const isLandscape = width > height;
  const isSmall = width < 360 || height < 700;
  const isTablet = Math.max(width, height) >= 900;

  const sidePad = isTablet ? 28 : isSmall ? 16 : 20;
  const bottomPad = isTablet ? 36 : isSmall ? 20 : 28;
  const heroHeight = isLandscape
    ? Math.max(140, Math.min(220, height * 0.45))
    : isTablet
    ? Math.min(280, height * 0.28)
    : Math.min(240, height * 0.26);
  const titleSize = isTablet ? 24 : isSmall ? 20 : 22;
  const subtitleSize = isTablet ? 16 : isSmall ? 13 : 14;
  const inputHeight = isTablet ? 52 : isSmall ? 46 : 48;
  const ctaPadV = isTablet ? 16 : isSmall ? 12 : 14;

  // Logo uses local asset so it renders instantly without waiting for async loading

  // Validation functions
  const validateEmail = (input) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
    
    if (!input.trim()) {
      return 'Email or phone number is required';
    }
    
    // Check if it's a phone number (starts with + or is all digits)
    if (phoneRegex.test(input.replace(/[\s\-\(\)]/g, ''))) {
      const cleanPhone = input.replace(/[\s\-\(\)]/g, '');
      if (cleanPhone.length < 10 || cleanPhone.length > 15) {
        return 'Phone number must be between 10-15 digits';
      }
      return null;
    }
    
    // Otherwise validate as email
    if (!emailRegex.test(input)) {
      return 'Please enter a valid email address';
    }
    
    return null;
  };

  const validatePassword = (password) => {
    if (!password) {
      return 'Password is required';
    }
    
    if (password.length < 8) {
      return 'Password must be at least 8 characters long';
    }
    
    if (!/(?=.*[a-z])/.test(password)) {
      return 'Password must contain at least one lowercase letter';
    }
    
    if (!/(?=.*[A-Z])/.test(password)) {
      return 'Password must contain at least one uppercase letter';
    }
    
    if (!/(?=.*\d)/.test(password)) {
      return 'Password must contain at least one number';
    }
    
    if (!/(?=.*[@$!%*?&])/.test(password)) {
      return 'Password must contain at least one special character (@$!%*?&)';
    }
    
    return null;
  };

  const validateForm = () => {
    const newErrors = {};
    
    const emailError = validateEmail(email);
    if (emailError) newErrors.email = emailError;
    
    const passwordError = validatePassword(password);
    if (passwordError) newErrors.password = passwordError;
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleEmailChange = (text) => {
    setEmail(text);
    if (errors.email) {
      const emailError = validateEmail(text);
      setErrors(prev => ({
        ...prev,
        email: emailError
      }));
    }
  };

  const handlePasswordChange = (text) => {
    setPassword(text);
    if (errors.password) {
      const passwordError = validatePassword(text);
      setErrors(prev => ({
        ...prev,
        password: passwordError
      }));
    }
  };

  const showSuccessSnackbar = (message) => {
    setSnackbarMessage(message);
    setShowSnackbar(true);
    // Auto hide after 2 seconds
    setTimeout(() => {
      setShowSnackbar(false);
    }, 1000);
  };

  const handleLogin = async () => {
    if (!validateForm()) {
      Alert.alert('Validation Error', 'Please fix the errors below and try again.');
      return;
    }

    setIsLoading(true);
    
    try {
      // Simulate API call delay for better UX
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // For demo purposes, accept any valid email/password combination
      // TODO: Replace with your actual API endpoint when ready
      // Call login from AuthContext (handles API call and storage)
      const result = await login(email.trim(), password);
      
      if (result.success) {
        // Navigate based on user role returned from backend
        if (result.role === 'admin') {
          showSuccessSnackbar('Admin login successful!');
          setTimeout(() => {
            router.push('/financereport'); // Navigate to admin panel
          }, 1500);
        } else {
          showSuccessSnackbar('Login successful!');
          setTimeout(() => {
            router.push('/home'); // Navigate to patient panel
          }, 1500);
        }
      }
      
    } catch (error) {
      const errorMessage = error.message || 'An unexpected error occurred. Please try again.';
      Alert.alert('Login Failed', errorMessage);
      console.error('Login error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const validateForgotEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    
    if (!email.trim()) {
      return 'Email is required';
    }
    
    if (!emailRegex.test(email)) {
      return 'Please enter a valid email address';
    }
    
    return null;
  };

  const handleForgotEmailChange = (text) => {
    setForgotEmail(text);
    if (forgotEmailError) {
      const error = validateForgotEmail(text);
      setForgotEmailError(error || '');
    }
  };

  const handleSendResetEmail = async () => {
    const emailError = validateForgotEmail(forgotEmail);
    if (emailError) {
      setForgotEmailError(emailError);
      return;
    }

    setIsSendingReset(true);
    
    try {
      // Simulate API call delay for better UX
      await new Promise(resolve => setTimeout(resolve, 1200));
      
      // For demo purposes, always show success message
      // TODO: Replace with your actual API endpoint when ready
      /*
      const response = await fetch('YOUR_API_ENDPOINT/auth/forgot-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: forgotEmail.trim(),
        }),
      });

      const data = await response.json();

      if (response.ok) {
        Alert.alert(
          'Reset Email Sent', 
          'If an account with this email exists, you will receive a password reset link shortly.',
          [{ text: 'OK', onPress: () => setShowForgotPasswordModal(false) }]
        );
        setForgotEmail('');
        setForgotEmailError('');
      } else {
        Alert.alert('Error', data.message || 'Failed to send reset email');
      }
      */

      // Demo forgot password - remove this when you have a real API
      Alert.alert(
        'Reset Email Sent', 
        'If an account with this email exists, you will receive a password reset link shortly.',
        [{ text: 'OK', onPress: () => setShowForgotPasswordModal(false) }]
      );
      setForgotEmail('');
      setForgotEmailError('');
      
    } catch (error) {
      Alert.alert('Error', 'An unexpected error occurred. Please try again.');
      console.error('Forgot password error:', error);
    } finally {
      setIsSendingReset(false);
    }
  };

  const closeForgotPasswordModal = () => {
    setShowForgotPasswordModal(false);
    setForgotEmail('');
    setForgotEmailError('');
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" translucent={false} />
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView contentContainerStyle={[styles.content, { paddingHorizontal: sidePad, paddingBottom: bottomPad, flexGrow: 1, justifyContent: 'center' }]} showsVerticalScrollIndicator={false}>

        <View style={styles.iconWrapper}>
          <View style={styles.iconCircle}>
            <Image
              source={require('../../../assets/images/app_icon.png')}
              style={styles.iconImage}
              resizeMode="cover"
            />
          </View>
        </View>

        <Text style={[styles.title, { fontSize: titleSize }]}>Login</Text>
        <Text style={[styles.subtitle, { fontSize: subtitleSize }]}>Welcome back! Please enter your details to continue.</Text>

        <View style={styles.field}>
          <Text style={styles.label}>Email/Phone</Text>
          <TextInput
            style={[styles.input, { height: inputHeight }, errors.email && styles.inputError]}
            placeholder="Enter your email or phone"
            placeholderTextColor="#8A94A6"
            value={email}
            onChangeText={handleEmailChange}
            keyboardType="email-address"
            autoCapitalize="none"
          />
          {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Password</Text>
          <View style={styles.passwordContainer}>
            <TextInput
              style={[styles.passwordInput, { height: inputHeight }, errors.password && styles.inputError]}
              placeholder="Enter your password"
              placeholderTextColor="#8A94A6"
              value={password}
              onChangeText={handlePasswordChange}
              secureTextEntry={!showPassword}
            />
            <TouchableOpacity 
              style={styles.eyeButton}
              onPress={() => setShowPassword(!showPassword)}
            >
              <Ionicons 
                name={showPassword ? 'eye-off' : 'eye'} 
                size={20} 
                color="#8A94A6" 
              />
            </TouchableOpacity>
          </View>
          {errors.password && <Text style={styles.errorText}>{errors.password}</Text>}
        </View>

        <TouchableOpacity 
          style={[styles.loginBtn, { paddingVertical: ctaPadV }, isLoading && styles.loginBtnDisabled]} 
          onPress={handleLogin}
          disabled={isLoading}
        >
          <Text style={styles.loginText}>{isLoading ? 'Logging in...' : 'Login'}</Text>
        </TouchableOpacity>

        <View style={styles.linksRow}>
          <TouchableOpacity onPress={() => setShowForgotPasswordModal(true)}>
            <Text style={styles.link}>Forgot Password?</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.footerRow}>
          <Text style={styles.footerText}>Don't have an account? </Text>
          <TouchableOpacity onPress={() => router.push('/signup')}>
            <Text style={styles.link}>Sign Up</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Forgot Password Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={showForgotPasswordModal}
        onRequestClose={closeForgotPasswordModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Reset Password</Text>
              <TouchableOpacity 
                style={styles.closeButton}
                onPress={closeForgotPasswordModal}
              >
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>
            
            <Text style={styles.modalDescription}>
              Enter your email address and we'll send you a link to reset your password.
            </Text>
            
            <View style={styles.modalField}>
              <Text style={styles.modalLabel}>Email Address</Text>
              <TextInput
                style={[styles.modalInput, forgotEmailError && styles.inputError]}
                placeholder="Enter your email"
                placeholderTextColor="#8A94A6"
                value={forgotEmail}
                onChangeText={handleForgotEmailChange}
                keyboardType="email-address"
                autoCapitalize="none"
                autoFocus={true}
              />
              {forgotEmailError ? <Text style={styles.errorText}>{forgotEmailError}</Text> : null}
            </View>
            
            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={styles.cancelButton}
                onPress={closeForgotPasswordModal}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.sendButton, isSendingReset && styles.loginBtnDisabled]}
                onPress={handleSendResetEmail}
                disabled={isSendingReset}
              >
                <Text style={styles.sendButtonText}>
                  {isSendingReset ? 'Sending...' : 'Send Reset Link'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Success Snackbar */}
      {showSnackbar && (
        <View style={styles.snackbar}>
          <View style={styles.snackbarContent}>
            <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
            <Text style={styles.snackbarText}>{snackbarMessage}</Text>
          </View>
        </View>
      )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 24,
  },
  iconWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  iconCircle: {
    width: 110,
    height: 110,
    borderRadius: 60,
    backgroundColor: '#2563EB',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  iconImage: {
    width: '100%',
    height: '100%',
    borderRadius: 60,
  },
  cardImg: {
    backgroundColor: 'white',
    borderTopLeftRadius: 0,
    borderTopRightRadius: 100,
    borderBottomRightRadius: 0,
    borderBottomLeftRadius: 100,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    marginVertical: 12,
  },
  hero: {
    width: '100%',
    height: 180,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#0F172A',
    marginTop: 12,
    textAlign: 'center'
  },
  subtitle: {
    fontSize: 16,
    color: '#64748B',
    marginTop: 4,
    marginBottom: 16,
     textAlign: 'center'
  },
  keyboardView: {
    flex: 1,
  },
  field: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0F172A',
    marginBottom: 8,
  },
  input: {
    height: 48,
    backgroundColor: '#EEF1F6',
    borderRadius: 12,
    paddingHorizontal: 14,
    color: '#0F172A',
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EEF1F6',
    borderRadius: 12,
    position: 'relative',
  },
  passwordInput: {
    flex: 1,
    height: 48,
    paddingHorizontal: 14,
    paddingRight: 50,
    color: '#0F172A',
    backgroundColor: 'transparent',
  },
  eyeButton: {
    position: 'absolute',
    right: 14,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    width: 30,
  },
  loginBtn: {
    backgroundColor: '#3B82F6',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  loginText: {
    color: 'white',
    fontWeight: '700',
    fontSize: 18,
  },
  linksRow: {
    alignItems: 'flex-end',
    marginTop: 12,
  },
  link: {
    color: '#2563EB',
    fontWeight: '600',
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 24,
  },
  footerText: {
    color: '#64748B',
  },
  inputError: {
    borderWidth: 1,
    borderColor: '#EF4444',
    backgroundColor: '#FEF2F2',
  },
  errorText: {
    color: '#EF4444',
    fontSize: 12,
    marginTop: 4,
    marginLeft: 4,
  },
  loginBtnDisabled: {
    backgroundColor: '#94A3B8',
    opacity: 0.7,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContainer: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#0F172A',
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 16,
    color: '#64748B',
    fontWeight: 'bold',
  },
  modalDescription: {
    fontSize: 14,
    color: '#64748B',
    marginBottom: 20,
    lineHeight: 20,
  },
  modalField: {
    marginBottom: 20,
  },
  modalLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0F172A',
    marginBottom: 8,
  },
  modalInput: {
    height: 48,
    backgroundColor: '#EEF1F6',
    borderRadius: 12,
    paddingHorizontal: 14,
    color: '#0F172A',
    fontSize: 16,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    height: 48,
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#64748B',
    fontWeight: '600',
    fontSize: 16,
  },
  sendButton: {
    flex: 1,
    height: 48,
    backgroundColor: '#3B82F6',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonText: {
    color: 'white',
    fontWeight: '700',
    fontSize: 10,
  },
  snackbar: {
    position: 'absolute',
    bottom: 30,
    left: '25%',
    width: '50%',
    backgroundColor: '#059669',
    borderRadius: 20,
    paddingVertical: 5,
    paddingHorizontal: 20,
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    zIndex: 1000,
  },
  snackbarContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  snackbarText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  roleSelectorContainer: {
    marginBottom: 20,
  },
  roleSelectorLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0F172A',
    marginBottom: 12,
  },
  roleButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    alignItems: 'center',
    gap: 8,
  },
  roleRadioOption: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
  },
  radioOuter: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: '#3B82F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 6,
  },
  radioOuterActive: {
    borderColor: '#2563EB',
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#2563EB',
  },
  roleRadioLabel: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  roleRadioLabelActive: {
    color: '#111827',
    fontWeight: '600',
  },
  roleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#3B82F6',
    backgroundColor: '#FFFFFF',
    gap: 6,
    marginRight: 8,
  },
  roleButtonActive: {
    backgroundColor: '#3B82F6',
    borderColor: '#3B82F6',
  },
  roleButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#3B82F6',
  },
  roleButtonTextActive: {
    color: '#FFFFFF',
  },
});
