import { Stack } from 'expo-router';
import Tests from '../src/features/tests/Tests';

export default function TestsPage() {
  return (
    <>
      <Stack.Screen 
        options={{
          headerStyle: {
            backgroundColor: '#FFFFFF',
          },
          headerTintColor: '#000000',
          headerTitle: 'All Tests',
          headerTitleAlign: 'center',
          headerTitleStyle: {
            fontWeight: 'bold',
            color: '#000000',
          },
        }} 
      />
      <Tests />
    </>
  );
}
