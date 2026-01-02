import { createContext, useContext, ReactNode } from 'react';
import { usePushNotifications, PushNotificationState } from '@/hooks/usePushNotifications';

interface PushNotificationContextType extends PushNotificationState {
  clearNotifications: () => void;
}

const PushNotificationContext = createContext<PushNotificationContextType | null>(null);

export function PushNotificationProvider({ children }: { children: ReactNode }) {
  const pushNotifications = usePushNotifications();

  return (
    <PushNotificationContext.Provider value={pushNotifications}>
      {children}
    </PushNotificationContext.Provider>
  );
}

export function usePushNotificationContext() {
  const context = useContext(PushNotificationContext);
  if (!context) {
    throw new Error('usePushNotificationContext must be used within PushNotificationProvider');
  }
  return context;
}
