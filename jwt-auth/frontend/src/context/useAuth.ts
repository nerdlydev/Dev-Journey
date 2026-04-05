import { createContext, useContext } from "react";

export type AuthContextType = {
  token: string | null;
  setToken: (t: string | null) => void;
};

export const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be inside provider");
  return ctx;
};
