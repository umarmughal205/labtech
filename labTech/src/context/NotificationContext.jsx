import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { API_ENDPOINTS } from '../config/api';

const NotificationContext = createContext();

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};

export const NotificationProvider = ({ children }) => {
  const [notifications, setNotifications] = useState([]);
  const [latestPopupNotification, setLatestPopupNotification] = useState(null);
  const { authToken, user } = useAuth();

  // Load notifications for the authenticated user from the backend
  useEffect(() => {
    const loadNotifications = async () => {
      try {
        if (!authToken || !user) {
          setNotifications([]);
          return;
        }

        const response = await fetch(API_ENDPOINTS.NOTIFICATIONS_MINE, {
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        });

        const data = await response.json();

        if (!response.ok || !data.success) {
          console.warn('Failed to load notifications from backend:', data);
          setNotifications([]);
          return;
        }

        const mapped = (data.notifications || []).map((n) => ({
          id: n._id,
          type: n.type,
          title: n.title,
          message: n.message,
          icon: n.icon || 'notifications',
          iconColor: n.iconColor || '#3B82F6',
          audience: n.audience,
          read: !!n.read,
          timestamp: n.createdAt ? new Date(n.createdAt).toLocaleString() : 'Just now',
          createdAt: n.createdAt,
          appointmentId: n.appointment || null,
        }));

        setNotifications((prev) => {
          if (!prev || prev.length === 0) {
            return mapped;
          }

          const prevIds = new Set(prev.map((p) => p.id));
          const newest = mapped.find((n) => !n.read && !prevIds.has(n.id));
          if (newest) {
            setLatestPopupNotification(newest);
          }

          return mapped;
        });
      } catch (err) {
        console.error('Error loading notifications from backend:', err);
        setNotifications([]);
      }
    };

    loadNotifications();
  }, [authToken, user]);

  const getUnreadCountForAudience = (audience) =>
    notifications.filter((notification) => !notification.read && notification.audience === audience).length;

  const unreadPatientCount = getUnreadCountForAudience('patient');
  const unreadAdminCount = getUnreadCountForAudience('admin');
  const unreadCount = unreadPatientCount; // default for existing patient UI

  // Function to mark a single notification as read
  const markAsRead = (notificationId) => {
    setNotifications(prevNotifications =>
      prevNotifications.map(notification =>
        notification.id === notificationId
          ? { ...notification, read: true }
          : notification
      )
    );

    // Persist to backend for the current user
    if (authToken) {
      fetch(API_ENDPOINTS.NOTIFICATIONS_MARK_READ(notificationId), {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      }).catch((err) => {
        console.error('Error marking notification read in backend:', err);
      });
    }
  };

  // Function to add a new notification to the list (prepended, unread by default)
  // audience: 'patient' | 'admin' (defaults to 'patient')
  const addNotification = ({
    type,
    title,
    message,
    icon = 'notifications',
    iconColor = '#3B82F6',
    timestamp = 'Just now',
    audience = 'patient',
  }) => {
    // Optimistically add to local state
    const optimisticId = Date.now().toString();
    const localNotification = {
      id: optimisticId,
      type,
      title,
      message,
      timestamp,
      icon,
      iconColor,
      audience,
      read: false,
    };

    setNotifications(prev => [localNotification, ...prev]);

    // Persist to backend for this user if authenticated
    if (authToken && user && user.id) {
      fetch(API_ENDPOINTS.NOTIFICATIONS_CREATE, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          userId: user.id,
          audience,
          type,
          title,
          message,
          icon,
          iconColor,
        }),
      })
        .then(res => res.json())
        .then((data) => {
          if (!data || !data.success || !data.notification) {
            console.warn('Failed to persist notification to backend:', data);
            return;
          }

          const saved = data.notification;
          const mappedSaved = {
            id: saved._id,
            type: saved.type,
            title: saved.title,
            message: saved.message,
            icon: saved.icon || icon,
            iconColor: saved.iconColor || iconColor,
            audience: saved.audience || audience,
            read: !!saved.read,
            timestamp: saved.createdAt ? new Date(saved.createdAt).toLocaleString() : timestamp,
            createdAt: saved.createdAt,
          };

          // Replace the optimistic notification with the saved one
          setNotifications(prev =>
            prev.map((n) => (n.id === optimisticId ? mappedSaved : n))
          );
        })
        .catch((err) => {
          console.error('Error creating notification in backend:', err);
        });
    }
  };

  // Function to mark all notifications as read for a specific audience
  const markAllAsReadForAudience = (audience) => {
    // Use setTimeout to prevent rendering issues with rapid state updates
    setTimeout(() => {
      setNotifications(prevNotifications =>
        prevNotifications.map((notification) =>
          !audience || notification.audience === audience
            ? { ...notification, read: true }
            : notification
        )
      );
    }, 50);

    // Backend marks all notifications for this user as read
    if (authToken) {
      fetch(API_ENDPOINTS.NOTIFICATIONS_MARK_ALL_READ, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      }).catch((err) => {
        console.error('Error marking all notifications read in backend:', err);
      });
    }
  };

  // Backwards-compatible: mark all notifications (both audiences) as read
  const markAllAsRead = () => markAllAsReadForAudience(undefined);

  const value = {
    notifications,
    latestPopupNotification,
    unreadCount,
    unreadPatientCount,
    unreadAdminCount,
    markAsRead,
    markAllAsRead,
    markAllAsReadForAudience,
    addNotification,
    clearLatestPopupNotification: () => setLatestPopupNotification(null),
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};
