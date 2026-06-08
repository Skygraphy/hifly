import { useState, FormEvent } from 'react';
import { useAuth } from '../hooks/useAuth';
import { apiClient } from '../api/client';

const ROLE_LABELS: Record<string, string> = {
  user: 'Benutzer',
  admin: 'Admin',
  super_admin: 'Super-Admin',
};

export function AccountPage() {
  const { email, role } = useAuth();
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (newPw !== confirmPw) {
      setError('Die neuen Passwörter stimmen nicht überein');
      return;
    }
    if (newPw.length < 8) {
      setError('Das neue Passwort muss mindestens 8 Zeichen lang sein');
      return;
    }

    setLoading(true);
    try {
      await apiClient.patch('/auth/password', { currentPassword: currentPw, newPassword: newPw });
      setSuccess('Passwort erfolgreich geändert');
      setCurrentPw('');
      setNewPw('');
      setConfirmPw('');
    } catch (err: unknown) {
      const msg = err && typeof err === 'object' && 'response' in err
        ? (err as { response?: { data?: { error?: string } } }).response?.data?.error
        : undefined;
      setError(msg ?? 'Ein Fehler ist aufgetreten');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-md mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold signal-text">Konto</h1>
        <p className="text-base-content/40 text-sm mt-1">Deine Kontoinformationen und Einstellungen.</p>
      </div>

      {/* Account info */}
      <div className="bg-base-200 border border-base-content/8 rounded-2xl p-5 mb-6">
        <h2 className="text-xs font-semibold text-base-content/40 uppercase tracking-wider mb-4">Kontodaten</h2>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-base-content/60">E-Mail</span>
            <span className="text-sm font-medium text-base-content">{email}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-base-content/60">Rolle</span>
            <span className={`text-sm font-medium ${
              role === 'super_admin' ? 'text-warning' :
              role === 'admin' ? 'text-primary' :
              'text-base-content/60'
            }`}>
              {ROLE_LABELS[role ?? 'user']}
            </span>
          </div>
        </div>
      </div>

      {/* Change password */}
      <div className="bg-base-200 border border-base-content/8 rounded-2xl p-5">
        <h2 className="text-xs font-semibold text-base-content/40 uppercase tracking-wider mb-4">Passwort ändern</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs text-base-content/50 block mb-1">Aktuelles Passwort</label>
            <input
              type="password"
              value={currentPw}
              onChange={(e) => setCurrentPw(e.target.value)}
              required
              autoComplete="current-password"
              className="input input-bordered input-sm w-full bg-base-300"
            />
          </div>
          <div>
            <label className="text-xs text-base-content/50 block mb-1">Neues Passwort</label>
            <input
              type="password"
              value={newPw}
              onChange={(e) => setNewPw(e.target.value)}
              required
              minLength={8}
              autoComplete="new-password"
              placeholder="Mindestens 8 Zeichen"
              className="input input-bordered input-sm w-full bg-base-300"
            />
          </div>
          <div>
            <label className="text-xs text-base-content/50 block mb-1">Neues Passwort bestätigen</label>
            <input
              type="password"
              value={confirmPw}
              onChange={(e) => setConfirmPw(e.target.value)}
              required
              autoComplete="new-password"
              className="input input-bordered input-sm w-full bg-base-300"
            />
          </div>

          {error && (
            <div className="p-3 bg-error/10 border border-error/20 rounded-lg text-sm text-error">{error}</div>
          )}
          {success && (
            <div className="p-3 bg-success/10 border border-success/20 rounded-lg text-sm text-success">{success}</div>
          )}

          <button type="submit" disabled={loading} className="btn btn-primary btn-sm w-full">
            {loading ? <span className="loading loading-spinner loading-xs" /> : null}
            Passwort ändern
          </button>
        </form>
      </div>
    </div>
  );
}
