import React, { useState } from 'react';
import { SafeAreaView, View, Text, StyleSheet, ScrollView, TouchableOpacity, StatusBar } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useNotifications } from '../../context/NotificationContext';
import AdminDrawer from './AdminDrawer';

export default function AdminNotifications() {
  const router = useRouter();
  const { notifications, unreadAdminCount, markAsRead, markAllAsReadForAudience } = useNotifications();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const adminNotifications = notifications.filter((n) => n.audience === 'admin');

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Header matches other admin screens but with Notifications styling */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.menuButton}
          onPress={() => setIsMenuOpen(prev => !prev)}
        >
          <Ionicons name={isMenuOpen ? 'close' : 'menu'} size={22} color="#111827" />
        </TouchableOpacity>

        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>Notifications</Text>
          {unreadAdminCount > 0 && (
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadBadgeText}>{unreadAdminCount}</Text>
            </View>
          )}
        </View>

        <TouchableOpacity
          style={styles.markAllButton}
          onPress={() => {
            if (unreadAdminCount > 0) {
              markAllAsReadForAudience('admin');
            }
          }}
          disabled={unreadAdminCount === 0}
        >
          <Ionicons
            name="checkmark-done"
            size={20}
            color={unreadAdminCount > 0 ? '#3B82F6' : '#6B7280'}
          />
        </TouchableOpacity>
      </View>

      <AdminDrawer
        isOpen={isMenuOpen}
        onClose={() => setIsMenuOpen(false)}
        activeRoute="notifications"
      />

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        bounces
      >
        {adminNotifications.length === 0 && (
          <View style={styles.emptyState}>
            <Ionicons name="notifications-outline" size={64} color="#D1D5DB" />
            <Text style={styles.emptyStateTitle}>No Notifications</Text>
            <Text style={styles.emptyStateMessage}>
              You're all caught up! Check back later for updates.
            </Text>
          </View>
        )}

        {adminNotifications.map((notification, index) => (
          <TouchableOpacity
            key={`admin-notification-${notification.id}-${notification.read}`}
            style={[
              styles.notificationCard,
              !notification.read && styles.unreadNotification,
              { marginTop: index === 0 ? 0 : 8 },
            ]}
            activeOpacity={0.7}
            onPress={() => {
              // If this notification is tied to an appointment, navigate to
              // the admin appointments screen and highlight that card.
              if (notification.appointmentId && notification.type && notification.type.startsWith('appointment_')) {
                let statusFilter = 'Pending';
                if (notification.type === 'appointment_confirmed') statusFilter = 'Confirmed';
                if (notification.type === 'appointment_cancelled') statusFilter = 'Cancelled';
                if (notification.type === 'appointment_booked') statusFilter = 'Pending';

                router.push({
                  pathname: '/admin-view-appointments',
                  params: {
                    highlightAppointmentId: notification.appointmentId,
                    statusFilter,
                  },
                });
              }

              if (!notification.read) {
                markAsRead(notification.id);
              }
            }}
          >
            <View style={styles.notificationIcon}>
              <Ionicons
                name={notification.icon || 'notifications'}
                size={24}
                color={notification.iconColor || '#3B82F6'}
              />
            </View>

            <View style={styles.notificationContent}>
              <View style={styles.notificationHeader}>
                <Text style={styles.notificationTitle}>{notification.title}</Text>
                <Text style={styles.notificationTime}>{notification.timestamp || 'Just now'}</Text>
              </View>
              <Text style={styles.notificationMessage}>{notification.message}</Text>
            </View>

            {!notification.read && <View style={styles.unreadDot} />}
          </TouchableOpacity>
        ))}
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
    paddingHorizontal: 16,
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
    paddingHorizontal: 16,
    paddingBottom: 20,
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
