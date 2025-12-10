import React from 'react';
import { Stack } from 'expo-router';
import AdminLedger from '../src/features/admin/AdminLedger';

export default function AdminLedgerRoute() {
  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <AdminLedger />
    </>
  );
}
