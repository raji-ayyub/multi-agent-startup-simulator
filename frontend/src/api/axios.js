import axios from "axios";

const normalizeBaseUrl = (value) =>
  String(value || "")
    .trim()
    .replace(/\/+$/, "");

const LOCAL_API_BASE_URL = normalizeBaseUrl(
  import.meta.env.VITE_API_BASE_URL_LOCAL || "http://localhost:8000"
);
const LIVE_API_BASE_URL = normalizeBaseUrl(
  import.meta.env.VITE_API_BASE_URL_LIVE || "https://multi-agent-startup-simulator.onrender.com"
);

const resolveApiBaseUrlFromHost = () => {
  if (typeof window === "undefined") {
    return LOCAL_API_BASE_URL;
  }

  // `window.location.hostname` mirrors the current Host header in browser context.
  const host = String(window.location.hostname || "").toLowerCase();
  const isLocalHost = host === "localhost" || host === "127.0.0.1" || host === "::1" || host === "[::1]";
  return isLocalHost ? LOCAL_API_BASE_URL : LIVE_API_BASE_URL;
};

const API_BASE_URL = resolveApiBaseUrlFromHost();


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
