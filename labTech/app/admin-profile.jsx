import React from 'react';
import { Stack } from 'expo-router';
import AdminProfile from '../src/features/admin/AdminProfile';

export default function AdminProfileRoute() {
  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <AdminProfile />
    </>
  );
}
