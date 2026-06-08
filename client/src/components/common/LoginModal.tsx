import { useState, FormEvent } from 'react';
import { useAuth } from '../../hooks/useAuth';

interface LoginModalProps {
  onClose: () => void;
  onSuccess: () => void;
  message?: string;
}

export function LoginModal({ onClose, onSuccess, message }: LoginModalProps) {
  const { login, register } = useAuth();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (mode === 'login') await login(email, password);
      else await register(email, password);
      onSuccess();
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
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-base-200 border border-base-content/10 rounded-2xl shadow-2xl w-full max-w-sm mx-4 p-7"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between mb-5">
          <div>
            <h3 className="text-lg font-semibold text-base-content">
              {mode === 'login' ? 'Anmelden' : 'Registrieren'}
            </h3>
            {message && (
              <p className="text-sm text-base-content/50 mt-1">{message}</p>
            )}
          </div>
          <button onClick={onClose} className="btn btn-ghost btn-sm btn-circle text-base-content/40">✕</button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs text-base-content/50 block mb-1">E-Mail</label>
            <input
              type="email" value={email} onChange={(e) => setEmail(e.target.value)}
              required autoComplete="email"
              className="input input-bordered input-sm w-full bg-base-300"
            />
          </div>
          <div>
            <label className="text-xs text-base-content/50 block mb-1">Passwort</label>
            <input
              type="password" value={password} onChange={(e) => setPassword(e.target.value)}
              required minLength={mode === 'register' ? 8 : 1}
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              className="input input-bordered input-sm w-full bg-base-300"
            />
          </div>

          {error && (
            <div className="p-2.5 bg-error/10 border border-error/20 rounded-lg text-xs text-error">{error}</div>
          )}

          <button type="submit" disabled={loading} className="btn btn-primary btn-sm w-full">
            {loading ? <span className="loading loading-spinner loading-xs" /> : null}
            {mode === 'login' ? 'Anmelden' : 'Konto erstellen'}
          </button>
        </form>

        <button
          onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(''); }}
          className="mt-4 w-full text-center text-xs text-base-content/30 hover:text-primary transition-colors"
        >
          {mode === 'login' ? 'Noch kein Konto? Registrieren' : 'Bereits registriert? Anmelden'}
        </button>
      </div>
    </div>
  );
}
