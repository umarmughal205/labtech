import React from 'react';
import { Stack } from 'expo-router';
import AdminLeisure from '../src/features/admin/AdminLeisure';

export default function AdminLeisureRoute() {
  return (
    <>
      <Stack.Screen
        options={{
          headerShown: false,
        }}
      />
      <AdminLeisure />
    </>
  );
}
