import axios from "axios";

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:5000",
});

// Request interceptor for auth token
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor to unwrap error envelope
apiClient.interceptors.response.use(
  (response) => {
    // We expect the backend to return { success: true, data: ... }
    return response.data;
  },
  (error) => {
    const errorResponse = error.response?.data || {
      message: "An unexpected error occurred",
    };
    return Promise.reject(errorResponse);
  },
);
