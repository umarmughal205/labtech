import React from 'react';
import { Stack } from 'expo-router';
import AdminViewTests from '../src/features/admin/AdminViewTests';

export default function AdminViewTestsRoute() {
  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <AdminViewTests />
    </>
  );
}
