import React from 'react';
import { Stack } from 'expo-router';
import AdminAppointments from '../src/features/admin/AdminAppointments';

export default function AdminAppointmentsRoute() {
  return (
    <>
      <Stack.Screen
        options={{
          headerShown: false,
        }}
      />
      <AdminAppointments />
    </>
  );
}
