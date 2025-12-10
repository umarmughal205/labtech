import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, StatusBar, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';

// Simple in-memory cache so the admin icon and profile image
// are available immediately on subsequent renders without
// waiting for SecureStore each time.
let cachedAdminProfileImageUri = null;
let cachedAdminProfileName = 'Admin User';
let cachedAdminProfileContact = 'admin@labtech.com';
let cachedAdminAppIconUri = null;
let cachedAdminAppName = 'LabTech';

export const setCachedAdminAppIconUri = (uri) => {
  cachedAdminAppIconUri = uri;
};

export const setCachedAdminAppName = (name) => {
  cachedAdminAppName = name || 'LabTech';
};

export const setCachedAdminProfileImageUri = (uri) => {
  cachedAdminProfileImageUri = uri;
};

export const setCachedAdminProfileName = (name) => {
  cachedAdminProfileName = name || 'Admin User';
};

export const setCachedAdminProfileContact = (contact) => {
  cachedAdminProfileContact = contact || 'admin@labtech.com';
};

export default function AdminDrawer({
  isOpen,
  onClose,
  activeRoute,
  appIconUriOverride,
  appNameOverride,
  profileImageUriOverride,
  profileNameOverride,
  profileContactOverride,
}) {
  const router = useRouter();
  const [profileImageUri, setProfileImageUri] = useState(cachedAdminProfileImageUri);
  const [profileName, setProfileName] = useState(cachedAdminProfileName);
  const [profileContact, setProfileContact] = useState(cachedAdminProfileContact);
  const [appIconUri, setAppIconUri] = useState(cachedAdminAppIconUri);
  const [appName, setAppName] = useState(cachedAdminAppName);

  useEffect(() => {
    const loadProfileImage = async () => {
      if (cachedAdminProfileImageUri) return;
      try {
        const uri = await SecureStore.getItemAsync('admin_profile_image_uri');
        if (uri) {
          cachedAdminProfileImageUri = uri;
          setProfileImageUri(uri);
        }
      } catch (e) {
        console.log('Error loading admin drawer profile image', e);
      }
    };

    const loadProfileText = async () => {
      try {
        const storedName = await SecureStore.getItemAsync('admin_profile_name');
        const storedContact = await SecureStore.getItemAsync('admin_profile_contact');
        if (storedName) {
          cachedAdminProfileName = storedName;
          setProfileName(storedName);
        }
        if (storedContact) {
          cachedAdminProfileContact = storedContact;
          setProfileContact(storedContact);
        }
      } catch (e) {
        console.log('Error loading admin profile text', e);
      }
    };

    const loadAppIcon = async () => {
      if (cachedAdminAppIconUri) return;
      try {
        const iconUri = await SecureStore.getItemAsync('admin_app_icon_uri');
        if (iconUri) {
          cachedAdminAppIconUri = iconUri;
          setAppIconUri(iconUri);
        }
      } catch (e) {
        console.log('Error loading admin app icon', e);
      }
    };

    const loadAppName = async () => {
      try {
        const storedName = await SecureStore.getItemAsync('admin_app_name');
        if (storedName) {
          cachedAdminAppName = storedName;
          setAppName(storedName);
        }
      } catch (e) {
        console.log('Error loading admin app name', e);
      }
    };

    loadProfileImage();
    loadProfileText();
    loadAppIcon();
    loadAppName();
  }, []);

  if (!isOpen) return null;

  const effectiveAppIconUri = appIconUriOverride || appIconUri;
  const effectiveAppName = appNameOverride || appName;
  const effectiveProfileImageUri = profileImageUriOverride || profileImageUri;
  const effectiveProfileName = profileNameOverride || profileName;
  const effectiveProfileContact = profileContactOverride || profileContact;

  const handleNavigate = (path) => {
    onClose && onClose();
    router.push(path);
  };

  return (
    <>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" translucent={false} />
      {/* Right-side dim overlay */}
      <TouchableOpacity
        style={styles.menuOverlay}
        activeOpacity={1}
        onPress={onClose}
      />

      {/* Left sidebar drawer */}
      <View style={styles.menuContainer}>
        {/* Drawer top bar: app icon, centered app name, close button */}
        <View style={styles.drawerTopBar}>
          <View style={styles.drawerTopIconBox}>
            {effectiveAppIconUri ? (
              <Image source={{ uri: effectiveAppIconUri }} style={styles.drawerTopIconImage} />
            ) : (
              <Image
                source={require('../../../assets/images/app_icon.png')}
                style={styles.drawerTopIconImage}
                resizeMode="cover"
              />
            )}
          </View>
          <Text style={styles.drawerTopTitle}>{effectiveAppName}</Text>
          <TouchableOpacity onPress={onClose}>
            <Ionicons name="close" size={22} color="#111827" />
          </TouchableOpacity>
        </View>

        {/* Admin profile card */}
        <View style={styles.menuHeader}>
          <View style={styles.profileAvatar}>
            {effectiveProfileImageUri ? (
              <Image source={{ uri: effectiveProfileImageUri }} style={styles.profileAvatarImage} />
            ) : (
              <Ionicons name="person" size={28} color="#FFFFFF" />
            )}
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>{effectiveProfileName}</Text>
            <Text style={styles.profileEmail}>{effectiveProfileContact}</Text>
          </View>
        </View>

        {/* Main menu items */}
        <View style={styles.menuSection}>
          <TouchableOpacity
            style={[styles.menuItem, activeRoute === 'finance' && styles.menuItemActive]}
            onPress={() => handleNavigate('/financereport')}
          >
            <Ionicons name="cash-outline" size={20} color="#2563EB" style={styles.menuItemIcon} />
            <Text style={[styles.menuItemLabel, activeRoute === 'finance' && styles.menuItemLabelActive]}>Finance</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.menuItem, activeRoute === 'ledger' && styles.menuItemActive]}
            onPress={() => handleNavigate('/admin-ledger')}
          >
            <Ionicons name="receipt-outline" size={20} color="#2563EB" style={styles.menuItemIcon} />
            <Text style={[styles.menuItemLabel, activeRoute === 'ledger' && styles.menuItemLabelActive]}>Ledger</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.menuItem, activeRoute === 'appointments' && styles.menuItemActive]}
            onPress={() => handleNavigate('/admin-appointments')}
          >
            <Ionicons name="calendar-outline" size={20} color="#2563EB" style={styles.menuItemIcon} />
            <Text style={[styles.menuItemLabel, activeRoute === 'appointments' && styles.menuItemLabelActive]}>Appointments</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.menuItem, activeRoute === 'notifications' && styles.menuItemActive]}
            onPress={() => handleNavigate('/admin-notifications')}
          >
            <Ionicons name="notifications-outline" size={20} color="#2563EB" style={styles.menuItemIcon} />
            <Text style={[styles.menuItemLabel, activeRoute === 'notifications' && styles.menuItemLabelActive]}>Notifications</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.menuItem, activeRoute === 'tests' && styles.menuItemActive]}
            onPress={() => handleNavigate('/admin-tests')}
          >
            <Ionicons name="flask-outline" size={20} color="#2563EB" style={styles.menuItemIcon} />
            <Text style={[styles.menuItemLabel, activeRoute === 'tests' && styles.menuItemLabelActive]}>Tests</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.menuItem, activeRoute === 'profile' && styles.menuItemActive]}
            onPress={() => handleNavigate('/admin-profile')}
          >
            <Ionicons name="person-outline" size={20} color="#2563EB" style={styles.menuItemIcon} />
            <Text style={[styles.menuItemLabel, activeRoute === 'profile' && styles.menuItemLabelActive]}>Profile</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.menuItem, activeRoute === 'settings' && styles.menuItemActive]}
            onPress={() => handleNavigate('/admin-settings')}
          >
            <Ionicons name="settings-outline" size={20} color="#2563EB" style={styles.menuItemIcon} />
            <Text style={[styles.menuItemLabel, activeRoute === 'settings' && styles.menuItemLabelActive]}>Settings</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => {
              Alert.alert(
                'Logout',
                'Are you sure you want to logout?',
                [
                  { text: 'Cancel', style: 'cancel' },
                  {
                    text: 'Logout',
                    style: 'destructive',
                    onPress: () => handleNavigate('/login'),
                  },
                ],
                { cancelable: true }
              );
            }}
          >
            <Ionicons name="log-out-outline" size={20} color="#DC2626" style={styles.menuItemIcon} />
            <Text style={[styles.menuItemLabel, { color: '#DC2626' }]}>Logout</Text>
          </TouchableOpacity>
        </View>

        {/* Footer */}
        <View style={styles.menuFooter}>
          <Text style={styles.menuFooterTitle}>Develeoped by Mindspire</Text>
          <Text style={styles.menuFooterVersion}>Version 1.0.0</Text>
        </View>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  menuOverlay: {
    position: 'absolute',
    top: 0,
    left: '70%',
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(15, 23, 42, 0.35)',
    zIndex: 15,
  },
  menuContainer: {
    position: 'absolute',
    top: 25,
    left: 0,
    bottom: 0,
    width: '70%',
    backgroundColor: '#FFFFFF',
    paddingTop: 20,
    paddingHorizontal: 16,
    paddingBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 4, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
    borderRightWidth: 1,
    borderRightColor: '#E5E7EB',
    zIndex: 20,
  },
  drawerTopBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  drawerTopIconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#5B21B6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  drawerTopIconImage: {
    width: '100%',
    height: '100%',
    borderRadius: 18,
  },
  drawerTopTitle: {
    flex: 1,
    marginLeft: 10,
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
    textAlign: 'center',
  },
  menuHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 20,
    paddingHorizontal: 12,
    backgroundColor: '#2563EB',
    borderRadius: 16,
    marginBottom: 12,
    marginTop: 14,
  },
  profileAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#3B82F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  profileAvatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 26,
  },
  profileAvatarText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  profileEmail: {
    fontSize: 13,
    color: '#E5E7EB',
  },
  menuSection: {
    marginTop: 16,
    paddingVertical: 8,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    marginBottom: 4,
  },
  menuItemActive: {
    backgroundColor: '#EFF6FF',
  },
  menuItemIcon: {
    marginRight: 12,
  },
  menuItemLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
  },
  menuItemLabelActive: {
    color: '#1D4ED8',
  },
  menuFooter: {
    marginTop: 'auto',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  menuFooterTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 4,
  },
  menuFooterVersion: {
    fontSize: 11,
    color: '#9CA3AF',
  },
});
