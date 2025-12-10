import React from 'react';
import { Stack } from 'expo-router';
import AdminTests from '../src/features/admin/AdminTests';

export default function AdminTestsRoute() {
  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <AdminTests />
    </>
  );
}
