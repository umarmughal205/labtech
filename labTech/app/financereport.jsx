import React from 'react';
import { Stack } from 'expo-router';
import FinanceReport from '../src/features/admin/FinanceReport';

export default function FinanceReportRoute() {
  return (
    <>
      <Stack.Screen 
        options={{
          headerStyle: {
            backgroundColor: '#FFFFFF',
          },
          headerTintColor: '#000000',
          headerTitle: 'Finance Report',
          headerTitleAlign: 'center',
          headerTitleStyle: {
            fontWeight: 'bold',
            color: '#000000',
          },
          headerShown: false,
        }} 
      />
      <FinanceReport />
    </>
  );
}
