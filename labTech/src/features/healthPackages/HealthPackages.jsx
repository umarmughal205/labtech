import React from 'react';
import { SafeAreaView, View, Text, StyleSheet, TouchableOpacity, ScrollView, StatusBar, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

export default function HealthPackages() {
  const router = useRouter();

  // Sample health packages data
  const allHealthPackages = [
    {
      id: 1,
      name: 'Complete Blood Count (CBC)',
      description: 'Comprehensive blood analysis including RBC, WBC, platelets',
      price: '$45',
      image: '🩸',
      color: '#DC2626',
      duration: '2-3 hours'
    },
    {
      id: 2,
      name: 'Blood Sugar Test',
      description: 'Fasting and random glucose level measurement',
      price: '$25',
      image: '🩺',
      color: '#7C2D12',
      duration: '1 hour'
    },
    {
      id: 3,
      name: 'Thyroid Function Test',
      description: 'TSH, T3, T4 hormone level analysis',
      price: '$65',
      image: '🫀',
      color: '#059669',
      duration: '2 hours'
    },
    {
      id: 4,
      name: 'Lipid Profile',
      description: 'Cholesterol and triglyceride levels',
      price: '$35',
      image: '💊',
      color: '#7C3AED',
      duration: '1-2 hours'
    },
    {
      id: 5,
      name: 'Liver Function Test',
      description: 'ALT, AST, bilirubin and other liver markers',
      price: '$55',
      image: '🧬',
      color: '#DC2626',
      duration: '2 hours'
    },
    {
      id: 6,
      name: 'Kidney Function Test',
      description: 'Creatinine, BUN, and electrolyte analysis',
      price: '$50',
      image: '🔬',
      color: '#0891B2',
      duration: '1-2 hours'
    }
  ];

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Health Packages</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.packagesGrid}>
          {allHealthPackages.map((pkg) => (
            <TouchableOpacity key={pkg.id} style={styles.packageCard}>
              <View style={[styles.packageHeader, { backgroundColor: pkg.color }]}>
                <Text style={styles.packageIcon}>{pkg.image}</Text>
                <Text style={styles.packagePrice}>{pkg.price}</Text>
              </View>
              <View style={styles.packageContent}>
                <Text style={styles.packageName}>{pkg.name}</Text>
                <Text style={styles.packageDescription}>{pkg.description}</Text>
                <View style={styles.packageFooter}>
                  <View style={styles.durationContainer}>
                    <Ionicons name="time-outline" size={16} color="#6B7280" />
                    <Text style={styles.durationText}>{pkg.duration}</Text>
                  </View>
                  <TouchableOpacity style={styles.bookButton}>
                    <Text style={styles.bookButtonText}>Book Now</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableOpacity>
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
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  packagesGrid: {
    gap: 16,
  },
  packageCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    marginBottom: 16,
  },
  packageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    minHeight: 80,
  },
  packageIcon: {
    fontSize: 32,
  },
  packagePrice: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  packageContent: {
    padding: 16,
  },
  packageName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 8,
  },
  packageDescription: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
    marginBottom: 16,
  },
  packageFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  durationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  durationText: {
    fontSize: 12,
    color: '#6B7280',
  },
  bookButton: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  bookButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
});
