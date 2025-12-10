import React, { useState, useEffect } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, StatusBar, Platform, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import apiConfig from '../../config/api';

export default function Tests() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [tests, setTests] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const loadTests = async () => {
      setLoading(true);
      try {
        const res = await fetch(`${apiConfig.BASE_URL}/api/tests`, {
          headers: { 'Content-Type': 'application/json' },
        });
        if (!res.ok) throw new Error('Failed to load tests');
        const data = await res.json();
        if (Array.isArray(data)) setTests(data);
        else setTests([]);
      } catch (err) {
        console.warn('Failed to load tests', err);
        setTests([]);
      } finally {
        setLoading(false);
      }
    };

    loadTests();
  }, []);

  const filteredTests = tests.filter(test => {
    const name = (test.name || '').toString().toLowerCase();
    const desc = (test.description || '').toString().toLowerCase();
    const q = searchQuery.toLowerCase();
    if (!q) return true;
    return name.includes(q) || desc.includes(q);
  });

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Lab Tests</Text>
        <View style={styles.headerPlaceholder} />
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={20} color="#6B7280" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search tests..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor="#9CA3AF"
          />
        </View>
      </View>

      {/* Tests Grid */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.testsGrid}>
          {filteredTests.map((test) => {
            const priceNumber = typeof test.price === 'number' ? test.price : Number(test.price) || 0;
            return (
              <TouchableOpacity key={test._id || test.id || test.name} style={styles.testCard} activeOpacity={0.9}>
                <Text style={styles.testName}>{test.name}</Text>
                <Text style={styles.testDescription}>{test.description || ''}</Text>
                <Text style={styles.testPrice}>Rs. {priceNumber.toFixed(0)}</Text>
              </TouchableOpacity>
            );
          })}
          {loading && filteredTests.length === 0 && (
            <Text style={{ textAlign: 'center', color: '#6B7280', marginTop: 16 }}>Loading tests...</Text>
          )}
          {!loading && filteredTests.length === 0 && (
            <Text style={{ textAlign: 'center', color: '#6B7280', marginTop: 16 }}>No tests found.</Text>
          )}
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
    borderBottomColor: '#F3F4F6',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
  },
  headerPlaceholder: {
    width: 40,
  },
  searchContainer: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: '#FFFFFF',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 15,
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: '#000000',
    fontWeight: '500',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  testsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingBottom: 20,
  },
  testCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    width: '48%',
    alignItems: 'center',
    justifyContent: 'space-between',
    
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#3B82F6',
  },
  testAbbreviation: {
    fontSize: 18,
    fontWeight: '700',
    color: '#3B82F6',
    marginBottom: 8,
    textAlign: 'center',
  },
  testName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
    textAlign: 'center',
  },
  testDescription: {
    fontSize: 11,
    color: '#6B7280',
    marginBottom: 12,
    textAlign: 'center',
    lineHeight: 16,
  },
  testPrice: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    textAlign: 'center',
  },
});
