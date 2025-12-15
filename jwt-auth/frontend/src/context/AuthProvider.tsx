import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useLayoutEffect,
} from "react";
import type { ReactNode } from "react";
import api from "../api/axios";
import { AxiosError } from "axios";
import type { InternalAxiosRequestConfig } from "axios";
import type { AuthContextType, User } from "../types/auth";

// Create Context with undefined initial value
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Custom Hook for easier usage
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

// Extend Axios Config to include the _retry flag
interface CustomAxiosRequestConfig extends InternalAxiosRequestConfig {
  _retry?: boolean;
}

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const login = async (username: string, password: string) => {
    const res = await api.post("/login", { username, password });
    setToken(res.data.accessToken);
    setUser(res.data.user);
  };

  const logout = async () => {
    try {
      await api.post("/logout");
    } catch (error) {
      console.error(error);
    } finally {
      setToken(null);
      setUser(null);
    }
  };

  // 1. Request Interceptor: Attach Token
  useLayoutEffect(() => {
    const authInterceptor = api.interceptors.request.use((config) => {
      // If we have a token, add it to headers
      if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });

    return () => api.interceptors.request.eject(authInterceptor);
  }, [token]);

  // 2. Response Interceptor: Handle Token Refresh
  useLayoutEffect(() => {
    const refreshInterceptor = api.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        const originalRequest = error.config as CustomAxiosRequestConfig;

        if (
          error.response?.status === 401 &&
          originalRequest &&
          !originalRequest._retry
        ) {
          originalRequest._retry = true;

          try {
            // Attempt to refresh
            const res = await api.post("/refresh");
            const newAccessToken = res.data.accessToken;

            // Update state
            setToken(newAccessToken);

            // Update header and retry original request
            if (originalRequest.headers) {
              originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
            }
            return api(originalRequest);
          } catch (refreshError) {
            // Refresh failed, logout completely
            setToken(null);
            setUser(null);
          }
        }
        return Promise.reject(error);
      }
    );

    return () => api.interceptors.response.eject(refreshInterceptor);
  }, []);

  // 3. Initial Load
  useEffect(() => {
    const checkAuth = async () => {
      try {
        // Try to get a new token using the cookie (if it exists)
        const res = await api.post("/refresh");
        setToken(res.data.accessToken);

        // Fetch user profile
        const userRes = await api.get("/me", {
          headers: { Authorization: `Bearer ${res.data.accessToken}` },
        });
        setUser(userRes.data.user);
      } catch (err) {
        // User is not logged in, do nothing
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  return (
    <AuthContext.Provider value={{ user, token, login, logout, loading }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
