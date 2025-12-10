import React from 'react';
import { Stack } from 'expo-router';
import Appointments from '../src/features/appointments/Appointments';

export default function AppointmentsRoute() {
  return (
    <>
      <Stack.Screen 
        options={{
          headerStyle: {
            backgroundColor: '#FFFFFF',
          },
          headerTintColor: '#000000',
          headerTitle: 'All Appointments',
          headerTitleAlign: 'center',
          headerTitleStyle: {
            fontWeight: 'bold',
            color: '#000000',
          },
        }} 
      />
      <Appointments />
    </>
  );
}
