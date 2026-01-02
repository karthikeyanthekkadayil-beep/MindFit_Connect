import { useEffect, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { PushNotifications, Token, PushNotificationSchema, ActionPerformed } from '@capacitor/push-notifications';
import { toast } from 'sonner';

export interface PushNotificationState {
  token: string | null;
  notifications: PushNotificationSchema[];
  isSupported: boolean;
  isRegistered: boolean;
}

export function usePushNotifications() {
  const [state, setState] = useState<PushNotificationState>({
    token: null,
    notifications: [],
    isSupported: Capacitor.isNativePlatform(),
    isRegistered: false,
  });

  useEffect(() => {
    // Only run on native platforms
    if (!Capacitor.isNativePlatform()) {
      return;
    }

    const setupPushNotifications = async () => {
      try {
        // Request permission
        const permStatus = await PushNotifications.requestPermissions();
        
        if (permStatus.receive === 'granted') {
          // Register with Apple / Google to receive push via APNS/FCM
          await PushNotifications.register();
        } else {
          toast.error('Push notification permission denied');
        }
      } catch (error) {
        console.error('Error setting up push notifications:', error);
      }
    };

    // On success, we should be able to receive notifications
    PushNotifications.addListener('registration', (token: Token) => {
      console.log('Push registration success, token:', token.value);
      setState(prev => ({
        ...prev,
        token: token.value,
        isRegistered: true,
      }));
      toast.success('Push notifications enabled');
    });

    // Registration error
    PushNotifications.addListener('registrationError', (error) => {
      console.error('Error on registration:', error);
      toast.error('Failed to register for push notifications');
    });

    // Show us the notification payload if the app is open on our device
    PushNotifications.addListener('pushNotificationReceived', (notification: PushNotificationSchema) => {
      console.log('Push notification received:', notification);
      setState(prev => ({
        ...prev,
        notifications: [...prev.notifications, notification],
      }));
      
      // Show toast for foreground notifications
      toast.info(notification.title || 'New notification', {
        description: notification.body,
      });
    });

    // Method called when tapping on a notification
    PushNotifications.addListener('pushNotificationActionPerformed', (action: ActionPerformed) => {
      console.log('Push action performed:', action);
      // Handle notification tap - could navigate to specific screen based on data
      const notification = action.notification;
      setState(prev => ({
        ...prev,
        notifications: [...prev.notifications, notification],
      }));
    });

    setupPushNotifications();

    // Cleanup listeners on unmount
    return () => {
      PushNotifications.removeAllListeners();
    };
  }, []);

  const clearNotifications = () => {
    setState(prev => ({ ...prev, notifications: [] }));
  };

  return {
    ...state,
    clearNotifications,
  };
}
