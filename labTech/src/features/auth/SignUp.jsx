import React, { useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Image, ScrollView, useWindowDimensions, Alert, KeyboardAvoidingView, Platform, StatusBar } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { API_ENDPOINTS } from '../../config/api';

export default function SignUp({ navigation }) {
  const router = useRouter();
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
    gender: '',
    age: ''
  });
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [showGenderPicker, setShowGenderPicker] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const { width, height } = useWindowDimensions();

  const isLandscape = width > height;
  const isSmall = width < 360 || height < 700;
  const isTablet = Math.max(width, height) >= 900;

  const sidePad = isTablet ? 28 : isSmall ? 16 : 20;
  const bottomPad = isTablet ? 36 : isSmall ? 20 : 28;
  const heroHeight = isLandscape
    ? Math.max(120, Math.min(180, height * 0.35))
    : isTablet
    ? Math.min(220, height * 0.22)
    : Math.min(200, height * 0.20);
  const titleSize = isTablet ? 28 : isSmall ? 24 : 26;
  const subtitleSize = isTablet ? 16 : isSmall ? 14 : 15;
  const inputHeight = isTablet ? 52 : isSmall ? 46 : 48;
  const ctaPadV = isTablet ? 16 : isSmall ? 12 : 14;

  // Validation functions
  const validateFullName = (name) => {
    if (!name.trim()) {
      return 'Full name is required';
    }
    if (name.trim().length < 2) {
      return 'Full name must be at least 2 characters';
    }
    if (!/^[a-zA-Z\s]+$/.test(name.trim())) {
      return 'Full name can only contain letters and spaces';
    }
    return null;
  };

  const validateEmail = (input) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
    
    if (!input.trim()) {
      return 'Email or phone number is required';
    }
    
    // Check if it's a phone number
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

  const validateConfirmPassword = (confirmPassword, password) => {
    if (!confirmPassword) {
      return 'Please confirm your password';
    }
    
    if (confirmPassword !== password) {
      return 'Passwords do not match';
    }
    
    return null;
  };

  const validateAge = (age) => {
    if (!age.trim()) {
      return 'Age is required';
    }
    
    const ageNum = parseInt(age);
    if (isNaN(ageNum) || ageNum < 13 || ageNum > 120) {
      return 'Please enter a valid age between 13 and 120';
    }
    
    return null;
  };

  const validateGender = (gender) => {
    if (!gender.trim()) {
      return 'Please select your gender';
    }
    return null;
  };

  const validateForm = () => {
    const newErrors = {};
    
    const nameError = validateFullName(formData.fullName);
    if (nameError) newErrors.fullName = nameError;
    
    const emailError = validateEmail(formData.email);
    if (emailError) newErrors.email = emailError;
    
    const passwordError = validatePassword(formData.password);
    if (passwordError) newErrors.password = passwordError;
    
    const confirmPasswordError = validateConfirmPassword(formData.confirmPassword, formData.password);
    if (confirmPasswordError) newErrors.confirmPassword = confirmPasswordError;
    
    const genderError = validateGender(formData.gender);
    if (genderError) newErrors.gender = genderError;
    
    const ageError = validateAge(formData.age);
    if (ageError) newErrors.age = ageError;
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Clear error for this field if it exists
    if (errors[field]) {
      let fieldError = null;
      
      switch (field) {
        case 'fullName':
          fieldError = validateFullName(value);
          break;
        case 'email':
          fieldError = validateEmail(value);
          break;
        case 'password':
          fieldError = validatePassword(value);
          // Also revalidate confirm password if it exists
          if (formData.confirmPassword) {
            const confirmError = validateConfirmPassword(formData.confirmPassword, value);
            setErrors(prev => ({
              ...prev,
              confirmPassword: confirmError
            }));
          }
          break;
        case 'confirmPassword':
          fieldError = validateConfirmPassword(value, formData.password);
          break;
        case 'gender':
          fieldError = validateGender(value);
          break;
        case 'age':
          fieldError = validateAge(value);
          break;
      }
      
      setErrors(prev => ({
        ...prev,
        [field]: fieldError
      }));
    }
  };

  const handleSignUp = async () => {
    if (!validateForm()) {
      Alert.alert('Validation Error', 'Please fix the errors below and try again.');
      return;
    }

    setIsLoading(true);
    
    try {
      const response = await fetch(API_ENDPOINTS.PATIENT_SIGNUP, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.fullName.trim(),
          email: formData.email.trim(),
          password: formData.password,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        Alert.alert('Sign Up Failed', data.message || 'Failed to create account');
        return;
      }

      Alert.alert(
        'Account Created!', 
        'Your account has been created successfully. Please log in.',
        [{ text: 'OK', onPress: () => router.back() }]
      );
      
    } catch (error) {
      Alert.alert('Error', 'An unexpected error occurred. Please try again.');
      console.error('Sign up error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const genderOptions = ['Male', 'Female', 'Other'];
  
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" translucent={false} />
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView contentContainerStyle={[styles.content, { paddingHorizontal: sidePad, paddingBottom: bottomPad, flexGrow: 1, justifyContent: 'center' }]} showsVerticalScrollIndicator={false}>
        
        {/* Title Section */}
        <Text style={[styles.title, { fontSize: titleSize }]}>Sign Up</Text>
        <Text style={[styles.subtitle, { fontSize: subtitleSize }]}>Create your account to access our services.</Text>

        {/* Form Fields */}
        <View style={styles.form}>
          {/* Full Name */}
          <View style={styles.field}>
            <Text style={styles.label}>Full Name</Text>
            <TextInput
              style={[styles.input, { height: inputHeight }, errors.fullName && styles.inputError]}
              placeholder="Enter your full name"
              placeholderTextColor="#8A94A6"
              value={formData.fullName}
              onChangeText={(text) => handleInputChange('fullName', text)}
              autoCapitalize="words"
            />
            {errors.fullName && <Text style={styles.errorText}>{errors.fullName}</Text>}
          </View>

          {/* Email/Phone */}
          <View style={styles.field}>
            <Text style={styles.label}>Email/Phone</Text>
            <TextInput
              style={[styles.input, { height: inputHeight }, errors.email && styles.inputError]}
              placeholder="Enter your email or phone"
              placeholderTextColor="#8A94A6"
              value={formData.email}
              onChangeText={(text) => handleInputChange('email', text)}
              keyboardType="email-address"
              autoCapitalize="none"
            />
            {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}
          </View>

          {/* Password */}
          <View style={styles.field}>
            <Text style={styles.label}>Password</Text>
            <View style={styles.passwordContainer}>
              <TextInput
                style={[styles.passwordInput, { height: inputHeight }, errors.password && styles.inputError]}
                placeholder="Enter your password"
                placeholderTextColor="#8A94A6"
                value={formData.password}
                onChangeText={(text) => handleInputChange('password', text)}
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

          {/* Confirm Password */}
          <View style={styles.field}>
            <Text style={styles.label}>Confirm Password</Text>
            <View style={styles.passwordContainer}>
              <TextInput
                style={[styles.passwordInput, { height: inputHeight }, errors.confirmPassword && styles.inputError]}
                placeholder="Confirm your password"
                placeholderTextColor="#8A94A6"
                value={formData.confirmPassword}
                onChangeText={(text) => handleInputChange('confirmPassword', text)}
                secureTextEntry={!showConfirmPassword}
              />
              <TouchableOpacity 
                style={styles.eyeButton}
                onPress={() => setShowConfirmPassword(!showConfirmPassword)}
              >
                <Ionicons 
                  name={showConfirmPassword ? 'eye-off' : 'eye'} 
                  size={20} 
                  color="#8A94A6" 
                />
              </TouchableOpacity>
            </View>
            {errors.confirmPassword && <Text style={styles.errorText}>{errors.confirmPassword}</Text>}
          </View>

          {/* Gender and Age Row */}
          <View style={styles.rowFields}>
            <View style={[styles.field, styles.halfField]}>
              <Text style={styles.label}>Gender</Text>
              <TouchableOpacity 
                style={[styles.input, { height: inputHeight }, errors.gender && styles.inputError, styles.pickerInput]}
                onPress={() => setShowGenderPicker(!showGenderPicker)}
              >
                <Text style={[styles.pickerText, !formData.gender && styles.placeholderText]}>
                  {formData.gender || 'Select gender'}
                </Text>
                <Text style={styles.dropdownArrow}>▼</Text>
              </TouchableOpacity>
              {errors.gender && <Text style={styles.errorText}>{errors.gender}</Text>}
              
              {showGenderPicker && (
                <View style={styles.pickerDropdown}>
                  {genderOptions.map((option) => (
                    <TouchableOpacity
                      key={option}
                      style={styles.pickerOption}
                      onPress={() => {
                        handleInputChange('gender', option);
                        setShowGenderPicker(false);
                      }}
                    >
                      <Text style={styles.pickerOptionText}>{option}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>

            <View style={[styles.field, styles.halfField]}>
              <Text style={styles.label}>Age</Text>
              <TextInput
                style={[styles.input, { height: inputHeight }, errors.age && styles.inputError]}
                placeholder="Enter age"
                placeholderTextColor="#8A94A6"
                value={formData.age}
                onChangeText={(text) => handleInputChange('age', text)}
                keyboardType="numeric"
                maxLength={3}
              />
              {errors.age && <Text style={styles.errorText}>{errors.age}</Text>}
            </View>
          </View>
        </View>

        {/* Create Account Button */}
        <TouchableOpacity 
          style={[styles.signUpBtn, { paddingVertical: ctaPadV }, isLoading && styles.signUpBtnDisabled]} 
          onPress={handleSignUp}
          disabled={isLoading}
        >
          <Text style={styles.signUpText}>{isLoading ? 'Creating Account...' : 'Create Account'}</Text>
        </TouchableOpacity>

        {/* Login Link */}
        <View style={styles.footerRow}>
          <Text style={styles.footerText}>Already have an account? </Text>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.link}>Log In</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
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
    paddingTop: 8,
    paddingBottom: 24,
  },
  keyboardView: {
    flex: 1,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0F172A',
    marginBottom: 8,
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
  title: {
    fontSize: 30,
    fontWeight: 'bold',
    color: '#0F172A',
    marginBottom: 8,
    textAlign: 'center'
  },
  subtitle: {
    fontSize: 18,
    color: '#64748B',
    marginBottom: 24,
    lineHeight: 22,
    textAlign: 'center'
  },
  form: {
    marginBottom: 24,
  },
  field: {
    marginBottom: 16,
  },
  rowFields: {
    flexDirection: 'row',
    gap: 12,
  },
  halfField: {
    flex: 1,
  },
  input: {
    height: 48,
    backgroundColor: '#EEF1F6',
    borderRadius: 12,
    paddingHorizontal: 14,
    color: '#0F172A',
    fontSize: 16,
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
  pickerInput: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  pickerText: {
    fontSize: 16,
    color: '#0F172A',
  },
  placeholderText: {
    color: '#8A94A6',
  },
  dropdownArrow: {
    fontSize: 12,
    color: '#64748B',
  },
  pickerDropdown: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    backgroundColor: 'white',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    zIndex: 1000,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  pickerOption: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  pickerOptionText: {
    fontSize: 16,
    color: '#0F172A',
  },
  signUpBtn: {
    backgroundColor: '#3B82F6',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  signUpText: {
    color: 'white',
    fontWeight: '700',
    fontSize: 18,
  },
  signUpBtnDisabled: {
    backgroundColor: '#94A3B8',
    opacity: 0.7,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  footerText: {
    color: '#64748B',
    fontSize: 14,
  },
  link: {
    color: '#2563EB',
    fontWeight: '600',
    fontSize: 14,
  },
});
