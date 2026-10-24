import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { IUser, UserRole } from '../../shared/types';
import { api } from '../services/api';

interface AuthContextType {
  user: IUser | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  dbConnected: boolean;
  dbError: string | null;
  setupRequired: boolean;
  setupCompleted: boolean;
  login: (token: string, user: IUser) => void;
  logout: () => void;
  refreshMe: () => Promise<void>;
  checkSystemStatus: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<IUser | null>(null);
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('saylani_hcm_token'));
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [dbConnected, setDbConnected] = useState<boolean>(false);
  const [dbError, setDbError] = useState<string | null>(null);
  const [setupRequired, setSetupRequired] = useState<boolean>(false);
  const [setupCompleted, setSetupCompleted] = useState<boolean>(false);

  const checkSystemStatus = useCallback(async () => {
    try {
      const res = await api.getSetupStatus();
      if (res.data) {
        setDbConnected(Boolean(res.data.dbStatus?.isConnected));
        setDbError(res.data.dbStatus?.connectionError || null);
        setSetupCompleted(Boolean(res.data.setupCompleted));
        setSetupRequired(Boolean(res.data.dbStatus?.isConnected && !res.data.setupCompleted));
      }
    } catch (err: unknown) {
      console.warn('Could not retrieve system setup status:', err);
      setDbConnected(false);
      setDbError('Cannot reach server setup status endpoint.');
    }
  }, []);

  const refreshMe = useCallback(async () => {
    const currentToken = localStorage.getItem('saylani_hcm_token');
    if (!currentToken) {
      setUser(null);
      setIsLoading(false);
      return;
    }

    try {
      const res = await api.getMe();
      if (res.data) {
        setUser(res.data);
      } else {
        localStorage.removeItem('saylani_hcm_token');
        setUser(null);
        setToken(null);
      }
    } catch (err) {
      console.warn('Token validation failed, logging out:', err);
      localStorage.removeItem('saylani_hcm_token');
      setUser(null);
      setToken(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    async function init() {
      await checkSystemStatus();
      await refreshMe();
    }
    init();
  }, [checkSystemStatus, refreshMe]);

  const login = (newToken: string, newUser: IUser) => {
    localStorage.setItem('saylani_hcm_token', newToken);
    setToken(newToken);
    setUser(newUser);
  };

  const logout = () => {
    localStorage.removeItem('saylani_hcm_token');
    setToken(null);
    setUser(null);
    window.location.href = '/login';
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!token && !!user,
        isLoading,
        dbConnected,
        dbError,
        setupRequired,
        setupCompleted,
        login,
        logout,
        refreshMe,
        checkSystemStatus,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
