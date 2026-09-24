import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, FamilyMember, OnboardingPayload } from '../types';
import { api } from '../api/client';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isConfigured: boolean;
  isAdmin: boolean;
  isGuest: boolean;
  familyMembers: FamilyMember[];
  showAuthModal: boolean;
  showOnboarding: boolean;
  openAuthModal: () => void;
  closeAuthModal: () => void;
  openOnboarding: () => void;
  closeOnboarding: () => void;
  fetchFamilyMembers: () => Promise<void>;
  switchProfile: (username: string, password?: string) => Promise<void>;
  completeOnboarding: (data: OnboardingPayload) => Promise<void>;
  setupAdmin: (data: { username: string; name: string; password: string; email?: string }) => Promise<void>;
  login: (u: string, p: string) => Promise<void>;
  register: (data: { username: string; name: string; password: string; email?: string }) => Promise<void>;
  loginAsGuest: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoading: true,
  isConfigured: true,
  isAdmin: false,
  isGuest: false,
  familyMembers: [],
  showAuthModal: false,
  showOnboarding: false,
  openAuthModal: () => {},
  closeAuthModal: () => {},
  openOnboarding: () => {},
  closeOnboarding: () => {},
  fetchFamilyMembers: async () => {},
  switchProfile: async () => {},
  completeOnboarding: async () => {},
  setupAdmin: async () => {},
  login: async () => {},
  register: async () => {},
  loginAsGuest: async () => {},
  logout: async () => {}
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([]);
  const [isConfigured, setIsConfigured] = useState<boolean>(true);
  const [isLoading, setIsLoading] = useState(true);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);

  const fetchFamilyMembers = async () => {
    try {
      const members = await api.getFamilyMembers();
      setFamilyMembers(members);
    } catch (_) {}
  };

  const checkUser = async () => {
    setIsLoading(true);
    try {
      // 1. Check system setup status
      const status = await api.getAuthStatus();
      setIsConfigured(status.configured);
      if (!status.configured) {
        setShowOnboarding(true);
      }

      // 2. Query current session
      const res = await api.getMe();
      if (res && res.user) {
        setUser(res.user);
      } else {
        setUser(null);
      }

      // 3. Query family members
      await fetchFamilyMembers();
    } catch (_) {
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    checkUser();
  }, []);

  const switchProfile = async (username: string, password?: string) => {
    const res = await api.switchProfile(username, password);
    setUser(res.user);
    await fetchFamilyMembers();
  };

  const completeOnboarding = async (data: OnboardingPayload) => {
    const res = await api.completeOnboarding(data);
    setUser(res.user);
    setIsConfigured(true);
    setShowOnboarding(false);
    await fetchFamilyMembers();
  };

  const setupAdmin = async (data: { username: string; name: string; password: string; email?: string }) => {
    const res = await api.setupAdmin(data);
    setUser(res.user);
    setIsConfigured(true);
    setShowAuthModal(false);
    await fetchFamilyMembers();
  };

  const login = async (username: string, password: string) => {
    const res = await api.login(username, password);
    setUser(res.user);
    setShowAuthModal(false);
    await fetchFamilyMembers();
  };

  const register = async (data: { username: string; name: string; password: string; email?: string }) => {
    const res = await api.register(data);
    setUser(res.user);
    setShowAuthModal(false);
    await fetchFamilyMembers();
  };

  const loginAsGuest = async () => {
    const res = await api.guestLogin();
    setUser(res.user);
    setShowAuthModal(false);
  };

  const logout = async () => {
    await api.logout();
    setUser(null);
    await checkUser();
  };

  const isAdmin = user?.role === 'admin';
  const isGuest = user?.role === 'guest';

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isConfigured,
        isAdmin,
        isGuest,
        familyMembers,
        showAuthModal,
        showOnboarding,
        openAuthModal: () => setShowAuthModal(true),
        closeAuthModal: () => setShowAuthModal(false),
        openOnboarding: () => setShowOnboarding(true),
        closeOnboarding: () => setShowOnboarding(false),
        fetchFamilyMembers,
        switchProfile,
        completeOnboarding,
        setupAdmin,
        login,
        register,
        loginAsGuest,
        logout
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
