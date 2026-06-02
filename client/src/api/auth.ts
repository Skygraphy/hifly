import { apiClient } from './client';

export interface AuthResponse {
  token: string;
  expiresAt: string;
}

export async function login(email: string, password: string): Promise<AuthResponse> {
  const { data } = await apiClient.post('/auth/login', { email, password });
  return data.data;
}

export async function register(email: string, password: string): Promise<AuthResponse> {
  const { data } = await apiClient.post('/auth/register', { email, password });
  return data.data;
}
