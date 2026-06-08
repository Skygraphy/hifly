import { useAuthStore } from '../stores/authStore';
import * as authApi from '../api/auth';

export function useAuth() {
  const { token, email, role, setAuth, clearAuth } = useAuthStore();

  async function loginFn(emailInput: string, password: string) {
    const res = await authApi.login(emailInput, password);
    setAuth(res.token, emailInput, res.role);
  }

  async function registerFn(emailInput: string, password: string) {
    const res = await authApi.register(emailInput, password);
    setAuth(res.token, emailInput, res.role);
  }

  return {
    isAuthenticated: !!token,
    email,
    role,
    isAdmin: role === 'admin' || role === 'super_admin',
    isSuperAdmin: role === 'super_admin',
    login: loginFn,
    register: registerFn,
    logout: clearAuth,
  };
}
