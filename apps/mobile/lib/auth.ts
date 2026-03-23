import React, { createContext, useContext, useEffect, useState } from 'react';
import * as SecureStore from 'expo-secure-store';
import type { UserProfile } from '@coach-keith/shared';
import * as api from './api';

interface AuthState {
  user: UserProfile | null;
  token: string | null;
  isLoading: boolean;
  isOnboarded: boolean;
}

interface AuthContextValue extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  register: (
    email: string,
    password: string,
    displayName: string,
  ) => Promise<void>;
  loginWithApple: (identityToken: string) => Promise<void>;
  logout: () => Promise<void>;
  setOnboarded: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    token: null,
    isLoading: true,
    isOnboarded: false,
  });

  useEffect(() => {
    loadStoredAuth();
  }, []);

  async function loadStoredAuth() {
    try {
      const token = await SecureStore.getItemAsync('auth_token');
      const onboarded = await SecureStore.getItemAsync('onboarded');
      if (token) {
        const res = await api.getProfile();
        if (res.success && res.data) {
          setState({
            user: res.data,
            token,
            isLoading: false,
            isOnboarded: onboarded === 'true',
          });
          return;
        }
      }
    } catch {
      // Token invalid or expired
    }
    setState((s) => ({ ...s, isLoading: false }));
  }

  async function handleLogin(email: string, password: string) {
    const res = await api.login(email, password);
    if (!res.success || !res.data) {
      throw new Error(res.error ?? 'Login failed');
    }
    await SecureStore.setItemAsync('auth_token', res.data.token);
    setState((s) => ({
      ...s,
      user: res.data!.user,
      token: res.data!.token,
      isOnboarded: true,
    }));
  }

  async function handleRegister(
    email: string,
    password: string,
    displayName: string,
  ) {
    const res = await api.register(email, password, displayName);
    if (!res.success || !res.data) {
      throw new Error(res.error ?? 'Registration failed');
    }
    await SecureStore.setItemAsync('auth_token', res.data.token);
    setState((s) => ({
      ...s,
      user: res.data!.user,
      token: res.data!.token,
      isOnboarded: false,
    }));
  }

  async function handleAppleLogin(identityToken: string) {
    const res = await api.loginWithApple(identityToken);
    if (!res.success || !res.data) {
      throw new Error(res.error ?? 'Apple login failed');
    }
    await SecureStore.setItemAsync('auth_token', res.data.token);
    setState((s) => ({
      ...s,
      user: res.data!.user,
      token: res.data!.token,
    }));
  }

  async function handleLogout() {
    await SecureStore.deleteItemAsync('auth_token');
    await SecureStore.deleteItemAsync('onboarded');
    setState({ user: null, token: null, isLoading: false, isOnboarded: false });
  }

  function setOnboarded() {
    SecureStore.setItemAsync('onboarded', 'true');
    setState((s) => ({ ...s, isOnboarded: true }));
  }

  const value: AuthContextValue = {
    ...state,
    login: handleLogin,
    register: handleRegister,
    loginWithApple: handleAppleLogin,
    logout: handleLogout,
    setOnboarded,
  };

  return React.createElement(AuthContext.Provider, { value }, children);
}
