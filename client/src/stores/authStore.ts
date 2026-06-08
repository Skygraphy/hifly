import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type UserRole = 'user' | 'admin' | 'super_admin';

interface AuthState {
  token: string | null;
  email: string | null;
  role: UserRole | null;
  setAuth: (token: string, email: string, role: UserRole) => void;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      email: null,
      role: null,
      setAuth: (token, email, role) => set({ token, email, role }),
      clearAuth: () => set({ token: null, email: null, role: null }),
    }),
    { name: 'hifly-auth' }
  )
);
