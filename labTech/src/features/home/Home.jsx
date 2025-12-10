import React, { useState, useEffect } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { View, Text, StyleSheet, TouchableOpacity, Image, ScrollView, useWindowDimensions, Platform, StatusBar } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useProfile } from '../../context/ProfileContext';
import { useNotifications } from '../../context/NotificationContext';
import { getDynamicPatientAppointments } from '../../store/patientAppointmentsStore';
import apiConfig from '../../config/api';

export default function Home() {
  const router = useRouter();
  const { width, height } = useWindowDimensions();
  const { profileData, getInitials } = useProfile();
  const { unreadPatientCount } = useNotifications();
  const [isFirstLaunch, setIsFirstLaunch] = useState(true);
  
  // First launch detection
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsFirstLaunch(false);
    }, 100);
    
    return () => clearTimeout(timer);
  }, []);
  
  // Calculate reduced safe area for first launch (5% reduction)
  const topPadding = isFirstLaunch ? 8 : 12;

  const isSmall = width < 360 || height < 700;
  const isTablet = Math.max(width, height) >= 900;
  
  const sidePad = isTablet ? 28 : isSmall ? 16 : 20;
  const bottomPad = isTablet ? 36 : isSmall ? 20 : 28;

  // Sample fallback appointments (used if there are no dynamic ones yet)
  const sampleUpcomingAppointments = [
    {
      id: 'home-sample-1',
      doctorName: 'Dr. Sarah Johnson',
      status: 'Confirmed',
      date: 'Nov 15, 2025',
      time: '10:30 AM',
      specialty: 'Cardiologist',
      type: 'Consultation',
      avatar: '👩‍⚕️',
    },
    {
      id: 'home-sample-2',
      doctorName: 'Mr. Ali Hassan',
      status: 'Pending',
      date: 'Nov 20, 2025',
      time: '2:00 PM',
      specialty: 'Neurologist',
      avatar: '👨‍⚕️',
    },
  ];

  // Combine dynamic appointments (created via booking) with sample ones
  const allAppointments = [
    ...getDynamicPatientAppointments(),
    ...sampleUpcomingAppointments,
  ];

  // Pick at most two upcoming cards: first Confirmed, then Pending
  const firstConfirmed = allAppointments.find((apt) => apt.status === 'Confirmed');
  const firstPending = allAppointments.find((apt) => apt.status === 'Pending');

  const upcomingCards = [];
  if (firstConfirmed) {
    upcomingCards.push(firstConfirmed);
  }
  if (firstPending && (!firstConfirmed || firstPending.id !== firstConfirmed.id)) {
    upcomingCards.push(firstPending);
  }

  const healthPackages = [
    {
      id: 1,
      name: 'Cardio',
      image: '\u2764\ufe0f',
      color: '#EF4444'
    },
    {
      id: 2,
      name: 'Dental',
      image: '\ud83e\udeb7',
      color: '#3B82F6'
    },
    {
      id: 3,
      name: 'Thyroid',
      image: '\ud83e\uddb0',
      color: '#059669'
    }
  ];

  // Load real lab tests from backend for Home screen cards
  const [availableTests, setAvailableTests] = useState([]);
  const [testsLoading, setTestsLoading] = useState(false);

  useEffect(() => {
    const loadTests = async () => {
      setTestsLoading(true);
      try {
        const res = await fetch(`${apiConfig.BASE_URL}/api/tests`, {
          headers: { 'Content-Type': 'application/json' },
        });
        if (!res.ok) throw new Error('failed');
        const data = await res.json();
        if (Array.isArray(data)) setAvailableTests(data);
        else setAvailableTests([]);
      } catch {
        setAvailableTests([]);
      } finally {
        setTestsLoading(false);
      }
    };

    loadTests();
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" translucent={false} />
      <ScrollView 
        contentContainerStyle={[styles.content, { paddingHorizontal: sidePad, paddingBottom: bottomPad + 80 }]} 
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.profileSection}>
            <TouchableOpacity 
              style={styles.avatar}
              onPress={() => router.push('/profile')}
            >
              {profileData.profileImage ? (
                <Image source={{ uri: profileData.profileImage }} style={styles.avatarImage} />
              ) : (
                <LinearGradient
                  colors={['#8B5CF6', '#3B82F6']}
                  style={styles.avatarGradient}
                >
                  <Text style={styles.avatarText}>{getInitials(profileData.fullName)}</Text>
                </LinearGradient>
              )}
            </TouchableOpacity>
          </View>
          <Text style={styles.appTitle}>MedSync</Text>
          <TouchableOpacity 
            style={styles.notificationButton}
            onPress={() => router.push('/notifications')}
          >
            <Ionicons name="notifications-outline" size={20} color="#6B7280" />
            {unreadPatientCount > 0 && (
              <View style={styles.notificationBadge}>
                <Text style={styles.notificationBadgeText}>
                  {unreadPatientCount > 99 ? '99+' : unreadPatientCount}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* Main Content Card */}
        <LinearGradient
          colors={['#8B5CF6', '#3B82F6']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.mainCard}
        >
          {/* Welcome Section */}
          <View style={styles.welcomeSection}>
            <Text style={styles.welcomeTitle}>
              Hello, {(profileData && profileData.fullName) ? profileData.fullName : 'User'}!
            </Text>
            <Text style={styles.welcomeSubtitle}>
              Stay healthy, manage your appointments and view reports easily.
            </Text>
          </View>

          {/* Action Buttons */}
          <View style={styles.actionButtons}>
            <TouchableOpacity 
              style={styles.bookNowButton}
              onPress={() => router.push('/bookappointment')}
            >
              <Text style={styles.bookNowText}>Book Now</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.viewReportsButton}
              onPress={() => router.push('/reports')}
            >
              <Text style={styles.viewReportsText}>View Reports</Text>
            </TouchableOpacity>
          </View>
        </LinearGradient>

        {/* Upcoming Appointments (max 2: one Confirmed, one Pending) */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Appointments</Text>
            <TouchableOpacity onPress={() => router.push('/appointments')}>
              <Text style={styles.viewAllText}>View All</Text>
            </TouchableOpacity>
          </View>
          {upcomingCards.map((appointment) => (
            <View key={appointment.id} style={styles.appointmentCard}>
              <View style={styles.appointmentInfo}>
                <Text style={styles.doctorName}>{appointment.doctorName}</Text>
                <Text style={styles.appointmentDateTime}>
                  {appointment.date}, {appointment.time}
                </Text>
                <Text style={styles.specialty}>
                  {appointment.specialty}{appointment.type ? ` : ${appointment.type}` : ''}
                </Text>
              </View>
              <View
                style={[
                  styles.statusIndicator,
                  appointment.status === 'Confirmed'
                    ? styles.confirmedIndicator
                    : styles.pendingIndicator,
                ]}
              >
                <Text style={styles.statusText}>{appointment.status}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Tests Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Lab Tests</Text>
            <TouchableOpacity onPress={() => router.push('/tests')}>
              <Text style={styles.viewAllText}>View All</Text>
            </TouchableOpacity>
          </View>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.testsContainer}
          >
            {availableTests.slice(0, 5).map((test) => (
              <TouchableOpacity
                key={test._id || test.id || test.name}
                style={styles.testCard}
              >
                <Text style={styles.testAbbreviation}>{test.name}</Text>
                <Text style={styles.testName}>{(test.notes || test.description || '').toString()}</Text>
                <Text style={styles.testPrice}>
                  Rs. {Number(test.price || 0)}
                </Text>
              </TouchableOpacity>
            ))}

            {/* Arrow card to navigate to full Tests screen */}
            <TouchableOpacity 
              style={styles.testMoreCard}
              onPress={() => router.push('/tests')}
            >
              <Ionicons name="arrow-forward" size={24} color="#3B82F6" />
              <Text style={styles.testMoreText}>View more</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>

        {/* Health Packages (temporarily disabled)
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Health Packages</Text>
            <TouchableOpacity onPress={() => router.push('/healthpackages')}>
              <Text style={styles.viewAllText}>View All</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.packagesGrid}>
            {healthPackages.map((pkg) => (
              <TouchableOpacity key={pkg.id} style={[styles.packageCard, { backgroundColor: pkg.color }]}> 
                <View style={styles.packageContent}>
                  <Text style={styles.packageIcon}>{pkg.image}</Text>
                </View>
                <Text style={styles.packageName}>{pkg.name}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
        */}
      </ScrollView>

      {/* Bottom Navigation */}
      <View style={styles.bottomNav}>
        <TouchableOpacity style={[styles.navItem, styles.activeNavItem]}>
          <Ionicons name="home" size={24} color="#3B82F6" style={styles.navIcon} />
          <Text style={[styles.navLabel, styles.activeNavLabel]}>Home</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.navItem}
          onPress={() => router.push('/appointments')}
        >
          <Ionicons name="calendar-outline" size={24} color="#6B7280" style={styles.navIcon} />
          <Text style={styles.navLabel}>Appointments</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.navItem}
          onPress={() => router.push('/reports')}
        >
          <Ionicons name="document-text-outline" size={24} color="#6B7280" style={styles.navIcon} />
          <Text style={styles.navLabel}>Reports</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.navItem}
          onPress={() => router.push('/settings')}
        >
          <Ionicons name="settings-outline" size={24} color="#6B7280" style={styles.navIcon} />
          <Text style={styles.navLabel}>Settings</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  content: {
    paddingTop: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    paddingTop: Platform.OS === 'ios' ? 6 : 4,
    paddingHorizontal: 4,
    borderBottomColor: 'black'
  },
  profileSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    overflow: 'hidden',
  },
  avatarImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  avatarGradient: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  notificationButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  notificationBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: '#DC2626',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  notificationBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 16,
  },
  appTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
    flex: 1,
    textAlign: 'center',
  },
  mainCard: {
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    marginBottom: 32,
    paddingHorizontal: 20,
    paddingTop: 22,
    paddingBottom: 18,
    marginHorizontal: -20,
    justifyContent: 'center',
  },
  welcomeSection: {
    marginBottom: 24,
  },
  welcomeTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  welcomeSubtitle: {
    fontSize: 16,
    color: '#E5E7EB',
    lineHeight: 24,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 32,
  },
  bookNowButton: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bookNowText: {
    color: '#3B82F6',
    fontSize: 16,
    fontWeight: '600',
  },
  viewReportsButton: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  viewReportsText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  section: {
    marginBottom: 32,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
  },
  viewAllText: {
    fontSize: 14,
    color: '#3B82F6',
    fontWeight: '600',
  },
  appointmentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  appointmentInfo: {
    flex: 1,
  },
  doctorName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  appointmentDateTime: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 4,
  },
  statusIndicator: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    minWidth: 80,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmedIndicator: {
    backgroundColor: '#059669',
  },
  pendingIndicator: {
    backgroundColor: '#EAB308',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  specialty: {
    fontSize: 14,
    color: '#6B7280',
  },
  packagesGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  packageCard: {
    flex: 1,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    minHeight: 120,
    justifyContent: 'space-between',
  },
  packageContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  packageIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  packageName: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  bottomNav: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  navItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
  },
  activeNavItem: {
    // Active state styling handled by text color
  },
  navIcon: {
    fontSize: 20,
    marginBottom: 4,
  },
  navLabel: {
    fontSize: 12,
    color: '#6B7280',
  },
  activeNavLabel: {
    color: '#3B82F6',
    fontWeight: '600',
  },
  testsContainer: {
    paddingRight: 16,
    paddingBottom: 8,
  },
  testCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 18,
    marginRight: 14,
    width: 160,
    minHeight: 150,
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#3B82F6',
  },
  testMoreCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 18,
    marginRight: 14,
    width: 120,
    minHeight: 150,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  testMoreText: {
    marginTop: 8,
    fontSize: 13,
    fontWeight: '500',
    color: '#3B82F6',
    textAlign: 'center',
  },
  testAbbreviation: {
    fontSize: 16,
    fontWeight: '700',
    color: '#3B82F6',
    marginBottom: 6,
    textAlign: 'center',
  },
  testName: {
    fontSize: 11,
    fontWeight: '500',
    color: '#6B7280',
    marginBottom: 10,
    textAlign: 'center',
    lineHeight: 15,
  },
  testPrice: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
    textAlign: 'center',
  },
});
