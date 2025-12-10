import React, { useMemo } from 'react';
import { SafeAreaView, View, Text, StyleSheet, ScrollView, TouchableOpacity, StatusBar, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';

export default function AdminViewTests() {
  const router = useRouter();
  const params = useLocalSearchParams();

  const baseTests = [
    {
      id: 1,
      name: 'Complete Blood Count',
      abbreviation: 'CBC',
      price: 'Rs. 450',
      description: 'Measures different components of blood including RBC, WBC, platelets',
    },
    {
      id: 2,
      name: 'Liver Function Tests',
      abbreviation: 'LFTs',
      price: 'Rs. 700',
      description: 'Evaluates liver health and function through enzyme levels',
    },
    {
      id: 3,
      name: 'Blood Sugar Test',
      abbreviation: 'FBS/RBS',
      price: 'Rs. 150',
      description: 'Measures fasting and random blood glucose levels',
    },
  ];

  const tests = useMemo(() => {
    const { abbreviation, name, description, price } = params;

    if (abbreviation && name && description && price) {
      return [
        {
          id: Date.now(),
          abbreviation: String(abbreviation),
          name: String(name),
          description: String(description),
          price: String(price),
        },
        ...baseTests,
      ];
    }

    return baseTests;
  }, [params]);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>View Existing Tests</Text>
        <View style={styles.headerRightPlaceholder} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.testsList}>
          {tests.map((test) => (
            <View key={test.id} style={styles.testCard}>
              <View style={styles.testHeaderRow}>
                <Text style={styles.testAbbreviation}>{test.abbreviation}</Text>
                <Text style={styles.testPrice}>{test.price}</Text>
              </View>
              <Text style={styles.testName}>{test.name}</Text>
              <Text style={styles.testDescription}>{test.description}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },
  headerRightPlaceholder: {
    width: 40,
    height: 40,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  testsList: {
    marginBottom: 24,
  },
  testCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 12,
  },
  testHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  testAbbreviation: {
    fontSize: 15,
    fontWeight: '700',
    color: '#3B82F6',
  },
  testPrice: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  testName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  testDescription: {
    fontSize: 13,
    color: '#6B7280',
  },
});
