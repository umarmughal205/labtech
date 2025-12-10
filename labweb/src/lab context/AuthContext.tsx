import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import axios from "axios";
import { API_URL } from "@/lib/api";

const normalizeRole = (role: string | null): string | null => {
  if (!role) return role;
  return role === "labTech" ? "lab-technician" : role;
};

interface AuthContextType {
  token: string | null;
  role: string | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [token, setToken] = useState<string | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Bootstrap auth state from localStorage once
  useEffect(() => {
    const stored = localStorage.getItem("token");
    const storedRole = localStorage.getItem("role");
    if (stored) setToken(stored);
    if (storedRole) setRole(normalizeRole(storedRole));
    setLoading(false);
  }, []);

  const login = async (username: string, password: string) => {
    const API_BASE = API_URL ? `${API_URL}/api/auth` : "/api/auth";
    const res = await axios.post(`${API_BASE}/login`, {
      emailOrPhone: username,
      password,
    });

    const { success, token: jwt, user } = res.data || {};
    if (!success || !jwt || !user) {
      throw new Error("Login failed");
    }

    // Only allow non-patient roles into this lab UI
    if (String(user.role || "").toLowerCase() === "patient") {
      throw new Error("Patient accounts cannot log in here");
    }

    localStorage.setItem("token", jwt);
    localStorage.setItem("role", user.role);
    setToken(jwt);
    setRole(normalizeRole(user.role));
  };

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    setToken(null);
    setRole(null);
  };

  return (
    <AuthContext.Provider value={{ token, role, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};
