import React, { useState, useRef, useEffect, useMemo } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  StatusBar,
  Platform,
  KeyboardAvoidingView,
  Pressable,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import apiConfig, { API_ENDPOINTS } from '../../config/api';
import { useRouter, useLocalSearchParams } from 'expo-router';
import DateTimePicker from '@react-native-community/datetimepicker';
// Removed address/current location functionality

export default function BookAppointment() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const scrollViewRef = useRef(null);
  const hasAppliedReschedulePrefill = useRef(false);

  const [formData, setFormData] = useState({
    selectedTests: [],
    fullName: '',
    email: '',
    cnic: '',
    selectedGuardian: '',
    guardianName: '',
    address: '',
    gender: '',
    age: '',
    date: '',
    time: '',
  });

  // If opened from a reschedule flow, pre-fill form fields from params (except date/time)
  useEffect(() => {
    if (hasAppliedReschedulePrefill.current) return;
    if (params?.mode === 'reschedule') {
      hasAppliedReschedulePrefill.current = true;
      setFormData(prev => ({
        ...prev,
        selectedTests: (() => {
          if (typeof params.selectedTests === 'string') {
            try {
              const parsed = JSON.parse(params.selectedTests);
              if (Array.isArray(parsed)) return parsed;
            } catch {}
          }
          if (typeof params.selectedTest === 'string' && params.selectedTest) {
            return [params.selectedTest];
          }
          return prev.selectedTests;
        })(),
        fullName: typeof params.fullName === 'string' ? params.fullName : prev.fullName,
        email: typeof params.email === 'string' ? params.email : prev.email,
        cnic: typeof params.cnic === 'string' ? params.cnic : prev.cnic,
        selectedGuardian: typeof params.selectedGuardian === 'string' ? params.selectedGuardian : prev.selectedGuardian,
        guardianName: typeof params.guardianName === 'string' ? params.guardianName : prev.guardianName,
        address: typeof params.address === 'string' ? params.address : prev.address,
        gender: typeof params.gender === 'string' ? params.gender : prev.gender,
        age: typeof params.age === 'string' ? params.age : prev.age,
      }));
    }
  }, [params.mode]);

  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [tempDate, setTempDate] = useState(new Date());
  const [tempTime, setTempTime] = useState(new Date());

  const [showTestPicker, setShowTestPicker] = useState(false);
  const [availableTests, setAvailableTests] = useState([]);
  const [showGuardianPicker, setShowGuardianPicker] = useState(false);
  const [showGenderPicker, setShowGenderPicker] = useState(false);

  const minSelectableDate = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    // Allow booking for today; only prevent selecting true past dates
    return d;
  }, []);

  // Android custom time picker state (hours 1-12, minutes 00/20/40, AM/PM)
  const [androidTimeHour, setAndroidTimeHour] = useState(9);
  const [androidTimeMinute, setAndroidTimeMinute] = useState('00');
  const [androidTimePeriod, setAndroidTimePeriod] = useState('AM');

  const [testsLoading, setTestsLoading] = useState(false);

  const testOptions = availableTests.map((t) => t.name);

  const getTestFee = (name) => {
    const match = availableTests.find((t) => t.name === name);
    return match && typeof match.price === 'number' ? match.price : null;
  };

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

  const guardianOptions = ['S/O', 'D/O', 'W/O'];

  const toggleSelectedTest = (testName) => {
    setFormData(prev => {
      const current = Array.isArray(prev.selectedTests) ? prev.selectedTests : [];
      if (current.includes(testName)) {
        return { ...prev, selectedTests: current.filter(t => t !== testName) };
      }
      return { ...prev, selectedTests: [...current, testName] };
    });
  };
  const genderOptions = ['Male', 'Female', 'Other'];

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleInputFocus = (yOffset) => {
    setTimeout(() => {
      scrollViewRef.current?.scrollTo({ y: yOffset, animated: true });
    }, 150);
  };

  const handleBookAppointment = () => {
    // Basic field-level validation

    if (!formData.selectedTests || formData.selectedTests.length === 0) {
      alert('Please select at least one test');
      return;
    }

    const name = formData.fullName.trim();
    if (!name || name.length < 3) {
      alert('Please enter a valid full name (at least 3 characters)');
      return;
    }

    const phone = formData.email.trim();
    if (!phone) {
      alert('Please enter phone number');
      return;
    }

    // Pakistan mobile numbers: 03XXXXXXXXX or +923XXXXXXXXX
    const pkMobileRegex = /^(?:\+92|0)?3[0-9]{9}$/;
    if (!pkMobileRegex.test(phone)) {
      alert('Please enter a valid mobile number');
      return;
    }

    const cnic = formData.cnic.trim();
    const cnicDigitsOnly = cnic.replace(/[^0-9]/g, '');
    if (cnicDigitsOnly.length !== 13) {
      alert('Please enter a 13-digit CNIC without dashes');
      return;
    }

    if (!formData.gender) {
      alert('Please select gender');
      return;
    }

    if (!formData.age) {
      alert('Please enter age');
      return;
    }
    const ageNumber = parseInt(formData.age, 10);
    if (Number.isNaN(ageNumber) || ageNumber <= 0 || ageNumber > 120) {
      alert('Please enter a valid age between 1-120');
      return;
    }

    if (!formData.date) {
      alert('Please select a date');
      return;
    }

    if (!formData.time) {
      alert('Please select a time');
      return;
    }

    if (formData.selectedGuardian && !formData.guardianName.trim()) {
      alert('Please enter Guardian Name');
      return;
    }

    // Build payload to store full appointment in backend
    const selectedTestsArray = Array.isArray(formData.selectedTests) ? formData.selectedTests : [];
    const primaryTestName = selectedTestsArray[0] || '';
    const totalFee = selectedTestsArray.reduce((sum, name) => {
      const fee = getTestFee(name);
      return sum + (typeof fee === 'number' ? fee : 0);
    }, 0);

    // Navigate to payment screen with form data (no backend appointment creation)
    router.push({
      pathname: '/payment',
      params: {
        selectedTests: JSON.stringify(formData.selectedTests || []),
        fullName: formData.fullName,
        email: formData.email,
        cnic: formData.cnic,
        selectedGuardian: formData.selectedGuardian,
        guardianName: formData.guardianName,
        address: formData.address,
        gender: formData.gender,
        age: formData.age,
        date: formData.date,
        time: formData.time,
        // Forward reschedule/payment context if present so Payment can reuse existing payment
        mode: params.mode || '',
        useExistingPayment: params.useExistingPayment || '',
        originalAppointmentId: params.originalAppointmentId || '',
      },
    });
  };

  const closePickers = () => {
    setShowTestPicker(false);
    setShowGuardianPicker(false);
    setShowGenderPicker(false);
  };

  const handleDateChange = (event, selectedDate) => {
    if (event.type === 'dismissed') {
      setShowDatePicker(false);
      return;
    }

    let currentDate = selectedDate || tempDate;

    // Clamp to minimum selectable date (today) so users cannot pick past dates
    if (currentDate < minSelectableDate) {
      currentDate = minSelectableDate;
    }
    setTempDate(currentDate);

    const year = currentDate.getFullYear();
    const month = String(currentDate.getMonth() + 1).padStart(2, '0');
    const day = String(currentDate.getDate()).padStart(2, '0');
    const formatted = `${year}-${month}-${day}`;
    handleInputChange('date', formatted);

    // On Android, close after selection; on iOS, keep modal open until user taps Done/outside
    if (Platform.OS !== 'ios') {
      setShowDatePicker(false);
    }
  };

  const handleTimeChange = (event, selectedTime) => {
    if (event.type === 'dismissed') {
      setShowTimePicker(false);
      return;
    }

    const currentTime = selectedTime || tempTime;

    // Snap minutes to 20-minute intervals: 00, 20, 40
    const rawMinutes = currentTime.getMinutes();
    const snappedMinutes = Math.floor(rawMinutes / 20) * 20; // 0-19 -> 0, 20-39 -> 20, 40-59 -> 40
    currentTime.setMinutes(snappedMinutes, 0, 0);

    setTempTime(currentTime);

    let hours = currentTime.getHours();
    const minutes = String(currentTime.getMinutes()).padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    if (hours === 0) hours = 12;
    const formatted = `${hours}:${minutes} ${ampm}`;
    handleInputChange('time', formatted);

    // On Android, close after selection; on iOS, keep modal open until user taps Done/outside
    if (Platform.OS !== 'ios') {
      setShowTimePicker(false);
    }
  };

  const hourOptions = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
  const minuteOptions = ['00', '20', '40'];
  const periodOptions = ['AM', 'PM'];

  const handleAndroidTimeConfirm = () => {
    const formatted = `${androidTimeHour}:${androidTimeMinute} ${androidTimePeriod}`;
    handleInputChange('time', formatted);
    setShowTimePicker(false);
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" translucent={false} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Patient Details</Text>
        <View style={styles.placeholder} />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <Pressable style={{ flex: 1 }} onPress={closePickers}>
          <ScrollView
            ref={scrollViewRef}
            style={styles.content}
            showsVerticalScrollIndicator={false}
            scrollEnabled={!showTestPicker && !showGuardianPicker && !showGenderPicker}
            keyboardShouldPersistTaps="handled"
          >
            <Text style={styles.sectionTitle}>Book appointment at your ease.</Text>
            {/* === CHOOSE TESTS DROPDOWN (SCROLLABLE - 5 ITEMS, MULTI-SELECT) === */}
            <View style={[styles.field, styles.dropdownContainer]}>
              <Text style={styles.fieldLabel}>Select Tests</Text>
              <TouchableOpacity
                style={styles.dropdown}
                onPress={() => setShowTestPicker(!showTestPicker)}
              >
                <Text
                  style={[
                    styles.dropdownText,
                    (!formData.selectedTests || formData.selectedTests.length === 0) && styles.placeholderText,
                  ]}
                >
                  {formData.selectedTests && formData.selectedTests.length > 0
                    ? 'Tests selected'
                    : 'Choose Tests'}
                </Text>
                <Ionicons name="chevron-down" size={20} color="#6B7280" />
              </TouchableOpacity>
              {/* Show each selected test with its fee below the input, with a cancel icon */}
              {formData.selectedTests && formData.selectedTests.length > 0 && (
                <View style={{ marginTop: 8, gap: 6 }}>
                  {formData.selectedTests.map((name) => (
                    <View
                      key={name}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        alignSelf: 'flex-start',
                        gap: 6,
                      }}
                    >
                      <Text style={styles.selectedTestInfo}>
                        {name}
                        {getTestFee(name) != null ? ` - Rs. ${getTestFee(name)}` : ''}
                      </Text>
                      <TouchableOpacity
                        onPress={() => toggleSelectedTest(name)}
                        style={{
                          width: 22,
                          height: 22,
                          borderRadius: 11,
                          backgroundColor: '#FCA5A5',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Ionicons name="close" size={14} color="#7F1D1D" />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              )}

              {Platform.OS === 'ios' && showTestPicker && (
                <View style={styles.pickerDropdown}>
                  <ScrollView
                    showsVerticalScrollIndicator={true}
                    persistentScrollbar={true}
                    indicatorStyle="black"
                    nestedScrollEnabled={true}
                    keyboardShouldPersistTaps="handled"
                    style={styles.pickerScrollView}
                  >
                    {testOptions.map((item, index) => {
                      const isSelected =
                        Array.isArray(formData.selectedTests) &&
                        formData.selectedTests.includes(item);
                      return (
                        <TouchableOpacity
                          key={item}
                          style={[
                            styles.pickerOption,
                            index === 0 && styles.firstOption,
                            index === testOptions.length - 1 && styles.lastOption,
                            isSelected && { backgroundColor: '#DBEAFE' },
                          ]}
                          onPress={() => {
                            toggleSelectedTest(item);
                            setShowTestPicker(false);
                          }}
                        >
                          <Text style={styles.pickerOptionText}>
                            {isSelected ? `✓ ${item}` : item}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                </View>
              )}
            </View>

            {/* Full Name */}
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Full Name</Text>
              <TextInput
                style={styles.input}
                placeholder="Full Name"
                placeholderTextColor="#9CA3AF"
                value={formData.fullName}
                onChangeText={text => handleInputChange('fullName', text)}
                onFocus={() => handleInputFocus(100)}
                autoCapitalize="words"
              />
            </View>

            {/* Phone */}
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Phone</Text>
              <TextInput
                style={styles.input}
                placeholder="Phone"
                placeholderTextColor="#9CA3AF"
                value={formData.email}
                onChangeText={text => {
                  // If number starts with 03, enforce max 11 digits (03XXXXXXXXX)
                  const digitsOnly = text.replace(/[^0-9]/g, '');
                  if (digitsOnly.startsWith('03') && digitsOnly.length > 11) {
                    const limited = digitsOnly.slice(0, 11);
                    handleInputChange('email', limited);
                  } else {
                    handleInputChange('email', text);
                  }
                }}
                onFocus={() => handleInputFocus(160)}
                keyboardType="number-pad"
                autoCapitalize="none"
              />
            </View>

            {/* CNIC */}
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>CNIC</Text>
              <TextInput
                style={styles.input}
                placeholder="CNIC (13 digits, no dashes)"
                placeholderTextColor="#9CA3AF"
                value={formData.cnic}
                onChangeText={(text) => {
                  const digitsOnly = text.replace(/[^0-9]/g, '').slice(0, 13);
                  handleInputChange('cnic', digitsOnly);
                }}
                onFocus={() => handleInputFocus(220)}
                keyboardType="numeric"
                maxLength={13}
              />
            </View>

            {/* Guardian Relation */}
            <View style={[styles.field, styles.dropdownContainer, styles.guardianDropdownContainer]}>
              <Text style={styles.fieldLabel}>Guardian Relation</Text>
              <TouchableOpacity
                style={styles.dropdown}
                onPress={() => setShowGuardianPicker(!showGuardianPicker)}
              >
                <Text style={[styles.dropdownText, !formData.selectedGuardian && styles.placeholderText]}>
                  {formData.selectedGuardian || 'Select Guardian'}
                </Text>
                <Ionicons name="chevron-down" size={20} color="#6B7280" />
              </TouchableOpacity>

              {Platform.OS === 'ios' && showGuardianPicker && (
                <View style={styles.pickerDropdown}>
                  <ScrollView
                    showsVerticalScrollIndicator={true}
                    persistentScrollbar={true}
                    indicatorStyle="black"
                    nestedScrollEnabled={true}
                    keyboardShouldPersistTaps="handled"
                    style={styles.pickerScrollView}
                  >
                    {guardianOptions.map(item => (
                      <TouchableOpacity
                        key={item}
                        style={styles.pickerOption}
                        onPress={() => {
                          handleInputChange('selectedGuardian', item);
                          setShowGuardianPicker(false);
                        }}
                      >
                        <Text style={styles.pickerOptionText}>{item}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}
            </View>

            {/* Guardian Name */}
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Guardian Name</Text>
              <TextInput
                style={styles.input}
                placeholder="Guardian Name"
                placeholderTextColor="#9CA3AF"
                value={formData.guardianName}
                onChangeText={text => handleInputChange('guardianName', text)}
                onFocus={() => handleInputFocus(340)}
                autoCapitalize="words"
              />
            </View>

            {/* Address */}
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Address</Text>
              <TextInput
                style={[styles.input, styles.addressInput]}
                placeholder="Address"
                placeholderTextColor="#9CA3AF"
                value={formData.address}
                onChangeText={text => handleInputChange('address', text)}
                onFocus={() => handleInputFocus(360)}
                autoCapitalize="sentences"
                multiline
                numberOfLines={3}
              />
            </View>

            {/* Gender & Age */}
            <View style={styles.rowFields}>
              <View style={[styles.field, styles.halfField, styles.dropdownContainer, styles.genderDropdownContainer]}>
                <Text style={styles.fieldLabel}>Gender</Text>
                <TouchableOpacity
                  style={styles.dropdown}
                  onPress={() => setShowGenderPicker(!showGenderPicker)}
                >
                  <Text style={[styles.dropdownText, !formData.gender && styles.placeholderText]}>
                    {formData.gender || 'Gender'}
                  </Text>
                  <Ionicons name="chevron-down" size={20} color="#6B7280" />
                </TouchableOpacity>

                {showGenderPicker && (
                  <View style={styles.genderPickerDropdown}>
                    {genderOptions.map((item) => (
                      <TouchableOpacity
                        key={item}
                        style={styles.genderPickerOption}
                        onPress={() => {
                          handleInputChange('gender', item);
                          setShowGenderPicker(false);
                        }}
                      >
                        <Text style={styles.genderPickerOptionText}>{item}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>
              <View style={[styles.field, styles.halfField]}>
                <Text style={styles.fieldLabel}>Age</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Age"
                  placeholderTextColor="#9CA3AF"
                  value={formData.age}
                  onChangeText={text => handleInputChange('age', text)}
                  onFocus={() => handleInputFocus(400)}
                  keyboardType="numeric"
                  maxLength={3}
                />
              </View>
            </View>

            {/* Date & Time */}
            <View style={styles.rowFields}>
              <View style={[styles.field, styles.halfField]}>
                <Text style={styles.fieldLabel}>Date</Text>
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => {
                    closePickers();
                    setShowDatePicker(true);
                  }}
                >
                  <View style={[styles.input, styles.inputWithIconRow]}>
                    <Text
                      style={[
                        styles.inputText,
                        !formData.date && styles.placeholderText,
                      ]}
                    >
                      {formData.date || 'Select date'}
                    </Text>
                    <Ionicons name="calendar-outline" size={20} color="#6B7280" />
                  </View>
                </TouchableOpacity>
              </View>
              <View style={[styles.field, styles.halfField]}>
                <Text style={styles.fieldLabel}>Time</Text>
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => {
                    closePickers();
                    setShowTimePicker(true);
                  }}
                >
                  <View style={[styles.input, styles.inputWithIconRow]}>
                    <Text
                      style={[
                        styles.inputText,
                        !formData.time && styles.placeholderText,
                      ]}
                    >
                      {formData.time || 'Select Time'}
                    </Text>
                    <Ionicons name="time-outline" size={20} color="#6B7280" />
                  </View>
                </TouchableOpacity>
              </View>
            </View>

            {/* Action Buttons */}
            <View style={styles.actionButtons}>
              <TouchableOpacity style={styles.cancelButton} onPress={() => router.back()}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.bookButton} onPress={handleBookAppointment}>
                <Text style={styles.bookButtonText}>Book Appointment</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </Pressable>
      </KeyboardAvoidingView>

      {/* ANDROID date picker (inline) */}
      {Platform.OS !== 'ios' && showDatePicker && (
        <DateTimePicker
          value={tempDate}
          mode="date"
          minimumDate={minSelectableDate}
          display="default"
          onChange={handleDateChange}
        />
      )}

      {/* ANDROID custom time picker modal (hours 1-12, minutes 00/20/40, AM/PM) */}
      {Platform.OS !== 'ios' && showTimePicker && (
        <Modal
          visible={showTimePicker}
          transparent
          animationType="fade"
          onRequestClose={() => setShowTimePicker(false)}
        >
          <Pressable
            style={styles.androidTimeModalOverlay}
            onPress={() => setShowTimePicker(false)}
          >
            <Pressable style={styles.androidTimeModalCard}>
              <Text style={styles.androidTimeTitle}>Select Time</Text>
              <Text style={styles.androidTimeSubtitle}>Choose a 20-minute slot</Text>

              <View style={styles.androidTimePickerRow}>
                <View style={styles.androidTimeColumn}>
                  <Text style={styles.androidTimeColumnLabel}>Hour</Text>
                  <ScrollView
                    showsVerticalScrollIndicator={false}
                    style={styles.androidTimeScroll}
                    contentContainerStyle={styles.androidTimeScrollContent}
                  >
                    {hourOptions.map((h) => (
                      <TouchableOpacity
                        key={`hour-${h}`}
                        style={[
                          styles.androidTimeOption,
                          androidTimeHour === h && styles.androidTimeOptionSelected,
                        ]}
                        onPress={() => setAndroidTimeHour(h)}
                      >
                        <Text
                          style={[
                            styles.androidTimeOptionText,
                            androidTimeHour === h && styles.androidTimeOptionTextSelected,
                          ]}
                        >
                          {h}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>

                <View style={styles.androidTimeColumn}>
                  <Text style={styles.androidTimeColumnLabel}>Minutes</Text>
                  <ScrollView
                    showsVerticalScrollIndicator={false}
                    style={styles.androidTimeScroll}
                    contentContainerStyle={styles.androidTimeScrollContent}
                  >
                    {minuteOptions.map((m) => (
                      <TouchableOpacity
                        key={`minute-${m}`}
                        style={[
                          styles.androidTimeOption,
                          androidTimeMinute === m && styles.androidTimeOptionSelected,
                        ]}
                        onPress={() => setAndroidTimeMinute(m)}
                      >
                        <Text
                          style={[
                            styles.androidTimeOptionText,
                            androidTimeMinute === m && styles.androidTimeOptionTextSelected,
                          ]}
                        >
                          {m}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>

                <View style={styles.androidTimePeriodColumn}>
                  <Text style={styles.androidTimeColumnLabel}>AM / PM</Text>
                  <View style={styles.androidTimePeriodRow}>
                    {periodOptions.map((p) => (
                      <TouchableOpacity
                        key={`period-${p}`}
                        style={[
                          styles.androidTimePeriodChip,
                          androidTimePeriod === p && styles.androidTimePeriodChipSelected,
                        ]}
                        onPress={() => setAndroidTimePeriod(p)}
                      >
                        <Text
                          style={[
                            styles.androidTimePeriodText,
                            androidTimePeriod === p && styles.androidTimePeriodTextSelected,
                          ]}
                        >
                          {p}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              </View>

              <View style={styles.androidTimeActionsRow}>
                <TouchableOpacity
                  style={styles.androidTimeCancelButton}
                  onPress={() => setShowTimePicker(false)}
                >
                  <Text style={styles.androidTimeCancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.androidTimeConfirmButton}
                  onPress={handleAndroidTimeConfirm}
                >
                  <Text style={styles.androidTimeConfirmText}>Confirm</Text>
                </TouchableOpacity>
              </View>
            </Pressable>
          </Pressable>
        </Modal>
      )}

      {/* ANDROID test dropdown in modal for better scrolling */}
      {Platform.OS !== 'ios' && (
        <Modal
          visible={showTestPicker}
          transparent
          animationType="fade"
          onRequestClose={() => setShowTestPicker(false)}
        >
          <Pressable
            style={styles.testModalOverlay}
            onPress={() => setShowTestPicker(false)}
          >
            <Pressable style={styles.testModalCard}>
              <ScrollView
                showsVerticalScrollIndicator={true}
                persistentScrollbar={true}
                keyboardShouldPersistTaps="handled"
              >
                {testOptions.map((item, index) => {
                  const isSelected = Array.isArray(formData.selectedTests) && formData.selectedTests.includes(item);
                  return (
                    <TouchableOpacity
                      key={item}
                      style={[
                        styles.pickerOption,
                        index === 0 && styles.firstOption,
                        index === testOptions.length - 1 && styles.lastOption,
                        isSelected && { backgroundColor: '#DBEAFE' },
                      ]}
                      onPress={() => {
                        toggleSelectedTest(item);
                        setShowTestPicker(false);
                      }}
                    >
                      <Text style={styles.pickerOptionText}>
                        {isSelected ? `✓ ${item}` : item}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </Pressable>
          </Pressable>
        </Modal>
      )}

      {/* ANDROID guardian dropdown in modal for better scrolling */}
      {Platform.OS !== 'ios' && (
        <Modal
          visible={showGuardianPicker}
          transparent
          animationType="fade"
          onRequestClose={() => setShowGuardianPicker(false)}
        >
          <Pressable
            style={styles.guardianModalOverlay}
            onPress={() => setShowGuardianPicker(false)}
          >
            <Pressable style={styles.guardianModalCard}>
              <ScrollView
                showsVerticalScrollIndicator={true}
                persistentScrollbar={true}
                keyboardShouldPersistTaps="handled"
              >
                {guardianOptions.map((item) => (
                  <TouchableOpacity
                    key={item}
                    style={styles.pickerOption}
                    onPress={() => {
                      handleInputChange('selectedGuardian', item);
                      setShowGuardianPicker(false);
                    }}
                  >
                    <Text style={styles.pickerOptionText}>{item}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </Pressable>
          </Pressable>
        </Modal>
      )}

      {/* iOS date picker in modal bottom sheet */}
      {Platform.OS === 'ios' && (
        <Modal
          visible={showDatePicker}
          transparent
          animationType="slide"
          onRequestClose={() => setShowDatePicker(false)}
        >
          <Pressable
            style={styles.iosPickerOverlay}
            onPress={() => setShowDatePicker(false)}
          >
            <Pressable style={styles.iosPickerContainer}>
              <View style={styles.iosPickerHeader}>
                <Text style={styles.iosPickerTitle}>Select Date</Text>
                <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                  <Text style={styles.iosPickerDone}>Done</Text>
                </TouchableOpacity>
              </View>
              <DateTimePicker
                value={tempDate}
                mode="date"
                minimumDate={minSelectableDate}
                display="spinner"
                themeVariant="light"
                textColor="#111827"
                onChange={handleDateChange}
                style={styles.iosPicker}
              />
            </Pressable>
          </Pressable>
        </Modal>
      )}

      {/* iOS time picker in modal bottom sheet */}
      {Platform.OS === 'ios' && (
        <Modal
          visible={showTimePicker}
          transparent
          animationType="slide"
          onRequestClose={() => setShowTimePicker(false)}
        >
          <Pressable
            style={styles.iosPickerOverlay}
            onPress={() => setShowTimePicker(false)}
          >
            <Pressable style={styles.iosPickerContainer}>
              <View style={styles.iosPickerHeader}>
                <Text style={styles.iosPickerTitle}>Select Time</Text>
                <TouchableOpacity onPress={() => setShowTimePicker(false)}>
                  <Text style={styles.iosPickerDone}>Done</Text>
                </TouchableOpacity>
              </View>
              <DateTimePicker
                value={tempTime}
                mode="time"
                display="spinner"
                themeVariant="light"
                textColor="#111827"
                onChange={handleTimeChange}
                style={styles.iosPicker}
              />
            </Pressable>
          </Pressable>
        </Modal>
      )}
    </SafeAreaView>
  );
}

/* ==================== STYLES ==================== */
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
  placeholder: { width: 40 },
  keyboardView: { flex: 1 },
  content: { flex: 1, paddingHorizontal: 20, paddingTop: 24 },

  field: { marginBottom: 16 },
  dropdownContainer: { position: 'relative', zIndex: 9999 },
  dropdownOpen: { marginBottom: 300 }, // Space for 5-item dropdown
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#3B82F6',
    marginBottom: 12,
    textAlign: 'center',
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#4B5563',
    marginBottom: 6,
  },

  selectedTestInfo: {
    marginTop: 8,
    alignSelf: 'flex-start',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 999,
    backgroundColor: '#3B82F6',
    fontSize: 13,
    color: '#FFFFFF',
  },

  input: {
    height: 56,
    backgroundColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    color: '#374151',
  },
  addressInput: {
    height: 96,
    textAlignVertical: 'top',
    paddingTop: 12,
  },
  inputWithIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  inputText: {
    fontSize: 16,
    color: '#374151',
  },
  dropdown: {
    height: 56,
    backgroundColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dropdownText: { fontSize: 16, color: '#374151' },
  placeholderText: { color: '#9CA3AF' },

  // 5 items × 56px ≈ 280px
  pickerDropdown: {
    position: 'absolute',
    top: 60,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    maxHeight: 280, // SHOW ONLY 5 ITEMS
    borderWidth: 1,
    borderColor: '#E5E7EB',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    zIndex: 10000,
  },
  pickerScrollView: {
    flex: 1, // Makes ScrollView fill the dropdown
  },
  pickerOption: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 0.5,
    borderBottomColor: '#E5E7EB',
  },
  firstOption: {
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  lastOption: {
    borderBottomWidth: 0,
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
  },
  pickerOptionText: { fontSize: 16, color: '#374151' },

  // Gender dropdown (match signup style)
  genderPickerDropdown: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    zIndex: 1000,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  genderPickerOption: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  genderPickerOptionText: {
    fontSize: 16,
    color: '#111827',
  },

  // Android test dropdown modal
  testModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.15)',
    justifyContent: 'flex-start',
    alignItems: 'stretch',
    paddingHorizontal: 20,
    paddingTop: 120,
  },
  testModalCard: {
    width: '100%',
    maxHeight: 320,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    overflow: 'hidden',
  },

  guardianModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.15)',
    justifyContent: 'flex-start',
    alignItems: 'stretch',
    paddingHorizontal: 20,
    paddingTop: 200,
  },
  guardianModalCard: {
    width: '100%',
    maxHeight: 260,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    overflow: 'hidden',
  },

  // Ensure stacking order: guardian list above gender row
  guardianDropdownContainer: {
    zIndex: 10002,
  },
  genderDropdownContainer: {
    zIndex: 10001,
  },

  rowFields: { flexDirection: 'row', gap: 12 },
  halfField: { flex: 1 },

  actionButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 32,
    marginBottom: 40,
  },
  cancelButton: {
    flex: 1,
    height: 56,
    backgroundColor: '#E5E7EB',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelButtonText: { fontSize: 16, fontWeight: '600', color: '#374151' },
  bookButton: {
    flex: 1,
    height: 56,
    backgroundColor: '#3B82F6',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bookButtonText: { fontSize: 16, fontWeight: '600', color: '#FFFFFF' },
  iosPickerOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    top: 0,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.15)',
  },
  iosPickerContainer: {
    backgroundColor: '#FFFFFF',
    paddingTop: 12,
    paddingBottom: 24,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    borderTopWidth: 1,
    borderColor: '#E5E7EB',
  },
  iosPickerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  iosPickerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  iosPickerDone: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2563EB',
  },
  iosPicker: {
    height: 220,
    justifyContent: 'center',
  },
  navLabel: {
    fontSize: 12,
    color: '#6B7280',
  },
  activeNavLabel: {
    color: '#3B82F6',
    fontWeight: '600',
  },
  // Android custom time picker modal styles
  androidTimeModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  androidTimeModalCard: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingVertical: 20,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 10,
  },
  androidTimeTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    textAlign: 'center',
  },
  androidTimeSubtitle: {
    fontSize: 13,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 16,
  },
  androidTimePickerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  androidTimeColumn: {
    flex: 1,
    marginRight: 8,
  },
  androidTimePeriodColumn: {
    width: 72,
    marginLeft: 4,
  },
  androidTimeColumnLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 8,
  },
  androidTimeScroll: {
    maxHeight: 160,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
  },
  androidTimeScrollContent: {
    paddingVertical: 4,
    justifyContent: 'space-between',
  },
  androidTimeOption: {
    paddingVertical: 10,
    alignItems: 'center',
  },
  androidTimeOptionSelected: {
    backgroundColor: '#DBEAFE',
  },
  androidTimeOptionText: {
    fontSize: 16,
    color: '#374151',
  },
  androidTimeOptionTextSelected: {
    color: '#1D4ED8',
    fontWeight: '700',
  },
  androidTimePeriodRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  androidTimePeriodChip: {
    flex: 1,
    paddingVertical: 8,
    marginHorizontal: 2,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F9FAFB',
  },
  androidTimePeriodChipSelected: {
    backgroundColor: '#3B82F6',
    borderColor: '#2563EB',
  },
  androidTimePeriodText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
  },
  androidTimePeriodTextSelected: {
    color: '#FFFFFF',
  },
  androidTimeActionsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 8,
  },
  androidTimeCancelButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 999,
    marginRight: 8,
  },
  androidTimeCancelText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
  },
  androidTimeConfirmButton: {
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 999,
    backgroundColor: '#3B82F6',
  },
  androidTimeConfirmText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});