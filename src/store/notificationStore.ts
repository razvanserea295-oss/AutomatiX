import { create } from 'zustand';

export type NotificationType = 'blockage' | 'deadline' | 'completion' | 'other';

export interface Notification {
  id: number;
  type: NotificationType;
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  projectId?: number;
  pieceId?: number;
}

interface NotificationState {
  notifications: Notification[];
  unreadCount: number;
  addNotification: (notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => void;
  markAsRead: (id: number) => void;
  markAllAsRead: () => void;
  removeNotification: (id: number) => void;
  clearAll: () => void;
}

let notificationId = 1;

export const useNotificationStore = create<NotificationState>((set) => ({
  notifications: [],
  unreadCount: 0,

  addNotification: (notification) => {
    set((state) => {
      const newNotification: Notification = {
        ...notification,
        id: notificationId++,
        timestamp: new Date().toISOString(),
        read: false,
      };

      
      const updated = [newNotification, ...state.notifications].slice(0, 50);
      const unreadCount = updated.filter((n) => !n.read).length;

      return {
        notifications: updated,
        unreadCount,
      };
    });
  },

  markAsRead: (id) => {
    set((state) => {
      const updated = state.notifications.map((n) =>
        n.id === id ? { ...n, read: true } : n
      );
      const unreadCount = updated.filter((n) => !n.read).length;

      return {
        notifications: updated,
        unreadCount,
      };
    });
  },

  markAllAsRead: () => {
    set((state) => ({
      notifications: state.notifications.map((n) => ({ ...n, read: true })),
      unreadCount: 0,
    }));
  },

  removeNotification: (id) => {
    set((state) => {
      const updated = state.notifications.filter((n) => n.id !== id);
      const unreadCount = updated.filter((n) => !n.read).length;

      return {
        notifications: updated,
        unreadCount,
      };
    });
  },

  clearAll: () => {
    set({
      notifications: [],
      unreadCount: 0,
    });
  },
}));





export const createBlockageNotification = (projectId: number, projectName: string) => {
  return {
    type: 'blockage' as NotificationType,
    title: 'Proiect Blocat',
    message: `Proiectul "${projectName}" a intrat în stadiul Blocat`,
    projectId,
  };
};

export const createDeadlineNotification = (projectId: number, projectName: string, hoursRemaining: number) => {
  return {
    type: 'deadline' as NotificationType,
    title: 'Risc Deadline',
    message: `Proiectul "${projectName}" are deadline în ${hoursRemaining} ore`,
    projectId,
  };
};

export const createCompletionNotification = (pieceId: number, pieceName: string) => {
  return {
    type: 'completion' as NotificationType,
    title: 'Piesă Finalizată',
    message: `Piesa "${pieceName}" a fost finalizată în toate fazele`,
    pieceId,
  };
};

export const createPhaseUpdateNotification = (pieceName: string, phase: string) => {
  return {
    type: 'other' as NotificationType,
    title: 'Actualizare Fază',
    message: `Piesa "${pieceName}" a avansat la faza "${phase}"`,
  };
};
