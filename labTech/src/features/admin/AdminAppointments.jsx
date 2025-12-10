import React, { useState } from 'react';
import { SafeAreaView, View, Text, StyleSheet, ScrollView, TouchableOpacity, StatusBar, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import AdminDrawer from './AdminDrawer';

export default function AdminAppointments() {
  const router = useRouter();
  const [selectedPeriod, setSelectedPeriod] = useState('today');
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const periods = ['Today', 'Week', 'Month'];

  const summary = {
    today: { total: 18, completed: 14, cancelled: 2, pending: 2, revenue: 24500 },
    week: { total: 96, completed: 81, cancelled: 5, pending: 10, revenue: 135000 },
    month: { total: 380, completed: 340, cancelled: 12, pending: 28, revenue: 520000 },
  };

  const data = summary[selectedPeriod];

  const dailyBreakdown = [
    { id: 1, date: 'Nov 14, 2025', total: 18, completed: 14, pending: 2, cancelled: 2, revenue: 24500 },
    { id: 2, date: 'Nov 13, 2025', total: 22, completed: 20, pending: 1, cancelled: 1, revenue: 31000 },
    { id: 3, date: 'Nov 12, 2025', total: 19, completed: 16, pending: 2, cancelled: 1, revenue: 26000 },
  ];

  const formatCurrency = (amount) => `Rs. ${amount.toLocaleString()}`;


  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      <View style={styles.header}>
        <TouchableOpacity
          style={styles.menuButton}
          onPress={() => setIsMenuOpen((prev) => !prev)}
        >
          <Ionicons name={isMenuOpen ? 'close' : 'menu'} size={22} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Admin - Appointments</Text>
        <View style={styles.headerRightPlaceholder} />
      </View>

      <AdminDrawer
        isOpen={isMenuOpen}
        onClose={() => setIsMenuOpen(false)}
        activeRoute="appointments"
      />

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Quick action cards */}
        <View style={styles.quickActionsRow}>
          <TouchableOpacity
            style={styles.quickCard}
            onPress={() => router.push('/admin-view-appointments')}
          >
            <View style={styles.quickIconWrapper}>
              <Ionicons name="eye-outline" size={20} color="#3B82F6" />
            </View>
            <View style={styles.quickTextWrapper}>
              <Text style={styles.quickTitle}>View Appointments</Text>
              <Text style={styles.quickSubtitle}>See today&apos;s booked slots</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickCard}
            onPress={() => router.push('/view-appointments-finance')}
          >
            <View style={styles.quickIconWrapper}>
              <Ionicons name="stats-chart-outline" size={20} color="#10B981" />
            </View>
            <View style={styles.quickTextWrapper}>
              <Text style={styles.quickTitle}>View Appintments Finance</Text>
              <Text style={styles.quickSubtitle}>Overview by day & period</Text>
            </View>
          </TouchableOpacity>
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
  menuButton: {
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
  menuOverlay: {
    position: 'absolute',
    top: 0,
    left: '70%',
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(15, 23, 42, 0.35)',
    zIndex: 15,
  },
  menuContainer: {
    position: 'absolute',
    top: 25,
    left: 0,
    bottom: 0,
    width: '70%',
    backgroundColor: '#FFFFFF',
    paddingTop: 20,
    paddingHorizontal: 16,
    paddingBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 4, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
    borderRightWidth: 1,
    borderRightColor: '#E5E7EB',
    zIndex: 20,
  },
  drawerTopBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  drawerTopIconBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#5B21B6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 20,
    paddingHorizontal: 12,
    backgroundColor: '#5B21B6',
    borderRadius: 16,
    marginBottom: 12,
    marginTop: 14,
  },
  profileAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#A855F7',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  profileAvatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 26,
  },
  profileAvatarText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  profileEmail: {
    fontSize: 13,
    color: '#E5E7EB',
  },
  menuSection: {
    marginTop: 16,
    paddingVertical: 8,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    marginBottom: 4,
  },
  menuItemIcon: {
    marginRight: 12,
  },
  menuItemLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
  },
  menuFooter: {
    marginTop: 'auto',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  menuFooterTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 4,
  },
  menuFooterVersion: {
    fontSize: 11,
    color: '#9CA3AF',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  quickActionsRow: {
    marginTop: 16,
    marginBottom: 16,
  },
  quickCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  quickIconWrapper: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EEF2FF',
    marginTop: 2,
  },
  quickTextWrapper: {
    marginLeft: 10,
  },
  quickTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  quickSubtitle: {
    fontSize: 13,
    color: '#6B7280',
  },
  periodSelector: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 4,
    marginTop: 16,
    marginBottom: 20,
  },
  periodButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
  },
  activePeriodButton: {
    backgroundColor: '#3B82F6',
  },
  periodButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  activePeriodButtonText: {
    color: '#FFFFFF',
  },
  summaryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 24,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 12,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  summaryItem: {
    flex: 1,
  },
  summaryLabel: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  summaryRevenueRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
  },
  summaryRevenueLabel: {
    fontSize: 14,
    color: '#6B7280',
  },
  summaryRevenueValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#16A34A',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 12,
  },
  cardList: {
    gap: 12,
  },
  dayCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  dayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  dayDate: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  dayTotal: {
    fontSize: 13,
    color: '#6B7280',
  },
  dayStatsRow: {
    marginTop: 8,
    marginBottom: 8,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  completedDot: {
    backgroundColor: '#16A34A',
  },
  pendingDot: {
    backgroundColor: '#F59E0B',
  },
  cancelledDot: {
    backgroundColor: '#EF4444',
  },
  badgeText: {
    fontSize: 12,
    color: '#4B5563',
  },
  dayRevenueRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  dayRevenueLabel: {
    fontSize: 13,
    color: '#6B7280',
  },
  dayRevenueValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
});
