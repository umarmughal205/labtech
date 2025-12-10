import React from 'react';
import { Stack } from 'expo-router';
import AddNewTest from '../src/features/admin/AddNewTest';

export default function AdminAddTestRoute() {
  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <AddNewTest />
    </>
  );
}
