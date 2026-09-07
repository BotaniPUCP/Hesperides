'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { apiClient, ApiError } from './api';

export interface SessionUser {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  fullName: string;
  role: { id: number; code: string; label: string };
  isActive: boolean;
  lastLogin: string | null;
}

interface LoginPayload {
  accessToken: string;
  expiresIn: number;
  user: SessionUser;
}

interface AuthContextValue {
  user: SessionUser | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Al montar, se pregunta por la sesión: la cookie httpOnly viaja sola, así
  // que recargar la página no obliga a volver a iniciar sesión.
  useEffect(() => {
    apiClient
      .get<SessionUser>('/auth/me')
      .then(setUser)
      .catch(() => setUser(null))
      .finally(() => setIsLoading(false));
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const payload = await apiClient.post<LoginPayload>('/auth/login', { email, password });
    setUser(payload.user);
  }, []);

  const logout = useCallback(async () => {
    try {
      await apiClient.post('/auth/logout');
    } catch (error) {
      // Si el logout falla en el servidor, la sesión local se cierra igual:
      // dejar al usuario "dentro" tras pulsar salir sería peor.
      if (!(error instanceof ApiError)) throw error;
    } finally {
      setUser(null);
    }
  }, []);

  const value = useMemo(() => ({ user, isLoading, login, logout }), [user, isLoading, login, logout]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuthContext(): AuthContextValue {
  const context = useContext(AuthContext);
  if (context === null) {
    throw new Error('useAuthContext debe usarse dentro de un AuthProvider');
  }
  return context;
}
