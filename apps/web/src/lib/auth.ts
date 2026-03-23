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
      const data = await api.get<{
        id: string;
        email: string;
        firstName: string;
        lastName: string;
        createdAt: string;
      }>("/auth/me");
      const user: User = {
        id: data.id,
        email: data.email,
        name: `${data.firstName} ${data.lastName}`.trim(),
        tier: "free",
        streak: 0,
        joinedAt: data.createdAt,
      };
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
    const response = await api.post<{
      accessToken: string;
      user: { id: string; email: string; firstName: string; lastName: string };
    }>("/auth/login", { email, password });
    localStorage.setItem("auth_token", response.accessToken);
    setState({
      user: {
        id: response.user.id,
        email: response.user.email,
        name: `${response.user.firstName} ${response.user.lastName}`.trim(),
        tier: "free",
        streak: 0,
        joinedAt: new Date().toISOString(),
      },
      isLoading: false,
      isAuthenticated: true,
    });
  }, []);

  const register = useCallback(
    async (name: string, email: string, password: string) => {
      const [firstName, ...lastParts] = name.trim().split(" ");
      const lastName = lastParts.join(" ") || firstName;
      const response = await api.post<{
        accessToken: string;
        user: { id: string; email: string; firstName: string; lastName: string };
      }>("/auth/register", {
        email,
        password,
        firstName,
        lastName,
      });
      localStorage.setItem("auth_token", response.accessToken);
      setState({
        user: {
          id: response.user.id,
          email: response.user.email,
          name: `${response.user.firstName} ${response.user.lastName}`.trim(),
          tier: "free",
          streak: 0,
          joinedAt: new Date().toISOString(),
        },
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
