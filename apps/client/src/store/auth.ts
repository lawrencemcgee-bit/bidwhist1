import { create } from 'zustand';
import type { UserDto } from '@bidwhist/shared';
import { api, setAuthToken } from '../api/client.js';

const TOKEN_KEY = 'bidwhist.token';

interface AuthState {
  token: string | null;
  user: UserDto | null;
  initialized: boolean;
  init: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  updateAvatar: (avatarId: string) => Promise<void>;
}

export const useAuth = create<AuthState>((set, get) => ({
  token: typeof localStorage !== 'undefined' ? localStorage.getItem(TOKEN_KEY) : null,
  user: null,
  initialized: false,

  init: async () => {
    const token = get().token;
    if (!token) {
      set({ initialized: true });
      return;
    }
    setAuthToken(token);
    try {
      const { user } = await api.me();
      set({ user, initialized: true });
    } catch {
      localStorage.removeItem(TOKEN_KEY);
      setAuthToken(null);
      set({ token: null, user: null, initialized: true });
    }
  },

  login: async (email, password) => {
    const res = await api.login({ email, password });
    setAuthToken(res.token);
    localStorage.setItem(TOKEN_KEY, res.token);
    set({ token: res.token, user: res.user });
  },

  register: async (email, username, password) => {
    const res = await api.register({ email, username, password });
    setAuthToken(res.token);
    localStorage.setItem(TOKEN_KEY, res.token);
    set({ token: res.token, user: res.user });
  },

  logout: async () => {
    try {
      await api.logout();
    } catch {
      // token is invalidated client-side regardless
    }
    setAuthToken(null);
    localStorage.removeItem(TOKEN_KEY);
    set({ token: null, user: null });
  },

  updateAvatar: async (avatarId) => {
    const { user } = await api.updateAvatar(avatarId);
    set({ user });
  },
}));
