import React, { useState, useEffect } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, StatusBar, Platform, Modal, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import { API_ENDPOINTS } from '../../config/api';

// Helper to format dates as `day month year` for dialogs
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

// Helper to determine if an appointment is at least 3 hours in the future
const canModifyAppointment = (dateString, timeString, minHoursBefore = 3) => {
  if (!dateString || !timeString) return true;

  try {
    // dateString: 'YYYY-MM-DD', timeString example: '10:30 AM'
    const [yearStr, monthStr, dayStr] = String(dateString).split('-');
    const match = String(timeString).match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);

    if (!yearStr || !monthStr || !dayStr || !match) {
      return true; // fall back to allowing if format is unexpected
    }

    const year = Number(yearStr);
    const month = Number(monthStr) - 1; // JS month 0-11
    const day = Number(dayStr);

    let hours = Number(match[1]);
    const minutes = Number(match[2]);
    const ampm = match[3].toUpperCase();

    if (ampm === 'PM' && hours < 12) hours += 12;
    if (ampm === 'AM' && hours === 12) hours = 0;

    const appointmentDate = new Date(year, month, day, hours, minutes, 0, 0);
    if (Number.isNaN(appointmentDate.getTime())) return true;

    const now = new Date();
    const diffMs = appointmentDate.getTime() - now.getTime();
    const minMs = minHoursBefore * 60 * 60 * 1000;

    return diffMs >= minMs;
  } catch (e) {
    // If anything goes wrong, do not hard-block the user
    return true;
  }
};

