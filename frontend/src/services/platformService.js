import api, { getApiErrorMessage } from "../api/axios";

let reportTemplatesCache = null;

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
    if (Array.isArray(data)) {
      return {
        items: data,
        page: Number(params?.page || 1),
        page_size: Number(params?.page_size || data.length || 1),
        total: data.length,
        total_pages: 1,
      };
    }
    return {
      items: Array.isArray(data?.items) ? data.items : [],
      page: Number(data?.page || 1),
      page_size: Number(data?.page_size || params?.page_size || 8),
      total: Number(data?.total || 0),
      total_pages: Number(data?.total_pages || 1),
    };
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "Unable to load reports."));
  }
}

export async function getReport(reportId) {
  try {
    const { data } = await api.get(`/api/v1/reports/${reportId}`);
    return data;
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "Unable to load report details."));
  }
}

export async function updateReport(reportId, payload) {
  try {
    const { data } = await api.patch(`/api/v1/reports/${reportId}`, payload);
    return data;
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "Unable to update report."));
  }
}

export async function deleteReport(reportId) {
  try {
    const { data } = await api.delete(`/api/v1/reports/${reportId}`);
    return data;
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "Unable to delete report."));
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

export async function listReportTemplates({ forceRefresh = false } = {}) {
  if (!forceRefresh && Array.isArray(reportTemplatesCache) && reportTemplatesCache.length) {
    return reportTemplatesCache;
  }
  try {
    const { data } = await api.get("/api/v1/reports/templates");
    reportTemplatesCache = Array.isArray(data) ? data : [];
    return reportTemplatesCache;
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "Unable to load report templates."));
  }
}

function sanitizeFileBase(value = "") {
  const normalized = String(value)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return normalized || "business-insight-report";
}

function parseContentDispositionFileName(contentDisposition = "") {
  if (!contentDisposition) return "";
  const filenameStar = contentDisposition.match(/filename\*\s*=\s*UTF-8''([^;]+)/i);
  if (filenameStar?.[1]) {
    try {
      return decodeURIComponent(filenameStar[1]);
    } catch {
      return filenameStar[1];
    }
  }
  const filenameBasic = contentDisposition.match(/filename\s*=\s*["']?([^;"']+)["']?/i);
  return filenameBasic?.[1] || "";
}

export async function exportReport(reportId, format = "pdf", fallbackTitle = "", options = {}) {
  try {
    const reportType = options?.reportType || "";
    const quality = options?.quality || "standard";
    const templateId = options?.templateId || "";
    const response = await api.get(`/api/v1/reports/${reportId}/export`, {
      params: {
        format,
        ...(reportType ? { report_type: reportType } : {}),
        ...(quality ? { quality } : {}),
        ...(templateId ? { template_id: templateId } : {}),
      },
      responseType: "blob",
    });
    const disposition = response.headers["content-disposition"] || "";
    const extension = format === "gdocs" ? "html" : "pdf";
    const parsedName = parseContentDispositionFileName(disposition);
    const fallbackName = `${sanitizeFileBase(fallbackTitle)}.${extension}`;
    const fileName = parsedName || fallbackName;
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
