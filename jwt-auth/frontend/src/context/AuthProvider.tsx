import { createContext, useContext, useEffect, useState } from "react";
import { api } from "../api/axios";

type AuthContextType = {
  token: string | null;
  setToken: (t: string | null) => void;
};

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [token, setToken] = useState<string | null>(null);

  // Attach token
  useEffect(() => {
    const req = api.interceptors.request.use((config) => {
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });
    return () => api.interceptors.request.eject(req);
  }, [token]);

  // Refresh on 401
  useEffect(() => {
    const res = api.interceptors.response.use(
      (r) => r,
      async (err) => {
        const original = err.config;

        if (err.response?.status === 401 && !original._retry) {
          original._retry = true;
          try {
            const { data } = await api.post("/refresh");
            setToken(data.accessToken);
            original.headers.Authorization = `Bearer ${data.accessToken}`;
            return api(original);
          } catch {
            setToken(null);
          }
        }
        return Promise.reject(err);
      },
    );
    return () => api.interceptors.response.eject(res);
  }, []);

  // Initial refresh on app load
  useEffect(() => {
    api
      .post("/refresh")
      .then((res) => setToken(res.data.accessToken))
      .catch(() => setToken(null));
  }, []);

  return (
    <AuthContext.Provider value={{ token, setToken }}>
      {children}
    </AuthContext.Provider>
  );
};
export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be inside provider");
  return ctx;
};
