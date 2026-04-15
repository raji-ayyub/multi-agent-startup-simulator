import axios from "axios";

const normalizeBaseUrl = (value) =>
  String(value || "")
    .trim()
    .replace(/^http:\/\/localhost(?=[:/]|$)/i, "http://127.0.0.1")
    .replace(/^https:\/\/localhost(?=[:/]|$)/i, "https://127.0.0.1")
    .replace(/\/+$/, "");
const API_BASE_URL = normalizeBaseUrl(import.meta.env.VITE_API_URL) || "http://127.0.0.1:8000";

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("accessToken");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const getApiErrorMessage = (error, fallback = "Request failed.") => {
  return (
    error?.response?.data?.detail ||
    error?.response?.data?.message ||
    error?.message ||
    fallback
  );
};

export default api;
