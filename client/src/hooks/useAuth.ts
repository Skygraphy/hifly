import { useAuthStore } from '../stores/authStore';
import * as authApi from '../api/auth';

export function useAuth() {
  const { token, email, setAuth, clearAuth } = useAuthStore();

  async function loginFn(emailInput: string, password: string) {
    const res = await authApi.login(emailInput, password);
    setAuth(res.token, emailInput);
  }

  async function registerFn(emailInput: string, password: string) {
    const res = await authApi.register(emailInput, password);
    setAuth(res.token, emailInput);
  }

  function logout() {
    clearAuth();
  }

  return { isAuthenticated: !!token, email, login: loginFn, register: registerFn, logout };
}
