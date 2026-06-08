import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../api/client';
import { useAuth } from '../hooks/useAuth';

interface UserRecord {
  id: string;
  email: string;
  role: 'user' | 'admin' | 'super_admin';
  created_at: string;
}

const ROLE_LABELS: Record<string, string> = {
  user: 'User',
  admin: 'Admin',
  super_admin: 'Super-Admin',
};

async function fetchUsers(): Promise<UserRecord[]> {
  const { data } = await apiClient.get('/users');
  return data.data;
}

async function updateRole(id: string, role: 'user' | 'admin'): Promise<void> {
  await apiClient.patch(`/users/${id}/role`, { role });
}

export function AdminUsersPage() {
  const { email: currentEmail } = useAuth();
  const queryClient = useQueryClient();
  const [error, setError] = useState('');

  const { data: users, isLoading } = useQuery({ queryKey: ['users'], queryFn: fetchUsers });

  const mutation = useMutation({
    mutationFn: ({ id, role }: { id: string; role: 'user' | 'admin' }) => updateRole(id, role),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['users'] }),
    onError: () => setError('Rolle konnte nicht geändert werden'),
  });

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold signal-text">User-Verwaltung</h1>
        <p className="text-base-content/40 text-sm mt-1">
          Registrierte User und deren Rollen verwalten.
        </p>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-error/10 border border-error/20 rounded-lg text-sm text-error">{error}</div>
      )}

      {isLoading ? (
        <div className="flex justify-center py-12">
          <span className="loading loading-spinner loading-lg text-primary" />
        </div>
      ) : (
        <div className="bg-base-200 border border-base-content/8 rounded-2xl overflow-hidden">
          <table className="table w-full">
            <thead>
              <tr className="border-base-content/8">
                <th className="text-base-content/50 font-medium text-xs uppercase tracking-wider">E-Mail</th>
                <th className="text-base-content/50 font-medium text-xs uppercase tracking-wider">Registriert</th>
                <th className="text-base-content/50 font-medium text-xs uppercase tracking-wider">Rolle</th>
              </tr>
            </thead>
            <tbody>
              {(users ?? []).map((user) => {
                const isSelf = user.email === currentEmail;
                const isSuperAdmin = user.role === 'super_admin';
                return (
                  <tr key={user.id} className="border-base-content/5 hover:bg-base-300/30">
                    <td>
                      <span className="text-sm text-base-content">{user.email}</span>
                      {isSelf && (
                        <span className="ml-2 text-xs text-primary/60">(du)</span>
                      )}
                    </td>
                    <td className="text-xs text-base-content/40">
                      {new Date(user.created_at).toLocaleDateString('de')}
                    </td>
                    <td>
                      {isSuperAdmin || isSelf ? (
                        <span className={`badge badge-sm ${isSuperAdmin ? 'badge-primary' : 'badge-ghost'}`}>
                          {ROLE_LABELS[user.role]}
                        </span>
                      ) : (
                        <select
                          value={user.role}
                          onChange={(e) => mutation.mutate({ id: user.id, role: e.target.value as 'user' | 'admin' })}
                          className="select select-xs select-bordered bg-base-300"
                          disabled={mutation.isPending}
                        >
                          <option value="user">User</option>
                          <option value="admin">Admin</option>
                        </select>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {(users ?? []).length === 0 && (
            <p className="text-center text-base-content/30 text-sm py-8">Keine User gefunden</p>
          )}
        </div>
      )}
    </div>
  );
}
