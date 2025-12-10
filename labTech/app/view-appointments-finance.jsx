import React from 'react';
import { Stack } from 'expo-router';
import ViewAppointmentsFinance from '../src/features/admin/ViewAppointmentsFinance';

export default function ViewAppointmentsFinanceRoute() {
  return (
    <>
      <Stack.Screen
        options={{
          headerShown: false,
        }}
      />
      <ViewAppointmentsFinance />
    </>
  );
}
