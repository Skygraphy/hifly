import { useState, FormEvent } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export function LoginPage() {
  const { isAuthenticated, login, register } = useAuth();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (isAuthenticated) return <Navigate to="/gallery" replace />;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (mode === 'login') {
        await login(email, password);
      } else {
        await register(email, password);
      }
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
    <div className="min-h-screen bg-base-100 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold signal-text tracking-tight">HiFly</h1>
          <p className="text-base-content/40 text-sm mt-2">Professionelle Bildverwaltung</p>
        </div>

        {/* Card */}
        <div className="bg-base-200 border border-base-content/8 rounded-2xl p-8 shadow-2xl">
          <h2 className="text-lg font-semibold text-base-content mb-6">
            {mode === 'login' ? 'Anmelden' : 'Registrieren'}
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-sm text-base-content/60 block mb-1">E-Mail</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="input input-bordered w-full bg-base-300 focus:border-primary"
                placeholder="name@example.com"
              />
            </div>
            <div>
              <label className="text-sm text-base-content/60 block mb-1">Passwort</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={mode === 'register' ? 8 : 1}
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                className="input input-bordered w-full bg-base-300 focus:border-primary"
                placeholder={mode === 'register' ? 'Mindestens 8 Zeichen' : ''}
              />
            </div>

            {error && (
              <div className="p-3 bg-error/10 border border-error/20 rounded-lg text-sm text-error">
                {error}
              </div>
            )}

            <button type="submit" disabled={loading} className="btn btn-primary w-full mt-2">
              {loading ? <span className="loading loading-spinner loading-sm" /> : null}
              {mode === 'login' ? 'Anmelden' : 'Konto erstellen'}
            </button>
          </form>

          <div className="mt-4 text-center">
            <button
              onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(''); }}
              className="text-sm text-base-content/40 hover:text-primary transition-colors"
            >
              {mode === 'login' ? 'Noch kein Konto? Registrieren' : 'Bereits registriert? Anmelden'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
