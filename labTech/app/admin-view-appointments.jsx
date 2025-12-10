import React from 'react';
import { Stack } from 'expo-router';
import AdminViewAppointments from '../src/features/admin/AdminViewAppointments';

export default function AdminViewAppointmentsRoute() {
  return (
    <>
      <Stack.Screen
        options={{
          headerShown: false,
        }}
      />
      <AdminViewAppointments />
    </>
  );
}
