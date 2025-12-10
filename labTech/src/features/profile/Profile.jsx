import React, { useState, useEffect } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView, StatusBar, Platform, Alert, Animated, Image, Dimensions, Modal, KeyboardAvoidingView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import * as MediaLibrary from 'expo-media-library';
import { useProfile } from '../../context/ProfileContext';

export default function Profile() {
  const router = useRouter();
  const { profileData, updateProfileData, updateProfileImage, getInitials } = useProfile();

  const [isEditing, setIsEditing] = useState(false);
  const [tempData, setTempData] = useState({ ...profileData });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showImagePicker, setShowImagePicker] = useState(false);

  // Sync tempData with profileData changes
  useEffect(() => {
    setTempData({ ...profileData });
  }, [profileData]);

  // Get screen dimensions for responsive design
  const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
  const isTablet = screenWidth >= 768;
  const isSmallScreen = screenWidth < 375;

  const handleInputChange = (field, value) => {
    setTempData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSave = async () => {
    // Validate inputs
    if (!tempData.fullName || !tempData.email || !tempData.phone) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(tempData.email)) {
      Alert.alert('Error', 'Please enter a valid email address');
      return;
    }

    // Save the changes (backend + local)
    const ok = await updateProfileData(tempData);
    if (!ok) {
      Alert.alert('Error', 'Failed to update profile on server. Please try again.');
      return;
    }
    setIsEditing(false);
    Alert.alert('Success', 'Profile updated successfully!');
  };

  const handleCancel = () => {
    setTempData({ ...profileData });
    setIsEditing(false);
  };

  const handleImagePicker = async () => {
    try {
      // Request permissions
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (status !== 'granted') {
        Alert.alert(
          'Permission Required',
          'Sorry, we need camera roll permissions to change your profile picture.',
          [{ text: 'OK' }]
        );
        return;
      }

      // Show custom modal for image selection
      setShowImagePicker(true);
    } catch (error) {
      console.error('Error requesting permissions:', error);
      Alert.alert('Error', 'Failed to access camera/gallery permissions');
    }
  };

  const openCamera = async () => {
    setShowImagePicker(false);
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();

      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Camera permission is required to take photos.');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: 'images',
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        console.log('Profile: Camera - Selected image URI:', result.assets[0].uri);
        updateProfileImage(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error opening camera:', error);
      Alert.alert('Error', 'Failed to open camera');
    }
  };

  const openGallery = async () => {
    setShowImagePicker(false);
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: 'images',
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        console.log('Profile: Gallery - Selected image URI:', result.assets[0].uri);
        updateProfileImage(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error opening gallery:', error);
      Alert.alert('Error', 'Failed to open gallery');
    }
  };

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: () => {
            // TODO: Implement actual logout logic (clear tokens, etc.)
            console.log('User logged out');
            router.push('/login');
          },
        },
      ]
    );
  };

  // Create responsive styles
  const styles = createResponsiveStyles(screenWidth, isTablet, isSmallScreen);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" translucent={false} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Profile</Text>
        <TouchableOpacity
          onPress={() => isEditing ? handleSave() : setIsEditing(true)}
          style={styles.editButton}
        >
          <Text style={styles.editButtonText}>
            {isEditing ? 'Save' : 'Edit'}
          </Text>
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoidingView}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <ScrollView
          style={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.scrollContent}
        >
          {/* Profile Photo Section */}
          <View style={styles.photoSection}>
            <View style={styles.profileImageContainer}>
              {profileData.profileImage ? (
                <Image source={{ uri: profileData.profileImage }} style={styles.profileImage} />
              ) : (
                <LinearGradient
                  colors={['#8B5CF6', '#3B82F6']}
                  style={styles.profileImagePlaceholder}
                >
                  <Text style={styles.profileInitials}>
                    {getInitials(isEditing ? tempData.fullName : profileData.fullName)}
                  </Text>
                </LinearGradient>
              )}
              <TouchableOpacity style={styles.cameraButton} onPress={handleImagePicker}>
                <LinearGradient
                  colors={['#6B7280', '#4B5563']}
                  style={styles.cameraButtonGradient}
                >
                  <Ionicons name="camera" size={18} color="#FFFFFF" />
                </LinearGradient>
              </TouchableOpacity>
            </View>
            <Text style={styles.photoHint}>Tap to change photo</Text>
            <Text style={styles.userName}>
              {isEditing ? tempData.fullName : profileData.fullName}
            </Text>
          </View>

          {/* Profile Form */}
          <View style={styles.formSection}>
            {/* Full Name */}
            <View style={styles.inputGroup}>
              <View style={styles.inputLabelContainer}>
                <Ionicons name="person-outline" size={18} color="#6B7280" />
                <Text style={styles.inputLabel}>Full Name</Text>
              </View>
              <View style={styles.inputContainer}>
                <TextInput
                  style={[styles.input, !isEditing && styles.inputDisabled]}
                  value={isEditing ? tempData.fullName : profileData.fullName}
                  onChangeText={(text) => handleInputChange('fullName', text)}
                  placeholder="Enter your full name"
                  placeholderTextColor="#9CA3AF"
                  editable={isEditing}
                  autoCapitalize="words"
                />
              </View>
            </View>

            {/* Email */}
            <View style={styles.inputGroup}>
              <View style={styles.inputLabelContainer}>
                <Ionicons name="mail-outline" size={18} color="#6B7280" />
                <Text style={styles.inputLabel}>Email</Text>
              </View>
              <View style={styles.inputContainer}>
                <TextInput
                  style={[styles.input, !isEditing && styles.inputDisabled]}
                  value={isEditing ? tempData.email : profileData.email}
                  onChangeText={(text) => handleInputChange('email', text)}
                  placeholder="Enter your email"
                  placeholderTextColor="#9CA3AF"
                  editable={isEditing}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>
            </View>

            {/* Phone */}
            <View style={styles.inputGroup}>
              <View style={styles.inputLabelContainer}>
                <Ionicons name="call-outline" size={18} color="#6B7280" />
                <Text style={styles.inputLabel}>Phone Number</Text>
              </View>
              <View style={styles.inputContainer}>
                <TextInput
                  style={[styles.input, !isEditing && styles.inputDisabled]}
                  value={isEditing ? tempData.phone : profileData.phone}
                  onChangeText={(text) => handleInputChange('phone', text)}
                  placeholder="Enter your phone number"
                  placeholderTextColor="#9CA3AF"
                  editable={isEditing}
                  keyboardType="phone-pad"
                />
              </View>
            </View>

            {/* Password */}
            <View style={styles.inputGroup}>
              <View style={styles.inputLabelContainer}>
                <Ionicons name="lock-closed-outline" size={18} color="#6B7280" />
                <Text style={styles.inputLabel}>Password</Text>
              </View>
              <View style={styles.inputContainer}>
                <TextInput
                  style={[styles.input, !isEditing && styles.inputDisabled, styles.inputWithIcon]}
                  value={isEditing ? tempData.password : profileData.password}
                  onChangeText={(text) => handleInputChange('password', text)}
                  placeholder="Enter your password"
                  placeholderTextColor="#9CA3AF"
                  editable={isEditing}
                  secureTextEntry={isEditing ? !showPassword : true}
                />
                {isEditing && (
                  <TouchableOpacity
                    style={styles.eyeIcon}
                    onPress={() => setShowPassword(!showPassword)}
                  >
                    <Ionicons
                      name={showPassword ? 'eye-outline' : 'eye-off-outline'}
                      size={20}
                      color="#6B7280"
                    />
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {/* Confirm Password - only show when editing */}
            {isEditing && (
              <View style={styles.inputGroup}>
                <View style={styles.inputLabelContainer}>
                  <Ionicons name="shield-checkmark-outline" size={18} color="#6B7280" />
                  <Text style={styles.inputLabel}>Confirm Password</Text>
                </View>
                <View style={styles.inputContainer}>
                  <TextInput
                    style={[styles.input, styles.inputWithIcon]}
                    value={tempData.confirmPassword}
                    onChangeText={(text) => handleInputChange('confirmPassword', text)}
                    placeholder="Confirm your password"
                    placeholderTextColor="#9CA3AF"
                    secureTextEntry={!showConfirmPassword}
                  />
                  <TouchableOpacity
                    style={styles.eyeIcon}
                    onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    <Ionicons
                      name={showConfirmPassword ? 'eye-outline' : 'eye-off-outline'}
                      size={20}
                      color="#6B7280"
                    />
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>

          {/* Action Buttons */}
          <View style={styles.actionSection}>
            {isEditing ? (
              <View style={styles.editingButtons}>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={handleCancel}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.saveButton}
                  onPress={handleSave}
                >
                  <Text style={styles.saveButtonText}>Save Changes</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                style={styles.logoutButton}
                onPress={handleLogout}
              >
                <Ionicons name="log-out-outline" size={20} color="#FFFFFF" />
                <Text style={styles.logoutButtonText}>Logout</Text>
              </TouchableOpacity>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Custom Image Picker Modal */}
      <Modal
        visible={showImagePicker}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowImagePicker(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select Profile Picture</Text>
            <Text style={styles.modalSubtitle}>Choose an option</Text>

            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.modalButton} onPress={openCamera}>
                <Ionicons name="camera" size={24} color="#3B82F6" />
                <Text style={styles.modalButtonText}>Camera</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.modalButton} onPress={openGallery}>
                <Ionicons name="images" size={24} color="#3B82F6" />
                <Text style={styles.modalButtonText}>Gallery</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.modalCancelButton}
              onPress={() => setShowImagePicker(false)}
            >
              <Text style={styles.modalCancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const createResponsiveStyles = (screenWidth, isTablet, isSmallScreen) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    padding: 8,
    marginLeft: -8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
  },
  editButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#3B82F6',
    borderRadius: 8,
  },
  editButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: isTablet ? 40 : isSmallScreen ? 16 : 20,
    paddingTop: isTablet ? 32 : 24,
    paddingBottom: isTablet ? 20 : 10,
    maxWidth: isTablet ? 600 : '100%',
    alignSelf: isTablet ? 'center' : 'stretch',
    flexGrow: 1,
  },
  photoSection: {
    alignItems: 'center',
    marginBottom: isTablet ? 40 : isSmallScreen ? 24 : 32,
    paddingTop: isTablet ? 20 : 0,
  },
  profileImageContainer: {
    position: 'relative',
    marginBottom: 12,
  },
  profileImage: {
    width: isTablet ? 160 : isSmallScreen ? 120 : 140,
    height: isTablet ? 160 : isSmallScreen ? 120 : 140,
    borderRadius: isTablet ? 80 : isSmallScreen ? 60 : 70,
    borderWidth: 4,
    borderColor: '#FFFFFF',
    elevation: 8,
    shadowColor: '#8B5CF6',
    shadowOpacity: 0.3,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
  },
  profileImagePlaceholder: {
    width: isTablet ? 160 : isSmallScreen ? 120 : 140,
    height: isTablet ? 160 : isSmallScreen ? 120 : 140,
    borderRadius: isTablet ? 80 : isSmallScreen ? 60 : 70,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#8B5CF6',
    shadowOpacity: 0.3,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    borderWidth: 4,
    borderColor: '#FFFFFF',
  },
  profileInitials: {
    fontSize: isTablet ? 44 : isSmallScreen ? 32 : 36,
    fontWeight: 'bold',
    color: '#FFFFFF',
    letterSpacing: isTablet ? 3 : 2,
  },
  cameraButton: {
    position: 'absolute',
    bottom: 5,
    right: 5,
  },
  cameraButtonGradient: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#FFFFFF',
    elevation: 4,
    shadowColor: '#6B7280',
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  photoHint: {
    fontSize: isTablet ? 15 : isSmallScreen ? 12 : 13,
    color: '#9CA3AF',
    textAlign: 'center',
    marginBottom: isTablet ? 12 : 8,
  },
  userName: {
    fontSize: isTablet ? 28 : isSmallScreen ? 20 : 24,
    fontWeight: 'bold',
    color: '#1F2937',
    textAlign: 'center',
    letterSpacing: 0.5,
    marginTop: isTablet ? 8 : 4,
  },
  formSection: {
    marginBottom: isTablet ? 40 : 32,
    backgroundColor: isTablet ? '#FFFFFF' : 'transparent',
    borderRadius: isTablet ? 16 : 0,
    padding: isTablet ? 24 : 0,
    elevation: isTablet ? 2 : 0,
    shadowColor: isTablet ? '#000' : 'transparent',
    shadowOpacity: isTablet ? 0.08 : 0,
    shadowRadius: isTablet ? 12 : 0,
    shadowOffset: isTablet ? { width: 0, height: 4 } : { width: 0, height: 0 },
  },
  inputGroup: {
    marginBottom: isTablet ? 24 : isSmallScreen ? 16 : 20,
  },
  inputLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: isTablet ? 10 : 8,
  },
  inputLabel: {
    fontSize: isTablet ? 16 : isSmallScreen ? 13 : 14,
    fontWeight: '600',
    color: '#374151',
    marginLeft: 8,
  },
  input: {
    height: isTablet ? 64 : isSmallScreen ? 52 : 56,
    backgroundColor: '#FFFFFF',
    borderRadius: isTablet ? 14 : 12,
    paddingHorizontal: isTablet ? 20 : 16,
    fontSize: isTablet ? 18 : isSmallScreen ? 15 : 16,
    color: '#111827',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  inputDisabled: {
    backgroundColor: '#F9FAFB',
    color: '#6B7280',
  },
  inputWithIcon: {
    paddingRight: 50,
  },
  eyeIcon: {
    position: 'absolute',
    right: 16,
    top: 18,
    padding: 4,
  },
  actionSection: {
    marginBottom: isTablet ? 60 : 50,
    paddingTop: isTablet ? 20 : 0,
  },
  editingButtons: {
    flexDirection: isTablet ? 'row' : 'row',
    gap: isTablet ? 16 : 12,
  },
  cancelButton: {
    flex: 1,
    height: isTablet ? 64 : isSmallScreen ? 52 : 56,
    backgroundColor: '#F3F4F6',
    borderRadius: isTablet ? 14 : 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: isTablet ? 18 : isSmallScreen ? 15 : 16,
    fontWeight: '600',
    color: '#374151',
  },
  saveButton: {
    flex: 1,
    height: isTablet ? 64 : isSmallScreen ? 52 : 56,
    backgroundColor: '#3B82F6',
    borderRadius: isTablet ? 14 : 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveButtonText: {
    fontSize: isTablet ? 18 : isSmallScreen ? 15 : 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  logoutButton: {
    height: isTablet ? 64 : isSmallScreen ? 52 : 56,
    backgroundColor: '#EF4444',
    borderRadius: isTablet ? 14 : 12,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    width: isTablet ? '40%' : '50%',
    alignSelf: 'center',
  },
  logoutButtonText: {
    fontSize: isTablet ? 18 : isSmallScreen ? 15 : 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginLeft: 8,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 320,
    alignItems: 'center',
    elevation: 10,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 8,
    textAlign: 'center',
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 24,
    textAlign: 'center',
  },
  modalButtons: {
    width: '100%',
    marginBottom: 20,
  },
  modalButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingVertical: 16,
    paddingHorizontal: 20,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginLeft: 12,
  },
  modalCancelButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    backgroundColor: '#F3F4F6',
    borderRadius: 10,
    width: '60%',
  },
  modalCancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
    textAlign: 'center',
  },
});
