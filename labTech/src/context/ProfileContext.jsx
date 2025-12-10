import React, { createContext, useContext, useEffect, useState } from 'react';
import { API_ENDPOINTS } from '../config/api';
import { useAuth } from './AuthContext';

const ProfileContext = createContext();

export const ProfileProvider = ({ children }) => {
  const { authToken } = useAuth();
  const [profileData, setProfileData] = useState({
    fullName: '',
    email: '',
    phone: '',
    gender: '',
    age: null,
    profileImage: null,
  });
  const [loading, setLoading] = useState(false);

  // Load profile from backend for the logged-in user
  const loadProfile = async () => {
    try {
      setLoading(true);
      if (!authToken) {
        return;
      }

      const res = await fetch(API_ENDPOINTS.PROFILE_ME, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });

      const data = await res.json();
      if (res.ok && data.success && data.profile) {
        setProfileData((prev) => ({
          ...prev,
          ...data.profile,
        }));
      } else {
        console.warn('Failed to load profile:', data);
      }
    } catch (err) {
      console.error('Error loading profile:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Whenever authToken changes (login/logout), reload profile
    if (authToken) {
      loadProfile();
    } else {
      // Clear profile when logged out
      setProfileData({
        fullName: '',
        email: '',
        phone: '',
        gender: '',
        age: null,
        profileImage: null,
      });
    }
  }, [authToken]);

  // Update profile both locally and on backend
  const updateProfileData = async (newData) => {
    try {
      if (!authToken) {
        console.warn('No auth token; cannot update profile on server');
        setProfileData((prev) => ({ ...prev, ...newData }));
        return true;
      }

      const res = await fetch(API_ENDPOINTS.PROFILE_ME, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          fullName: newData.fullName,
          email: newData.email,
          phone: newData.phone,
          gender: newData.gender,
          age: typeof newData.age === 'number' ? newData.age : Number(newData.age) || null,
          profileImage: newData.profileImage || null,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        console.warn('Failed to update profile:', data);
        return false;
      }

      if (data.profile) {
        setProfileData((prev) => ({
          ...prev,
          ...data.profile,
        }));
      } else {
        setProfileData((prev) => ({
          ...prev,
          ...newData,
        }));
      }

      return true;
    } catch (err) {
      console.error('Error updating profile:', err);
      return false;
    }
  };

  const updateProfileImage = (imageUri) => {
    console.log('ProfileContext: Updating profile image to:', imageUri);
    setProfileData((prev) => ({
      ...prev,
      profileImage: imageUri,
    }));
  };

  const getInitials = (name) => {
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase();
  };

  return (
    <ProfileContext.Provider value={{
      profileData,
      loading,
      loadProfile,
      updateProfileData,
      updateProfileImage,
      getInitials
    }}>
      {children}
    </ProfileContext.Provider>
  );
};

export const useProfile = () => {
  const context = useContext(ProfileContext);
  if (!context) {
    throw new Error('useProfile must be used within a ProfileProvider');
  }
  return context;
};
