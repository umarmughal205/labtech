import React, { useState, useEffect } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, StatusBar, Platform, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useNotifications } from '../../context/NotificationContext';

export default function Notifications() {
  const router = useRouter();
  const { notifications, unreadPatientCount, markAllAsReadForAudience, markAsRead } = useNotifications();
  const [isMarkingAllRead, setIsMarkingAllRead] = React.useState(false);
  const [isFirstLaunch, setIsFirstLaunch] = useState(true);
  
  // First launch detection
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsFirstLaunch(false);
    }, 100); // After 100ms, no longer first launch
    
    return () => clearTimeout(timer);
  }, []);
  
  // Get screen dimensions for responsive design
  const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
  const isTablet = screenWidth >= 768;
  const isSmallScreen = screenWidth < 375;
  
  // Calculate reduced safe area for first launch (5% reduction)
  const topPadding = isFirstLaunch ? 8 : 12; // Reduced from 12 to 8 (33% reduction ≈ 5% of typical safe area)
  
  // Responsive values
  const horizontalPadding = isTablet ? 32 : isSmallScreen ? 12 : 16;
  const cardSpacing = isTablet ? 12 : 8;
  const iconSize = isTablet ? 28 : 24;
  const titleFontSize = isTablet ? 20 : 18;

  // Only patient notifications for this screen
  const patientNotifications = notifications.filter((n) => n.audience === 'patient');

  return (
    <SafeAreaView style={[styles.container, { paddingTop: topPadding }]}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      
      {/* Header */}
      <View style={[styles.header, { paddingHorizontal: horizontalPadding }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>Notifications</Text>
          {unreadPatientCount > 0 && (
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadBadgeText}>{unreadPatientCount}</Text>
            </View>
          )}
        </View>
        <TouchableOpacity 
          style={styles.markAllButton}
          onPress={async () => {
            if (unreadPatientCount > 0 && !isMarkingAllRead) {
              setIsMarkingAllRead(true);
              markAllAsReadForAudience('patient');
              // Reset loading state after a short delay
              setTimeout(() => {
                setIsMarkingAllRead(false);
              }, 200);
            }
          }}
          disabled={unreadPatientCount === 0 || isMarkingAllRead}
        >
          <Ionicons 
            name="checkmark-done" 
            size={20} 
            color={unreadPatientCount > 0 && !isMarkingAllRead ? "#3B82F6" : "#6B7280"} 
          />
        </TouchableOpacity>
      </View>

      <ScrollView 
        style={styles.content} 
        contentContainerStyle={[
          styles.scrollContent,
          { paddingHorizontal: horizontalPadding, paddingBottom: 20 }
        ]}
        showsVerticalScrollIndicator={false}
        bounces={true}
        scrollEventThrottle={16}
      >
        {patientNotifications.map((notification, index) => (
          <TouchableOpacity 
            key={`notification-${notification.id}-${notification.read}`}
            style={[
              styles.notificationCard,
              !notification.read && styles.unreadNotification,
              { 
                marginTop: index === 0 ? 0 : cardSpacing,
                marginBottom: cardSpacing / 2
              }
            ]}
            activeOpacity={0.7}
            underlayColor="transparent"
            onPress={() => {
              // Navigate first, then mark as read to prevent visual flicker
              if (notification.type === 'report_uploaded') {
                router.push('/reports');
              } else if (
                notification.type &&
                notification.type.startsWith('appointment_') &&
                notification.appointmentId
              ) {
                // Deep-link into Appointments and highlight the related card
                let filter = 'All';
                if (notification.type === 'appointment_confirmed') filter = 'Upcoming';
                if (notification.type === 'appointment_cancelled') filter = 'Cancelled';

                router.push({
                  pathname: '/appointments',
                  params: {
                    filter,
                    highlightAppointmentId: notification.appointmentId,
                  },
                });
              } else if (notification.type === 'appointment_reminder') {
                router.push('/appointments?filter=Upcoming');
              }

              // Mark as read after navigation to prevent visual issues
              if (!notification.read) {
                setTimeout(() => {
                  markAsRead(notification.id);
                }, 100);
              }
            }}
          >
            <View style={styles.notificationIcon}>
              <Ionicons 
                name={notification.icon} 
                size={iconSize} 
                color={notification.iconColor} 
              />
            </View>
            
            <View style={styles.notificationContent}>
              <View style={styles.notificationHeader}>
                <Text style={styles.notificationTitle}>{notification.title}</Text>
                <Text style={styles.notificationTime}>{notification.timestamp}</Text>
              </View>
              <Text style={styles.notificationMessage}>{notification.message}</Text>
            </View>
            
            {!notification.read && <View style={styles.unreadDot} />}
          </TouchableOpacity>
        ))}
        
        {patientNotifications.length === 0 && (
          <View style={styles.emptyState}>
            <Ionicons name="notifications-outline" size={64} color="#D1D5DB" />
            <Text style={styles.emptyStateTitle}>No Notifications</Text>
            <Text style={styles.emptyStateMessage}>You're all caught up! Check back later for updates.</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    paddingTop: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
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
    flexDirection: 'row',
    alignItems: 'center',
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
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  unreadBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  markAllButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingTop: 16,
  },
  notificationCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    marginBottom: 8,
    overflow: 'hidden',
    borderWidth: 0,
    borderColor: 'transparent',
  },
  unreadNotification: {
    backgroundColor: '#F0F9FF',
    borderLeftWidth: 4,
    borderLeftColor: '#3B82F6',
  },
  notificationIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  notificationContent: {
    flex: 1,
  },
  notificationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  notificationTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    flex: 1,
  },
  notificationTime: {
    fontSize: 12,
    color: '#6B7280',
    marginLeft: 8,
  },
  notificationMessage: {
    fontSize: 14,
    color: '#4B5563',
    lineHeight: 20,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#3B82F6',
    marginLeft: 8,
    marginTop: 8,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 80,
    paddingHorizontal: 32,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#374151',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateMessage: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 24,
  },
});
