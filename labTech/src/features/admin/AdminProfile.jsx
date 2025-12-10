import React, { useState, useEffect } from 'react';
import { SafeAreaView, View, Text, StyleSheet, ScrollView, TouchableOpacity, StatusBar, Platform, Image, TextInput, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import AdminDrawer, {
  setCachedAdminProfileImageUri,
  setCachedAdminProfileName,
  setCachedAdminProfileContact,
} from './AdminDrawer';
import * as ImagePicker from 'expo-image-picker';
import * as SecureStore from 'expo-secure-store';

export default function AdminProfile() {
  const router = useRouter();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [profileImage, setProfileImage] = useState(null);
  const [name, setName] = useState('Admin User');
  const [contact, setContact] = useState('admin@labtech.com');
  const [password, setPassword] = useState('');

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const storedImage = await SecureStore.getItemAsync('admin_profile_image_uri');
        const storedName = await SecureStore.getItemAsync('admin_profile_name');
        const storedContact = await SecureStore.getItemAsync('admin_profile_contact');

        if (storedImage) {
          setProfileImage(storedImage);
          setCachedAdminProfileImageUri(storedImage);
        }
        if (storedName) {
          setName(storedName);
          setCachedAdminProfileName(storedName);
        }
        if (storedContact) {
          setContact(storedContact);
          setCachedAdminProfileContact(storedContact);
        }
      } catch (e) {
        console.log('Error loading admin profile', e);
      }
    };

    loadProfile();
  }, []);

  const handlePickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission required', 'Please allow access to your photos to pick a profile image.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: 'images',
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const uri = result.assets[0].uri;
        setProfileImage(uri);
        try {
          await SecureStore.setItemAsync('admin_profile_image_uri', uri);
          setCachedAdminProfileImageUri(uri);
        } catch (e) {
          console.log('Error saving profile image uri', e);
        }
      }
    } catch (error) {
      console.log('Error picking image', error);
      Alert.alert('Error', 'Could not open gallery. Please try again.');
    }
  };

  const handleSave = async () => {
    try {
      await SecureStore.setItemAsync('admin_profile_name', name || '');
      await SecureStore.setItemAsync('admin_profile_contact', contact || '');
      setCachedAdminProfileName(name);
      setCachedAdminProfileContact(contact);
      Alert.alert('Profile saved', 'Your profile details have been updated (locally for now).');
    } catch (e) {
      console.log('Error saving profile details', e);
      Alert.alert('Error', 'Could not save profile details. Please try again.');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      <View style={styles.header}>
        <TouchableOpacity
          style={styles.menuButton}
          onPress={() => setIsMenuOpen((prev) => !prev)}
        >
          <Ionicons name={isMenuOpen ? 'close' : 'menu'} size={22} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Admin Profile</Text>
        <View style={styles.headerRightPlaceholder} />
      </View>

      <AdminDrawer
        isOpen={isMenuOpen}
        onClose={() => setIsMenuOpen(false)}
        activeRoute="profile"
        profileImageUriOverride={profileImage}
        profileNameOverride={name}
        profileContactOverride={contact}
      />

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.profileCard}>
          <View style={styles.avatarWrapper}>
            <TouchableOpacity onPress={handlePickImage} activeOpacity={0.8}>
              {profileImage ? (
                <Image source={{ uri: profileImage }} style={styles.avatarImage} />
              ) : (
                <View style={styles.avatarCircle}>
                  <Ionicons name="person" size={36} color="#FFFFFF" />
                </View>
              )}
              <View style={styles.avatarEditBadge}>
                <Ionicons name="camera" size={16} color="#FFFFFF" />
              </View>
            </TouchableOpacity>
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Name</Text>
            <View style={styles.fieldValueBox}>
              <TextInput
                style={styles.fieldValueInput}
                value={name}
                onChangeText={setName}
                placeholder="Enter name"
                placeholderTextColor="#9CA3AF"
              />
            </View>
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Email / Phone</Text>
            <View style={styles.fieldValueBox}>
              <TextInput
                style={styles.fieldValueInput}
                value={contact}
                onChangeText={setContact}
                placeholder="Enter email or phone"
                placeholderTextColor="#9CA3AF"
                keyboardType="email-address"
              />
            </View>
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Password</Text>
            <View style={styles.fieldValueBox}>
              <TextInput
                style={styles.fieldValueInput}
                value={password}
                onChangeText={setPassword}
                placeholder="Enter new password"
                placeholderTextColor="#9CA3AF"
                secureTextEntry
              />
            </View>
          </View>

          <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
            <Text style={styles.saveButtonText}>Save Changes</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
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
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },
  headerRightPlaceholder: {
    width: 40,
    height: 40,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  profileCard: {
    marginTop: 24,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  avatarWrapper: {
    alignItems: 'center',
    marginBottom: 24,
  },
  avatarCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'red',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitials: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  avatarImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  avatarEditBadge: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#4F46E5',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  fieldGroup: {
    marginBottom: 16,
  },
  fieldLabel: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 6,
  },
  fieldValueBox: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  fieldValueText: {
    fontSize: 15,
    color: '#111827',
    fontWeight: '500',
  },
  fieldValueInput: {
    fontSize: 15,
    color: '#111827',
    fontWeight: '500',
    paddingVertical: 0,
  },
  saveButton: {
    marginTop: 8,
    backgroundColor: '#3B82F6',
    borderRadius: 999,
    paddingVertical: 12,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
});
