import React, { useState, useEffect } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, StatusBar, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import apiConfig, { API_ENDPOINTS } from '../../config/api';

const formatDisplayDate = (dateString) => {
  if (!dateString) return '';

  // Expecting 'YYYY-MM-DD'
  const [year, month, day] = dateString.split('-');
  if (!year || !month || !day) return dateString;

  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const monthIndex = parseInt(month, 10) - 1;
  const monthLabel = monthIndex >= 0 && monthIndex < 12 ? monthNames[monthIndex] : month;

  return `${parseInt(day, 10)} ${monthLabel} ${year}`;
};

export default function Payment() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { authToken } = useAuth();
  const { addNotification } = useNotifications();
  
  // Parse the booking data from params
  const bookingData = {
    selectedTest: params.selectedTest || '',
    selectedTests: (() => {
      if (typeof params.selectedTests === 'string') {
        try {
          const parsed = JSON.parse(params.selectedTests);
          if (Array.isArray(parsed)) return parsed;
        } catch {}
      }
      return [];
    })(),
    fullName: params.fullName || '',
    email: params.email || '',
    cnic: params.cnic || '',
    selectedGuardian: params.selectedGuardian || '',
    guardianName: params.guardianName || '',
    address: params.address || '',
    gender: params.gender || '',
    age: params.age || '',
    date: params.date || '',
    time: params.time || ''
  };

  const isReschedule = params.mode === 'reschedule';

  // If coming from a reschedule flow that already has an online payment,
  // we should not charge again. Instead, we just confirm the new booking
  // and mark payment as Online.
  const isRescheduleWithExistingPayment =
    params.mode === 'reschedule' && params.useExistingPayment === 'true';

  // Load tests and fees from backend so we always use up-to-date prices
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

  const testsArray =
    bookingData.selectedTests && Array.isArray(bookingData.selectedTests) && bookingData.selectedTests.length > 0
      ? bookingData.selectedTests
      : bookingData.selectedTest
      ? [bookingData.selectedTest]
      : [];

  const getTestFee = (name) => {
    const match = availableTests.find((t) => t && t.name === name);
    return match && typeof match.price === 'number' ? match.price : 0;
  };

  const testFee =
    testsArray.length > 0
      ? testsArray.reduce((sum, name) => sum + getTestFee(name), 0)
      : null;

  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('');

  const paymentMethods = [
    {
      id: 'card',
      title: 'Debit Card / Credit Card',
      icon: 'card-outline',
      description: 'Pay with your debit or credit card'
    },
    {
      id: 'mobile',
      title: 'Easypaisa / JazzCash',
      icon: 'phone-portrait-outline',
      description: 'Pay with mobile wallet'
    },
    {
      id: 'lab',
      title: 'Pay at Lab',
      icon: 'location-outline',
      description: 'Pay when you visit the lab'
    }
  ];

  const handlePayment = async () => {
    try {
      let paymentMethod = selectedPaymentMethod;
      let paymentLabelForPatient = 'Pending';
      let paymentLabelForAdmin = 'Pending';

      if (isRescheduleWithExistingPayment) {
        paymentMethod = paymentMethod || 'online';
        paymentLabelForPatient = 'Online';
        paymentLabelForAdmin = 'Online';
      } else {
        if (!selectedPaymentMethod) {
          alert('Please select a payment method');
          return;
        }

        if (selectedPaymentMethod === 'lab') {
          paymentLabelForPatient = 'Pay at Lab';
          paymentLabelForAdmin = 'Pay at Lab';
        } else {
          paymentLabelForPatient = 'Online';
          paymentLabelForAdmin = 'Online';
        }
      }

      // Call backend to create appointment (if logged in)
      try {
        if (authToken) {
          const payload = {
            selectedTest: testsArray.length > 0 ? testsArray.join(', ') : bookingData.selectedTest,
            fullName: bookingData.fullName,
            email: bookingData.email,
            cnic: bookingData.cnic,
            selectedGuardian: bookingData.selectedGuardian,
            guardianName: bookingData.guardianName,
            address: bookingData.address,
            gender: bookingData.gender,
            age: Number(bookingData.age),
            date: bookingData.date,
            time: bookingData.time,
            paymentMethod,
            paymentStatus: paymentLabelForAdmin,
            testFee,
            // Hint to backend that this booking is part of a reschedule
            isReschedule: !!isReschedule,
          };

          console.log('Payment -> APPOINTMENTS_CREATE payload:', JSON.stringify(payload));

          const response = await fetch(API_ENDPOINTS.APPOINTMENTS_CREATE, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${authToken}`,
            },
            body: JSON.stringify(payload),
          });

          const data = await response.json();

          if (!response.ok || !data.success) {
            // Specific handling for double-booked time slot
            if (data && data.code === 'TIME_SLOT_TAKEN') {
              alert(data.message || 'This date and time is already booked. Please choose another slot.');
              return; // stop further processing; do not navigate
            }

            console.warn('Backend appointment create failed:', data);
            alert(
              data && data.message
                ? data.message
                : 'Could not book your appointment right now. Please try again.'
            );
            return; // do not proceed to success alerts / navigation
          }

          // If this is a reschedule, cancel the original appointment after
          // the new booking is successfully created. We pass reschedule
          // metadata so backend can send a single combined admin notification
          // that includes both old and new times.
          if (isReschedule && params.originalAppointmentId) {
            try {
              const cancelResponse = await fetch(
                API_ENDPOINTS.APPOINTMENTS_PATIENT_CANCEL(params.originalAppointmentId),
                {
                  method: 'PATCH',
                  headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${authToken}`,
                  },
                  body: JSON.stringify({
                    isReschedule: true,
                    newDate: bookingData.date,
                    newTime: bookingData.time,
                  }),
                }
              );

              const cancelData = await cancelResponse.json();
              if (!cancelResponse.ok || !cancelData.success) {
                // Mirror TOO_LATE_TO_CANCEL handling used elsewhere
                if (cancelData && cancelData.code === 'TOO_LATE_TO_CANCEL') {
                  alert(
                    cancelData.message ||
                      'Appointments can only be cancelled or rescheduled at least 3 hours before the scheduled time.'
                  );
                } else {
                  console.warn('Failed to cancel original appointment during reschedule:', cancelData);
                }
              }
            } catch (cancelErr) {
              console.error('Error cancelling original appointment during reschedule:', cancelErr);
            }

            // Notifications for this reschedule are now handled centrally
            // by the backend cancellation / booking logic.
          }
        } else {
          console.warn('No auth token present; skipping backend appointment creation');
        }
      } catch (err) {
        console.error('Error calling appointments API:', err);
        alert('Could not reach the server. Please check your connection and try again.');
        return;
      }

      if (isRescheduleWithExistingPayment) {
        alert('Your appointment has been rescheduled using your existing payment.');
      } else if (selectedPaymentMethod === 'lab') {
        alert('Appointment booked! You can pay when you visit the lab.');
      } else {
        alert(`Processing payment via ${selectedPaymentMethod}...`);
      }

      // Navigate to Appointments; list will be loaded from backend
      router.push({
        pathname: '/appointments',
        params: {
          filter: 'Pending',
        },
      });
    } catch (error) {
      console.error('handlePayment error:', error);
      alert('Something went wrong while booking your appointment. Please try again.');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" translucent={false} />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Payment</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Booking Summary Section */}
        <View style={styles.summarySection}>
          <Text style={styles.sectionTitle}>Booking Summary</Text>
          
          <View style={styles.summaryCard}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Patient Name:</Text>
              <Text style={styles.summaryValue}>{bookingData.fullName}</Text>
            </View>
            
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Contact:</Text>
              <Text style={styles.summaryValue}>{bookingData.email}</Text>
            </View>

            {bookingData.address ? (
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Address:</Text>
                <Text style={styles.summaryValue}>{bookingData.address}</Text>
              </View>
            ) : null}
            
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>CNIC:</Text>
              <Text style={styles.summaryValue}>{bookingData.cnic}</Text>
            </View>
            
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Gender:</Text>
              <Text style={styles.summaryValue}>{bookingData.gender}</Text>
            </View>
            
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Age:</Text>
              <Text style={styles.summaryValue}>{bookingData.age} years</Text>
            </View>
            
            {bookingData.selectedGuardian && (
              <>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Guardian:</Text>
                  <Text style={styles.summaryValue}>{bookingData.selectedGuardian}</Text>
                </View>
                
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Guardian Name:</Text>
                  <Text style={styles.summaryValue}>{bookingData.guardianName}</Text>
                </View>
              </>
            )}
            

            {bookingData.date ? (
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Date:</Text>
                <Text style={styles.summaryValue}>{formatDisplayDate(bookingData.date)}</Text>
              </View>
            ) : null}

            {bookingData.time ? (
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Time:</Text>
                <Text style={styles.summaryValue}>{bookingData.time}</Text>
              </View>
            ) : null}
          </View>

          {/* Total Payment Card with per-test breakdown */}
          {testFee !== null && (
            <View style={styles.totalCard}>
              <View style={{ flex: 1 }}>
                {testsArray.map((name) => (
                  <View
                    key={name}
                    style={{
                      flexDirection: 'row',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: 4,
                    }}
                  >
                    <Text
                      style={{ fontSize: 13, color: '#4B5563', flex: 1 }}
                      numberOfLines={1}
                    >
                      {name}
                    </Text>
                    <Text
                      style={{ fontSize: 13, fontWeight: '600', color: '#111827', marginLeft: 8 }}
                    >
                      Rs. {getTestFee(name)}
                    </Text>
                  </View>
                ))}
              </View>
              <View
                style={{
                  marginTop: 4,
                  paddingTop: 4,
                  borderTopWidth: 1,
                  borderTopColor: '#BFDBFE',
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <Text style={styles.totalLabel}>Total Payment Fee</Text>
                <Text style={styles.totalValue}>Rs. {testFee}</Text>
              </View>
            </View>
          )}
        </View>

        {/* Payment Methods Section */}
        {!isRescheduleWithExistingPayment && (
          <View style={styles.paymentSection}>
            <Text style={styles.sectionTitle}>Payment Method</Text>
            
            {paymentMethods.map((method) => (
              <TouchableOpacity
                key={method.id}
                style={[
                  styles.paymentOption,
                  selectedPaymentMethod === method.id && styles.selectedPaymentOption
                ]}
                onPress={() => setSelectedPaymentMethod(method.id)}
              >
                <View style={styles.paymentOptionContent}>
                  <Ionicons 
                    name={method.icon} 
                    size={24} 
                    color={selectedPaymentMethod === method.id ? '#3B82F6' : '#6B7280'} 
                  />
                  <View style={styles.paymentOptionText}>
                    <Text style={[
                      styles.paymentOptionTitle,
                      selectedPaymentMethod === method.id && styles.selectedPaymentText
                    ]}>
                      {method.title}
                    </Text>
                    <Text style={styles.paymentOptionDescription}>
                      {method.description}
                    </Text>
                  </View>
                </View>
                <View style={[
                  styles.radioButton,
                  selectedPaymentMethod === method.id && styles.selectedRadioButton
                ]}>
                  {selectedPaymentMethod === method.id && (
                    <View style={styles.radioButtonInner} />
                  )}
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Payment Button */}
        <View style={styles.paymentButtonContainer}>
          <TouchableOpacity 
            style={[
              styles.paymentButton,
              !isRescheduleWithExistingPayment && !selectedPaymentMethod && styles.disabledPaymentButton
            ]}
            onPress={handlePayment}
            disabled={!isRescheduleWithExistingPayment && !selectedPaymentMethod}
          >
            <Text style={[
              styles.paymentButtonText,
              !isRescheduleWithExistingPayment && !selectedPaymentMethod && styles.disabledPaymentButtonText
            ]}>
              {isRescheduleWithExistingPayment ? 'Confirm Booking' : 'Make Payment'}
            </Text>
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
  backButton: {
    padding: 8,
    marginLeft: -8,
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
    paddingTop: 24,
  },
  summarySection: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 16,
  },
  summaryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  summaryLabel: {
    fontSize: 14,
    color: '#6B7280',
    flexShrink: 0,
    marginRight: 8,
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#111827',
    flex: 1,
    textAlign: 'right',
    flexWrap: 'wrap',
  },
  summaryValueFee: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
    flex: 2,
    textAlign: 'right',
  },
  totalCard: {
    marginTop: 16,
    backgroundColor: '#EFF6FF',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    flexDirection: 'column',
    alignItems: 'stretch',
    borderWidth: 1,
    borderColor: '#3B82F6',
  },
  totalLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1F2937',
  },
  totalValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1D4ED8',
  },
  paymentSection: {
    marginBottom: 32,
  },
  paymentOption: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    elevation: 1,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  selectedPaymentOption: {
    borderColor: '#3B82F6',
    backgroundColor: '#F0F9FF',
  },
  paymentOptionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  paymentOptionText: {
    flex: 1,
    marginLeft: 12,
  },
  paymentOptionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  selectedPaymentText: {
    color: '#3B82F6',
  },
  paymentOptionDescription: {
    fontSize: 14,
    color: '#6B7280',
  },
  radioButton: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedRadioButton: {
    borderColor: '#3B82F6',
  },
  radioButtonInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#3B82F6',
  },
  paymentButtonContainer: {
    marginBottom: 40,
  },
  paymentButton: {
    height: 56,
    backgroundColor: '#3B82F6',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#3B82F6',
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  disabledPaymentButton: {
    backgroundColor: '#D1D5DB',
    elevation: 0,
    shadowOpacity: 0,
  },
  paymentButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  disabledPaymentButtonText: {
    color: '#9CA3AF',
  },
});
