"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import { api } from "./api";
import React from "react";

interface User {
  id: string;
  email: string;
  name: string;
  tier: "free" | "core" | "premium" | "elite";
  avatarUrl?: string;
  streak: number;
  joinedAt: string;
}

interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

interface AuthContextType extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    isLoading: true,
    isAuthenticated: false,
  });

  const refreshUser = useCallback(async () => {
    try {
      const token = localStorage.getItem("auth_token");
      if (!token) {
        setState({ user: null, isLoading: false, isAuthenticated: false });
        return;
      }
      const user = await api.get<User>("/auth/me");
      setState({ user, isLoading: false, isAuthenticated: true });
    } catch {
      localStorage.removeItem("auth_token");
      setState({ user: null, isLoading: false, isAuthenticated: false });
    }
  }, []);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  const login = useCallback(async (email: string, password: string) => {
    const response = await api.post<{ token: string; user: User }>(
      "/auth/login",
      { email, password }
    );
    localStorage.setItem("auth_token", response.token);
    setState({ user: response.user, isLoading: false, isAuthenticated: true });
  }, []);

  const register = useCallback(
    async (name: string, email: string, password: string) => {
      const response = await api.post<{ token: string; user: User }>(
        "/auth/register",
        { name, email, password }
      );
      localStorage.setItem("auth_token", response.token);
      setState({
        user: response.user,
        isLoading: false,
        isAuthenticated: true,
      });
    },
    []
  );

  const logout = useCallback(() => {
    localStorage.removeItem("auth_token");
    setState({ user: null, isLoading: false, isAuthenticated: false });
  }, []);

  return React.createElement(
    AuthContext.Provider,
    { value: { ...state, login, register, logout, refreshUser } },
    children
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

export { AuthContext };
export type { User, AuthContextType };