export default function Appointments() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { authToken, isPatient } = useAuth();
  const { addNotification } = useNotifications();

  const [activeFilter, setActiveFilter] = useState('All');
  const [appointments, setAppointments] = useState([]);
  const [isMarkingAllRead, setIsMarkingAllRead] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState(null);

  // Calculate unread count
  const unreadCount = appointments.filter(appointment => appointment.isNew).length;

  // Handle filter parameter from navigation
  useEffect(() => {
    if (params.filter) {
      setActiveFilter(params.filter);
    }
  }, [params.filter]);

  // Load appointments from backend for the logged-in patient
  useEffect(() => {
    const fetchAppointments = async () => {
      try {
        if (!authToken || !isPatient()) {
          return;
        }

        const response = await fetch(API_ENDPOINTS.APPOINTMENTS_MINE, {
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        });

        const data = await response.json();

        if (!response.ok || !data.success) {
          console.warn('Failed to load appointments from backend:', data);
          return;
        }

        const mapped = (data.appointments || []).map(api => ({
          id: api._id,
          doctorName: api.patientName || 'Lab Appointment',
          status: api.status || 'Pending',
          date: api.date,
          time: api.time,
          specialty: api.testName,
          avatar: '🧪',
          // Highlight a specific appointment (e.g. when opened from a notification)
          isNew: params.highlightAppointmentId === api._id,
          contact: api.contact,
          cnic: api.cnic,
          gender: api.gender,
          age: api.age,
          guardian: api.guardian,
          guardianName: api.guardianName,
          address: api.address,
          testFee: api.testFee,
          payment: api.paymentStatus || 'Pending',
          cancelledBy: api.cancelledBy,
        }));

        setAppointments(mapped);
      } catch (err) {
        console.error('Error fetching appointments from backend:', err);
      }
    };

    fetchAppointments();
  }, [authToken, isPatient, params.highlightAppointmentId]);

  // No longer process local newAppointment param; appointments now come from backend

  // Function to mark appointment as viewed (remove NEW badge)
  const markAsViewed = (appointmentId) => {
    setAppointments(prevAppointments =>
      prevAppointments.map(appointment =>
        appointment.id === appointmentId
          ? { ...appointment, isNew: false }
          : appointment
      )
    );
  };

  const updateAppointmentStatusEverywhere = (appointmentId, newStatus, extra = {}) => {
    setAppointments(prevAppointments =>
      prevAppointments.map(appointment =>
        appointment.id === appointmentId
          ? { ...appointment, status: newStatus, ...extra }
          : appointment
      )
    );
  };

  const handleCancelSelectedAppointment = () => {
    if (!selectedAppointment) return;

    // Enforce: patient can only cancel at least 3 hours before scheduled time
    const canCancel = canModifyAppointment(selectedAppointment.date, selectedAppointment.time, 3);
    if (!canCancel) {
      Alert.alert(
        'Too late to cancel',
        'Appointments can only be cancelled at least 3 hours before the scheduled time.'
      );
      return;
    }

    Alert.alert(
      'Cancel appointment',
      'Are you sure you want to cancel this appointment?',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes, cancel',
          style: 'destructive',
          onPress: async () => {
            try {
              if (authToken && isPatient()) {
                const response = await fetch(
                  API_ENDPOINTS.APPOINTMENTS_PATIENT_CANCEL(selectedAppointment.id),
                  {
                    method: 'PATCH',
                    headers: {
                      Authorization: `Bearer ${authToken}`,
                    },
                  }
                );

                const data = await response.json();
                if (!response.ok || !data.success) {
                  if (data && data.code === 'TOO_LATE_TO_CANCEL') {
                    Alert.alert('Too late to cancel', data.message || 'Appointments can only be cancelled at least 3 hours before the scheduled time.');
                  } else {
                    console.warn('Failed to cancel appointment in backend:', data);
                  }
                }
              }
            } catch (err) {
              console.error('Error cancelling appointment in backend:', err);
            }

            updateAppointmentStatusEverywhere(selectedAppointment.id, 'Cancelled', {
              cancelledBy: 'patient',
            });

            // Inform patient that they are free to book a new slot
            Alert.alert(
              'Appointment cancelled',
              'Your appointment has been cancelled. You can book a new slot any time.',
              [
                {
                  text: 'OK',
                  onPress: () => {
                    setShowDetailModal(false);
                    setSelectedAppointment(null);
                  },
                },
              ],
            );
          },
        },
      ],
    );
  };

  const handleRescheduleSelectedAppointment = () => {
    if (!selectedAppointment) return;

    // Enforce the same 3-hour rule for rescheduling (which cancels first)
    const canReschedule = canModifyAppointment(selectedAppointment.date, selectedAppointment.time, 3);
    if (!canReschedule) {
      Alert.alert(
        'Too late to reschedule',
        'Appointments can only be rescheduled at least 3 hours before the scheduled time.'
      );
      return;
    }

    Alert.alert(
      'Reschedule appointment',
      'After you successfully book a new time, the current appointment will be cancelled automatically.',
      [
        { text: 'Keep appointment', style: 'cancel' },
        {
          text: 'Reschedule',
          onPress: () => {
            // Close the detail modal and navigate to booking so patient can pick a new slot
            setShowDetailModal(false);
            setSelectedAppointment(null);

            // Split the stored test name string into an array so Payment can
            // re-fetch each test's fee from the latest /api/tests data.
            const rawTestName = selectedAppointment.specialty || '';
            const testsArray = rawTestName
              ? String(rawTestName)
                  .split(',')
                  .map((s) => s.trim())
                  .filter(Boolean)
              : [];

            router.push({
              pathname: '/bookappointment',
              params: {
                mode: 'reschedule',
                originalAppointmentId: selectedAppointment.id,
                // Keep original single string for backward compatibility
                selectedTest: rawTestName,
                // New: pass structured list for Payment fee calculation
                selectedTests: testsArray.length ? JSON.stringify(testsArray) : '',
                fullName: selectedAppointment.doctorName || '',
                email: selectedAppointment.contact || '',
                cnic: selectedAppointment.cnic || '',
                selectedGuardian: selectedAppointment.guardian || '',
                guardianName: selectedAppointment.guardianName || '',
                gender: selectedAppointment.gender || '',
                age: selectedAppointment.age ? String(selectedAppointment.age) : '',
                address: selectedAppointment.address || '',
                useExistingPayment: selectedAppointment.payment === 'Online' ? 'true' : 'false',
              },
            });
          },
        },
      ],
    );
  };

  // Function to mark all appointments as read
  const markAllAsRead = () => {
    setTimeout(() => {
      setAppointments(prevAppointments => 
        prevAppointments.map(appointment => ({ 
          ...appointment, 
          isNew: false 
        }))
      );
    }, 50);
  };

  // Filter appointments based on active filter
  const getFilteredAppointments = () => {
    const currentDate = new Date();
    
    switch (activeFilter) {
      case 'Upcoming':
        return appointments.filter(appointment => appointment.status === 'Confirmed');
      case 'Pending':
        return appointments.filter(appointment => appointment.status === 'Pending');
      case 'Completed':
        return appointments.filter(appointment => appointment.status === 'Completed');
      case 'Cancelled':
        return appointments.filter(appointment => appointment.status === 'Cancelled');
      case 'All':
      default:
        return appointments;
    }
  };

  const filteredAppointments = getFilteredAppointments();

  const getEmptyStateTexts = () => {
    switch (activeFilter) {
      case 'Upcoming':
        return {
          title: 'No upcoming appointments',
          subtitle: 'When you book a new test, it will appear here.',
        };
      case 'Pending':
        return {
          title: 'No pending appointments',
          subtitle: 'You have no appointments waiting for confirmation.',
        };
      case 'Completed':
        return {
          title: 'No completed appointments',
          subtitle: 'Completed appointments will be listed in this tab.',
        };
      case 'Cancelled':
        return {
          title: 'No cancelled appointments',
          subtitle: 'Cancelled appointments will be shown here for your record.',
        };
      case 'All':
      default:
        return {
          title: 'No appointments yet',
          subtitle: 'Book your first lab test to see it here.',
        };
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>Appointments</Text>
          {unreadCount > 0 && (
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadBadgeText}>{unreadCount}</Text>
            </View>
          )}
        </View>
        <TouchableOpacity 
          style={styles.markAllButton}
          onPress={async () => {
            if (unreadCount > 0 && !isMarkingAllRead) {
              setIsMarkingAllRead(true);
              markAllAsRead();
              setTimeout(() => {
                setIsMarkingAllRead(false);
              }, 200);
            }
          }}
          disabled={unreadCount === 0 || isMarkingAllRead}
        >
          <Ionicons 
            name="checkmark-done" 
            size={20} 
            color={unreadCount > 0 && !isMarkingAllRead ? "#3B82F6" : "#6B7280"} 
          />
        </TouchableOpacity>
      </View>

      {/* Filter Buttons */}
      <View style={styles.filterContainer}>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false} 
          style={styles.filterScrollView}
          contentContainerStyle={styles.filterScrollContent}
        >
          {['All', 'Upcoming', 'Pending', 'Completed', 'Cancelled'].map((filter) => (
            <TouchableOpacity
              key={filter}
              style={[
                styles.filterButton,
                activeFilter === filter && styles.activeFilterButton
              ]}
              onPress={() => setActiveFilter(filter)}
            >
              <Text style={[
                styles.filterText,
                activeFilter === filter && styles.activeFilterText
              ]}>
                {filter}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {filteredAppointments.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIconWrapper}>
              <Ionicons name="calendar-outline" size={40} color="#9CA3AF" />
            </View>
            <Text style={styles.emptyStateTitle}>{getEmptyStateTexts().title}</Text>
            <Text style={styles.emptyStateText}>{getEmptyStateTexts().subtitle}</Text>
          </View>
        ) : (
          filteredAppointments.map((appointment) => (
          <TouchableOpacity 
            key={`appointment-${appointment.id}-${appointment.isNew}`}
            style={[
              styles.appointmentCard,
              appointment.isNew && styles.newAppointmentCard,
            ]}
            activeOpacity={0.7}
            onPress={() => {
              if (appointment.isNew) {
                setTimeout(() => {
                  markAsViewed(appointment.id);
                }, 50);
              }
              setSelectedAppointment(appointment);
              setShowDetailModal(true);
            }}
          >
            <View style={styles.appointmentInfo}>
              <View style={styles.appointmentHeader}>
                <Text style={styles.doctorName}>{appointment.doctorName}</Text>
                {appointment.isNew && (
                  <View style={styles.newBadge}>
                    <Text style={styles.newBadgeText}>NEW</Text>
                  </View>
                )}
              </View>
              <Text style={styles.appointmentDateTime}>
                {appointment.date}, {appointment.time}
              </Text>
              <Text style={styles.specialty}>
                {appointment.specialty}{appointment.type ? ` : ${appointment.type}` : ''}
              </Text>
            </View>
            <View style={styles.statusColumn}>
              <View
                style={[
                  styles.statusIndicator,
                  appointment.status === 'Confirmed'
                    ? styles.confirmedIndicator
                    : appointment.status === 'Pending'
                    ? styles.pendingIndicator
                    : appointment.status === 'Completed'
                    ? styles.completedIndicator
                    : styles.cancelledIndicator,
                ]}
              >
                <Text style={styles.statusText}>{appointment.status}</Text>
              </View>
              {appointment.status === 'Cancelled' && appointment.cancelledBy === 'patient' && (
                <Text style={styles.cancelledByText}>by You</Text>
              )}
            </View>
          </TouchableOpacity>
        )))}
      </ScrollView>

      {/* Appointment Detail Modal (same style as AdminViewAppointments) */}
      <Modal
        visible={showDetailModal && !!selectedAppointment}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setShowDetailModal(false);
          setSelectedAppointment(null);
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Appointment Detail</Text>
              <TouchableOpacity
                onPress={() => {
                  setShowDetailModal(false);
                  setSelectedAppointment(null);
                }}
              >
                <Ionicons name="close" size={22} color="#6B7280" />
              </TouchableOpacity>
            </View>

            {selectedAppointment && (
              <View style={styles.modalBody}>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Lab Test</Text>
                  <Text style={[styles.detailValue, styles.detailValueStrong]}>
                    {selectedAppointment.specialty}
                  </Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Patient Name</Text>
                  <Text style={styles.detailValue}>{selectedAppointment.doctorName}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Email/Phone</Text>
                  <Text style={styles.detailValue}>{selectedAppointment.contact || '-'}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Gender</Text>
                  <Text style={styles.detailValue}>{selectedAppointment.gender || '-'}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Age</Text>
                  <Text style={styles.detailValue}>{selectedAppointment.age || '-'}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>CNIC</Text>
                  <Text style={styles.detailValue}>{selectedAppointment.cnic || '-'}</Text>
                </View>
                {selectedAppointment.address ? (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Address</Text>
                    <Text style={styles.detailValue}>{selectedAppointment.address}</Text>
                  </View>
                ) : null}
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Guardian</Text>
                  <Text style={styles.detailValue}>{selectedAppointment.guardian || '-'}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Guardian Name</Text>
                  <Text style={styles.detailValue}>{selectedAppointment.guardianName || '-'}</Text>
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
                  <Text style={styles.detailLabel}>Test Fee</Text>
                  <Text style={[styles.detailValue, styles.detailValueStrong]}>
                    {selectedAppointment.testFee != null ? `Rs. ${selectedAppointment.testFee}` : '-'}
                  </Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Payment</Text>
                  <Text style={styles.detailValue}>{selectedAppointment.payment || '-'}</Text>
                </View>
              </View>
            )}

            {selectedAppointment && (
              <View style={styles.modalStatusWrapper}>
                <View
                  style={[
                    styles.modalStatusChip,
                    selectedAppointment.status === 'Confirmed'
                      ? styles.statusConfirmedChip
                      : selectedAppointment.status === 'Pending'
                      ? styles.statusPendingChip
                      : selectedAppointment.status === 'Completed'
                      ? styles.statusCompletedChip
                      : styles.statusCancelledChip,
                  ]}
                >
                  <Text style={styles.modalStatusText}>{selectedAppointment.status}</Text>
                </View>
              </View>
            )}

            {selectedAppointment && selectedAppointment.status === 'Pending' && (
              <View style={styles.modalActionsRow}>
                <TouchableOpacity
                  style={styles.modalCancelButton}
                  onPress={handleCancelSelectedAppointment}
                >
                  <Text style={styles.modalCancelButtonText}>Cancel Appointment</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.modalRescheduleButton}
                  onPress={handleRescheduleSelectedAppointment}
                >
                  <Text style={styles.modalRescheduleButtonText}>Reschedule</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </Modal>

      {/* Bottom Navigation */}
      <View style={styles.bottomNav}>
        <TouchableOpacity 
          style={styles.navItem}
          onPress={() => router.push('/home')}
        >
          <Ionicons name="home-outline" size={24} color="#6B7280" style={styles.navIcon} />
          <Text style={styles.navLabel}>Home</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.navItem, styles.activeNavItem]}>
          <Ionicons name="calendar" size={24} color="#3B82F6" style={styles.navIcon} />
          <Text style={[styles.navLabel, styles.activeNavLabel]}>Appointments</Text>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
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
  headerTitleContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
  },
  unreadBadge: {
    backgroundColor: '#DC2626',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  unreadBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  markAllButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterContainer: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  filterScrollView: {
    paddingLeft: 20,
  },
  filterScrollContent: {
    paddingRight: 20,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 12,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  activeFilterButton: {
    backgroundColor: '#3B82F6',
    borderColor: '#3B82F6',
  },
  filterText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
  },
  activeFilterText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  emptyState: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyIconWrapper: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  emptyStateTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
    textAlign: 'center',
  },
  emptyStateText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    paddingHorizontal: 8,
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
    borderWidth: 1,
    borderColor: '#F3F4F6',
    overflow: 'hidden',
  },
  appointmentInfo: {
    flex: 1,
  },
  appointmentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  doctorName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    flex: 1,
  },
  newBadge: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    marginLeft: 8,
  },
  newBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '600',
  },
  newAppointmentCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#3B82F6',
    backgroundColor: '#F0F9FF',
  },
  appointmentDateTime: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 4,
  },
  specialty: {
    fontSize: 14,
    color: '#6B7280',
  },
  statusColumn: {
    alignItems: 'flex-end',
    justifyContent: 'center',
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
  completedIndicator: {
    backgroundColor: '#6B7280',
  },
  cancelledIndicator: {
    backgroundColor: '#DC2626',
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
  modalStatusWrapper: {
    alignItems: 'center',
  },
  modalStatusChip: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: '#E5E7EB',
  },
  modalStatusText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  statusConfirmedChip: {
    backgroundColor: '#16A34A',
  },
  statusPendingChip: {
    backgroundColor: '#EAB308',
  },
  statusCompletedChip: {
    backgroundColor: '#6B7280',
  },
  statusCancelledChip: {
    backgroundColor: '#DC2626',
  },
  modalActionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  modalCancelButton: {
    flex: 1,
    marginRight: 8,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#DC2626',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCancelButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#DC2626',
  },
  modalRescheduleButton: {
    flex: 1,
    marginLeft: 8,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: '#3B82F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalRescheduleButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  bottomNav: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 12,
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
});
