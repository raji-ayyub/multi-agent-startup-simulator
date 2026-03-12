import api, { getApiErrorMessage } from "../api/axios";

export async function listNotifications({ unreadOnly = false, limit = 50 } = {}) {
  try {
    const { data } = await api.get("/api/v1/notifications", {
      params: {
        unread_only: unreadOnly,
        limit,
      },
    });
    return Array.isArray(data) ? data : [];
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "Unable to load notifications."));
  }
}

export async function markNotificationRead(notificationId) {
  try {
    const { data } = await api.patch(`/api/v1/notifications/${notificationId}/read`);
    return data;
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "Unable to update notification."));
  }
}

export async function markAllNotificationsRead() {
  try {
    const { data } = await api.post("/api/v1/notifications/read-all");
    return data;
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "Unable to mark notifications as read."));
  }
}

export async function listReports(params = {}) {
  try {
    const { data } = await api.get("/api/v1/reports", { params });
    return Array.isArray(data) ? data : [];
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "Unable to load reports."));
  }
}

export async function generateReport(payload) {
  try {
    const { data } = await api.post("/api/v1/reports/generate", payload);
    return data;
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "Unable to generate report."));
  }
}

export async function exportReport(reportId, format = "pdf") {
  try {
    const response = await api.get(`/api/v1/reports/${reportId}/export`, {
      params: { format },
      responseType: "blob",
    });
    const disposition = response.headers["content-disposition"] || "";
    const match = disposition.match(/filename=([^;]+)/i);
    const fileName = match ? match[1].replace(/['"]/g, "") : `report.${format === "gdocs" ? "html" : "pdf"}`;
    const blobUrl = window.URL.createObjectURL(response.data);
    const anchor = document.createElement("a");
    anchor.href = blobUrl;
    anchor.download = fileName;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.URL.revokeObjectURL(blobUrl);
    return true;
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "Unable to export report."));
  }
}

export async function listCalendarEvents(params = {}) {
  try {
    const { data } = await api.get("/api/v1/calendar/events", { params });
    return Array.isArray(data) ? data : [];
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "Unable to load calendar items."));
  }
}

export async function createCalendarEvent(payload) {
  try {
    const { data } = await api.post("/api/v1/calendar/events", payload);
    return data;
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "Unable to create calendar item."));
  }
}

export async function suggestCalendarEvents(payload) {
  try {
    const { data } = await api.post("/api/v1/calendar/events/suggest", payload);
    return Array.isArray(data) ? data : [];
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "Unable to generate calendar suggestions."));
  }
}

export async function updateCalendarEvent(eventId, payload) {
  try {
    const { data } = await api.patch(`/api/v1/calendar/events/${eventId}`, payload);
    return data;
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "Unable to update calendar item."));
  }
}

export async function updateAdminUser(userId, payload) {
  try {
    const { data } = await api.patch(`/api/v1/admin/users/${userId}`, payload);
    return data;
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "Unable to update user access."));
  }
}
