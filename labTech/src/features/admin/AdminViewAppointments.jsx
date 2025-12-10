import React, { useState, useEffect } from 'react';
import { SafeAreaView, View, Text, StyleSheet, ScrollView, TouchableOpacity, StatusBar, Platform, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useNotifications } from '../../context/NotificationContext';
import { useAuth } from '../../context/AuthContext';
import { API_ENDPOINTS } from '../../config/api';

// Helper to format dates as `day month year` for admin dialogs
const formatDisplayDate = (dateString) => {
  if (!dateString) return '';
  // date is stored as 'YYYY-MM-DD'
  const [yearStr, monthStr, dayStr] = String(dateString).split('-');
  const year = Number(yearStr);
  const month = Number(monthStr);
  const day = Number(dayStr);

  if (!year || !month || !day) {
    return dateString;
  }

  const dateObj = new Date(year, month - 1, day);
  if (Number.isNaN(dateObj.getTime())) {
    return dateString;
  }

  return dateObj.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
};

// Admin screen to inspect concrete appointments (e.g. bookings)

export default function AdminViewAppointments() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { notifications, unreadAdminCount, addNotification } = useNotifications();
  const { authToken, isAdmin } = useAuth();
  const [appointments, setAppointments] = useState([]);
  const [statusFilter, setStatusFilter] = useState(
    typeof params.statusFilter === 'string' && params.statusFilter
      ? params.statusFilter
      : 'Pending'
  );
  const [dateFilter, setDateFilter] = useState('Today'); // 'Today' | 'Week' | 'Month'
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  
  // Load all appointments from backend for admin
  useEffect(() => {
    const fetchAppointments = async () => {
      try {
        if (!authToken || !isAdmin()) return;

        const response = await fetch(API_ENDPOINTS.APPOINTMENTS_ADMIN_LIST, {
          headers: { Authorization: `Bearer ${authToken}` },
        });

        const data = await response.json();
        if (!response.ok || !data.success) {
          console.warn('Failed to load admin appointments:', data);
          return;
        }

        const mapped = (data.appointments || []).map(api => ({
          id: api._id,
          patientName: api.patientName,
          testName: api.testName,
          date: api.date,
          time: api.time,
          emailOrPhone: api.contact,
          gender: api.gender,
          age: api.age,
          cnic: api.cnic,
          guardian: api.guardian,
          guardianName: api.guardianName,
          payment: api.paymentStatus,
          status: api.status,
          createdAt: api.createdAt, // booking timestamp from backend
          cancelledBy: api.cancelledBy,
        }));

        setAppointments(mapped);
      } catch (err) {
        console.error('Error fetching admin appointments:', err);
      }
    };

    fetchAppointments();
  }, [authToken, isAdmin]);

  const updateStatusLocal = (id, newStatus) => {
    setAppointments(prev =>
      prev.map(apt => (apt.id === id ? { ...apt, status: newStatus } : apt))
    );
  };

  const filteredAppointments = appointments.filter(apt => {
    const matchesStatus = statusFilter ? apt.status === statusFilter : true;

    // Use createdAt (booking timestamp) for date-based filters
    if (!apt.createdAt) {
      return matchesStatus;
    }

    const created = new Date(apt.createdAt);
    if (Number.isNaN(created.getTime())) {
      return matchesStatus;
    }

    const today = new Date();

    const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const createdDateOnly = new Date(created.getFullYear(), created.getMonth(), created.getDate());

    let matchesDate = true;

    if (dateFilter === 'Today') {
      matchesDate = createdDateOnly.getTime() === startOfToday.getTime();
    } else if (dateFilter === 'Week') {
      // Week: from Monday of current week up to today (inclusive), using booking date
      const dayOfWeek = startOfToday.getDay(); // 0 (Sun) - 6 (Sat)
      const diffToMonday = (dayOfWeek + 6) % 7; // 0 if Mon, 1 if Tue, ...
      const monday = new Date(startOfToday);
      monday.setDate(startOfToday.getDate() - diffToMonday);

      matchesDate =
        createdDateOnly.getTime() >= monday.getTime() &&
        createdDateOnly.getTime() <= startOfToday.getTime();
    } else if (dateFilter === 'Month') {
      const sameYear = created.getFullYear() === today.getFullYear();
      const sameMonth = created.getMonth() === today.getMonth();
      matchesDate = sameYear && sameMonth && createdDateOnly.getTime() <= startOfToday.getTime();
    }

    return matchesStatus && matchesDate;
  });

  const openAppointmentDetail = (apt) => {
    setSelectedAppointment(apt);
    setShowDetailModal(true);
  };

  const closeAppointmentDetail = () => {
    setShowDetailModal(false);
    setSelectedAppointment(null);
  };

  const getEmptyStateTexts = () => {
    let period = 'today';
    if (dateFilter === 'Week') period = 'this week';
    if (dateFilter === 'Month') period = 'this month';

    if (statusFilter === 'Pending') {
      return {
        title: `No pending appointments for ${period}`,
        subtitle: 'New bookings will appear here when patients schedule tests.',
      };
    }

    if (statusFilter === 'Confirmed') {
      return {
        title: `No confirmed appointments for ${period}`,
        subtitle: 'Once you confirm bookings, they will be listed here.',
      };
    }

    if (statusFilter === 'Cancelled') {
      return {
        title: `No cancelled appointments for ${period}`,
        subtitle: 'When appointments are cancelled, they will be shown here for your record.',
      };
    }

    return {
      title: 'No appointments found',
      subtitle: 'Try adjusting the filters.',
    };
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>View Appointments</Text>
        <TouchableOpacity
          style={styles.headerRightButton}
          onPress={() => router.push('/admin-notifications')}
        >
          <Ionicons name="notifications-outline" size={22} color="#111827" />
          {unreadAdminCount > 0 && (
            <View style={styles.headerBadge}>
              <Text style={styles.headerBadgeText}>
                {unreadAdminCount > 9 ? '9+' : unreadAdminCount}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.subtitle}>Today’s booked appointments</Text>

        {/* Date period filters (same logic as Finance view) */}
        <View style={styles.datePeriodSelector}>
          {['Today', 'Week', 'Month'].map((label) => {
            const isActive = dateFilter === label;
            let text = label;

            if (label === 'Today') {
              text = 'Today';
            } else if (label === 'Week') {
              text = 'This week';
            } else if (label === 'Month') {
              text = 'This month';
            }

            return (
              <TouchableOpacity
                key={label}
                style={[
                  styles.datePeriodButton,
                  isActive && styles.activeDatePeriodButton,
                ]}
                onPress={() => setDateFilter(label)}
              >
                <Text
                  style={[
                    styles.datePeriodButtonText,
                    isActive && styles.activeDatePeriodButtonText,
                  ]}
                >
                  {text}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={styles.filterRow}>
          {['Pending', 'Confirmed', 'Cancelled'].map((status) => (
            <TouchableOpacity
              key={status}
              style={[
                styles.filterChip,
                statusFilter === status && styles.filterChipActive,
              ]}
              onPress={() => setStatusFilter(status)}
            >
              <Text
                style={[
                  styles.filterChipText,
                  statusFilter === status && styles.filterChipTextActive,
                ]}
              >
                {status}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Date filters removed: admin now filters appointments only by status */}

        {filteredAppointments.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIconWrapper}>
              <Ionicons name="calendar-outline" size={32} color="#9CA3AF" />
            </View>
            <Text style={styles.emptyStateTitle}>{getEmptyStateTexts().title}</Text>
            <Text style={styles.emptyStateText}>{getEmptyStateTexts().subtitle}</Text>
          </View>
        ) : (
          filteredAppointments.map((apt) => (
            <TouchableOpacity
              key={apt.id}
              activeOpacity={0.9}
              onPress={() => openAppointmentDetail(apt)}
            >
              <View style={styles.card}>
                <View style={styles.cardHeader}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Text style={styles.patientName}>{apt.patientName}</Text>
                    {params.highlightAppointmentId === apt.id && (
                      <View style={styles.newBadge}>
                        <Text style={styles.newBadgeText}>NEW</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.time}>{apt.time}</Text>
                </View>
                <Text style={styles.dateText}>Date: {apt.date}</Text>
                <Text style={styles.testName}>{apt.testName}</Text>
                <View style={styles.cardFooter}>
                  <View>
                    <Text style={styles.appointmentId}>{apt.id}</Text>
                  </View>

                  <View style={styles.statusColumn}>
                    <View
                      style={[
                        styles.statusBadge,
                        apt.status === 'Completed' && styles.statusCompleted,
                        apt.status === 'Pending' && styles.statusPending,
                        apt.status === 'Confirmed' && styles.statusConfirmed,
                        apt.status === 'Cancelled' && styles.statusCancelled,
                      ]}
                    >
                      <Text style={styles.statusText}>{apt.status}</Text>
                    </View>
                    {apt.status === 'Cancelled' && apt.cancelledBy === 'patient' && (
                      <Text style={styles.cancelledByText}>by patient</Text>
                    )}
                  </View>
                </View>
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>

      <Modal
        visible={showDetailModal}
        transparent
        animationType="fade"
        onRequestClose={closeAppointmentDetail}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Appointment Detail</Text>
              <TouchableOpacity onPress={closeAppointmentDetail}>
                <Ionicons name="close" size={22} color="#6B7280" />
              </TouchableOpacity>
            </View>

            {selectedAppointment && (
              <View style={styles.modalBody}>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Lab Test</Text>
                  <Text style={[styles.detailValue, styles.detailValueStrong]}>{selectedAppointment.testName}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Patient Name</Text>
                  <Text style={styles.detailValue}>{selectedAppointment.patientName}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Email/Phone</Text>
                  <Text style={styles.detailValue}>{selectedAppointment.emailOrPhone}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Gender</Text>
                  <Text style={styles.detailValue}>{selectedAppointment.gender}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Age</Text>
                  <Text style={styles.detailValue}>{selectedAppointment.age}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>CNIC</Text>
                  <Text style={styles.detailValue}>{selectedAppointment.cnic}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Guardian</Text>
                  <Text style={styles.detailValue}>{selectedAppointment.guardian}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Guardian Name</Text>
                  <Text style={styles.detailValue}>{selectedAppointment.guardianName}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Date</Text>
                  <Text style={styles.detailValue}>{formatDisplayDate(selectedAppointment.date)}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Time</Text>
                  <Text style={styles.detailValue}>{selectedAppointment.time}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Payment</Text>
                  <Text style={styles.detailValue}>{selectedAppointment.payment}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Status</Text>
                  <Text style={styles.detailValue}>{selectedAppointment.status}</Text>
                </View>
              </View>
            )}

            {selectedAppointment && (
              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.modalConfirmButton]}
                  onPress={async () => {
                    try {
                      if (authToken && isAdmin()) {
                        const response = await fetch(
                          API_ENDPOINTS.APPOINTMENTS_ADMIN_UPDATE_STATUS(selectedAppointment.id),
                          {
                            method: 'PATCH',
                            headers: {
                              'Content-Type': 'application/json',
                              Authorization: `Bearer ${authToken}`,
                            },
                            body: JSON.stringify({ status: 'Confirmed' }),
                          }
                        );

                        const data = await response.json();
                        if (!response.ok || !data.success) {
                          console.warn('Failed to update appointment status (Confirm):', data);
                          return; // do not notify patient or change local state on failure
                        }
                      }
                    } catch (err) {
                      console.error('Error updating appointment status (Confirm):', err);
                      return; // backend error, skip local update/notification
                    }

                    updateStatusLocal(selectedAppointment.id, 'Confirmed');
                    closeAppointmentDetail();
                  }}
                >
                  <Text style={styles.modalButtonText}>Confirm</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalButton, styles.modalCancelButton]}
                  onPress={async () => {
                    try {
                      if (authToken && isAdmin()) {
                        const response = await fetch(
                          API_ENDPOINTS.APPOINTMENTS_ADMIN_UPDATE_STATUS(selectedAppointment.id),
                          {
                            method: 'PATCH',
                            headers: {
                              'Content-Type': 'application/json',
                              Authorization: `Bearer ${authToken}`,
                            },
                            body: JSON.stringify({ status: 'Cancelled' }),
                          }
                        );

                        const data = await response.json();
                        if (!response.ok || !data.success) {
                          console.warn('Failed to update appointment status (Cancel):', data);
                          return; // do not notify patient or change local state on failure
                        }
                      }
                    } catch (err) {
                      console.error('Error updating appointment status (Cancel):', err);
                      return; // backend error, skip local update/notification
                    }

                    updateStatusLocal(selectedAppointment.id, 'Cancelled');
                    closeAppointmentDetail();
                  }}
                >
                  <Text style={styles.modalButtonText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </Modal>
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
  headerRightButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#DC2626',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  headerBadgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '700',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  datePeriodSelector: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 4,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  datePeriodButton: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 8,
  },
  activeDatePeriodButton: {
    backgroundColor: '#3B82F6',
  },
  datePeriodButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
  },
  activeDatePeriodButtonText: {
    color: '#FFFFFF',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyIconWrapper: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  emptyStateTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
    textAlign: 'center',
  },
  emptyStateText: {
    fontSize: 13,
    color: '#6B7280',
    textAlign: 'center',
    paddingHorizontal: 16,
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 16,
    marginBottom: 16,
  },
  filterRow: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginRight: 8,
    backgroundColor: '#FFFFFF',
  },
  filterChipActive: {
    backgroundColor: '#3B82F6',
    borderColor: '#3B82F6',
  },
  filterChipText: {
    fontSize: 13,
    color: '#4B5563',
    fontWeight: '500',
  },
  filterChipTextActive: {
    color: '#FFFFFF',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  patientName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
  },
  newBadge: {
    marginLeft: 8,
    backgroundColor: '#3B82F6',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  newBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '600',
  },
  time: {
    fontSize: 13,
    color: '#6B7280',
  },
  dateText: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 4,
  },
  testName: {
    fontSize: 14,
    color: '#4B5563',
    marginBottom: 8,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  appointmentId: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  statusColumn: {
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: '#E5E7EB',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  cancelledByText: {
    marginTop: 2,
    fontSize: 11,
    color: '#6B7280',
    fontWeight: '500',
    alignSelf: 'center',
    textAlign: 'center',
  },
  statusCompleted: {
    backgroundColor: '#6B7280',
  },
  statusPending: {
    backgroundColor: '#EAB308',
  },
  statusConfirmed: {
    backgroundColor: '#059669',
  },
  statusCancelled: {
    backgroundColor: '#DC2626',
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  acceptButton: {
    backgroundColor: '#16A34A',
  },
  rejectButton: {
    backgroundColor: '#DC2626',
  },
  actionText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  modalCard: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  modalBody: {
    marginTop: 4,
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  detailLabel: {
    fontSize: 13,
    color: '#6B7280',
  },
  detailValue: {
    fontSize: 13,
    color: '#111827',
    marginLeft: 12,
    flexShrink: 1,
    textAlign: 'right',
  },
  detailValueStrong: {
    fontWeight: '700',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
  modalButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 999,
  },
  modalConfirmButton: {
    backgroundColor: '#16A34A',
  },
  modalCancelButton: {
    backgroundColor: '#DC2626',
  },
  modalButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
});
