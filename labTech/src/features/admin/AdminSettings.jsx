import React, { useState, useEffect } from 'react';
import { SafeAreaView, View, Text, StyleSheet, ScrollView, TouchableOpacity, StatusBar, Platform, Image, TextInput, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import AdminDrawer, { setCachedAdminAppIconUri, setCachedAdminAppName } from './AdminDrawer';
import * as ImagePicker from 'expo-image-picker';
import * as SecureStore from 'expo-secure-store';

export default function AdminSettings() {
  const router = useRouter();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [appIconUri, setAppIconUri] = useState(null);
  const [appName, setAppName] = useState('LabTech');

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const storedName = await SecureStore.getItemAsync('admin_app_name');
        const storedIcon = await SecureStore.getItemAsync('admin_app_icon_uri');
        if (storedName) {
          setAppName(storedName);
          setCachedAdminAppName(storedName);
        }
        if (storedIcon) {
          setAppIconUri(storedIcon);
          setCachedAdminAppIconUri(storedIcon);
        }
      } catch (e) {
        console.log('Error loading app settings', e);
      }
    };

    loadSettings();
  }, []);

  const handlePickAppIcon = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission required', 'Please allow access to your photos to pick an app icon.');
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
        setAppIconUri(uri);
        try {
          await SecureStore.setItemAsync('admin_app_icon_uri', uri);
          setCachedAdminAppIconUri(uri);
        } catch (e) {
          console.log('Error saving app icon uri', e);
        }
      }
    } catch (error) {
      console.log('Error picking icon image', error);
      Alert.alert('Error', 'Could not open gallery. Please try again.');
    }
  };

  const handleSave = async () => {
    try {
      await SecureStore.setItemAsync('admin_app_name', appName || '');
      setCachedAdminAppName(appName);
      Alert.alert('Settings saved', 'App name and icon have been updated (inside the app).');
    } catch (e) {
      console.log('Error saving app name', e);
      Alert.alert('Error', 'Could not save settings. Please try again.');
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
        <Text style={styles.headerTitle}>Settings</Text>
        <View style={styles.headerRightPlaceholder} />
      </View>

      <AdminDrawer
        isOpen={isMenuOpen}
        onClose={() => setIsMenuOpen(false)}
        activeRoute="settings"
        appIconUriOverride={appIconUri}
        appNameOverride={appName}
      />

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>App Appearance</Text>

          <Text style={styles.fieldLabel}>App Icon</Text>
          <View style={styles.iconRow}>
            <TouchableOpacity onPress={handlePickAppIcon} activeOpacity={0.8}>
              <View style={styles.iconCircle}>
                {appIconUri ? (
                  <Image source={{ uri: appIconUri }} style={styles.iconImage} />
                ) : (
                  <Ionicons name="flask-outline" size={28} color="#FFFFFF" />
                )}
              </View>
            </TouchableOpacity>
            <View style={styles.iconTextWrapper}>
              <Text style={styles.iconTitle}>Change app icon</Text>
              <Text style={styles.iconSubtitle}>This updates the icon used inside the app UI.</Text>
            </View>
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>App Name</Text>
            <View style={styles.fieldValueBox}>
              <TextInput
                style={styles.fieldValueInput}
                value={appName}
                onChangeText={setAppName}
                placeholder="Enter app name"
                placeholderTextColor="#9CA3AF"
              />
            </View>
          </View>

          <View style={styles.previewBox}>
            <View style={styles.previewIconCircle}>
              {appIconUri ? (
                <Image source={{ uri: appIconUri }} style={styles.previewIconImage} />
              ) : (
                <Ionicons name="flask-outline" size={24} color="#FFFFFF" />
              )}
            </View>
            <Text style={styles.previewAppName}>{appName || 'App Name'}</Text>
          </View>

          <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
            <Text style={styles.saveButtonText}>Save Settings</Text>
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
  card: {
    marginTop: 24,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 16,
  },
  fieldGroup: {
    marginTop: 16,
  },
  fieldLabel: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 6,
  },
  iconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 16,
    backgroundColor: '#4F46E5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconImage: {
    width: '100%',
    height: '100%',
    borderRadius: 16,
  },
  iconTextWrapper: {
    marginLeft: 12,
    flex: 1,
  },
  iconTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  iconSubtitle: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  fieldValueBox: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  fieldValueInput: {
    fontSize: 15,
    color: '#111827',
    fontWeight: '500',
    paddingVertical: 0,
  },
  previewBox: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 20,
    paddingVertical: 10,
  },
  previewIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#4F46E5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewIconImage: {
    width: '100%',
    height: '100%',
    borderRadius: 10,
  },
  previewAppName: {
    marginLeft: 10,
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  saveButton: {
    marginTop: 16,
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
