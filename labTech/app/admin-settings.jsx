import React from 'react';
import { Stack } from 'expo-router';
import AdminSettings from '../src/features/admin/AdminSettings';

export default function AdminSettingsRoute() {
  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <AdminSettings />
    </>
  );
}
