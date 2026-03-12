import { create } from "zustand";

import {
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "../services/platformService";

const useNotificationStore = create((set, get) => ({
  items: [],
  unreadCount: 0,
  isLoading: false,
  error: null,

  fetchNotifications: async ({ unreadOnly = false, limit = 20 } = {}) => {
    set({ isLoading: true, error: null });
    try {
      const items = await listNotifications({ unreadOnly, limit });
      set({
        items,
        unreadCount: items.filter((item) => !item.is_read).length,
        isLoading: false,
        error: null,
      });
      return items;
    } catch (error) {
      set({
        isLoading: false,
        error: error?.message || "Unable to load notifications.",
      });
      return [];
    }
  },

  markOneRead: async (notificationId) => {
    try {
      await markNotificationRead(notificationId);
      set((state) => {
        const items = state.items.map((item) =>
          item.notification_id === notificationId ? { ...item, is_read: true } : item
        );
        return {
          items,
          unreadCount: items.filter((item) => !item.is_read).length,
        };
      });
      return true;
    } catch {
      return false;
    }
  },

  markEverythingRead: async () => {
    try {
      await markAllNotificationsRead();
      set((state) => ({
        items: state.items.map((item) => ({ ...item, is_read: true })),
        unreadCount: 0,
      }));
      return true;
    } catch {
      return false;
    }
  },

  refreshUnreadCount: async () => {
    const items = await get().fetchNotifications({ unreadOnly: false, limit: 20 });
    return items.filter((item) => !item.is_read).length;
  },
}));

export default useNotificationStore;
