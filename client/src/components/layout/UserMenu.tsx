import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

function getInitials(email: string): string {
  const name = email.split('@')[0];
  const parts = name.split(/[._-]/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

const ROLE_LABELS: Record<string, string> = {
  user: 'Benutzer',
  admin: 'Admin',
  super_admin: 'Super-Admin',
};

const ROLE_COLORS: Record<string, string> = {
  user: 'text-base-content/50',
  admin: 'text-primary',
  super_admin: 'text-warning',
};

function MenuItem({ to, onClick, children }: { to?: string; onClick?: () => void; children: React.ReactNode }) {
  const base = 'flex items-center gap-2.5 px-4 py-2.5 text-sm text-base-content/70 hover:text-base-content hover:bg-base-300/60 transition-colors w-full text-left';
  if (to) return <Link to={to} onClick={onClick} className={base}>{children}</Link>;
  return <button onClick={onClick} className={base}>{children}</button>;
}

export function UserMenu() {
  const { isAuthenticated, email, role, isAdmin, isSuperAdmin, logout } = useAuth();
  const [open, setOpen] = useState<null | 'gear' | 'avatar'>(null);
  const ref = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(null);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const toggle = (menu: 'gear' | 'avatar') =>
    setOpen((prev) => (prev === menu ? null : menu));

  const close = () => setOpen(null);
  const initials = email ? getInitials(email) : '??';
  const showGear = !isAuthenticated || isAdmin;

  return (
    <div ref={ref} className="flex items-center gap-1.5">

      {/* ── Gear button ── */}
      {showGear && (
        <div className="relative">
          <button
            onClick={() => toggle('gear')}
            title="Einstellungen"
            className={`w-9 h-9 rounded-lg flex items-center justify-center transition-all duration-150
              ${open === 'gear'
                ? 'bg-primary/15 text-primary'
                : 'text-base-content/40 hover:text-base-content hover:bg-base-300'
              }`}
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round"
                d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28Z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
            </svg>
          </button>

          {open === 'gear' && (
            <div className="absolute right-0 top-full mt-2 w-52 bg-base-200 border border-base-content/10 rounded-2xl shadow-2xl overflow-hidden z-50">
              {!isAuthenticated ? (
                <MenuItem to="/login" onClick={close}>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15m3 0 3-3m0 0-3-3m3 3H9" />
                  </svg>
                  Anmelden
                </MenuItem>
              ) : isAdmin && (
                <>
                  <div className="px-4 pt-3 pb-1">
                    <p className="text-xs font-semibold text-base-content/30 uppercase tracking-wider">Administration</p>
                  </div>
                  <MenuItem to="/admin/upload" onClick={close}>
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                    </svg>
                    Hochladen
                  </MenuItem>
                  <MenuItem to="/admin/manage" onClick={close}>
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3 3h18M3 21h18" />
                    </svg>
                    Bearbeiten
                  </MenuItem>
                  {isSuperAdmin && (
                    <>
                      <div className="border-t border-base-content/8 mx-2 my-1" />
                      <MenuItem to="/admin/users" onClick={close}>
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
                        </svg>
                        User
                      </MenuItem>
                      <MenuItem to="/admin/regions" onClick={close}>
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 6.75V15m6-6v8.25m.503 3.498l4.875-2.437c.381-.19.622-.58.622-1.006V4.82c0-.836-.88-1.38-1.628-1.006l-3.869 1.934c-.317.159-.69.159-1.006 0L9.503 3.252a1.125 1.125 0 00-1.006 0L3.622 5.689C3.24 5.88 3 6.27 3 6.695V19.18c0 .836.88 1.38 1.628 1.006l3.869-1.934c.317-.159.69-.159 1.006 0l4.994 2.497c.317.158.69.158 1.006 0z" />
                        </svg>
                        Regionen
                      </MenuItem>
                      <MenuItem to="/admin/settings" onClick={close}>
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 010 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 010-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28Z" />
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        Einstellungen
                      </MenuItem>
                      <MenuItem to="/admin/sync" onClick={close}>
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
                        </svg>
                        Datenabgleich
                      </MenuItem>
                    </>
                  )}
                  <div className="pb-1" />
                </>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Avatar button ── */}
      {isAuthenticated && (
        <div className="relative">
          <button
            onClick={() => toggle('avatar')}
            title={email ?? undefined}
            className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-150 hover:scale-105 hover:shadow-lg"
            style={{
              background: 'linear-gradient(135deg, #FF6B6B, #FF8E53, #FFAD3B)',
              color: '#0d0d18',
              boxShadow: open === 'avatar' ? '0 0 0 2px rgba(255,142,83,0.5)' : undefined,
            }}
          >
            {initials}
          </button>

          {open === 'avatar' && (
            <div className="absolute right-0 top-full mt-2 w-60 bg-base-200 border border-base-content/10 rounded-2xl shadow-2xl overflow-hidden z-50">
              {/* User header */}
              <div className="px-4 py-3 border-b border-base-content/8">
                <p className="text-sm font-medium text-base-content truncate">{email}</p>
                <span className={`text-xs font-medium ${ROLE_COLORS[role ?? 'user']}`}>
                  {ROLE_LABELS[role ?? 'user']}
                </span>
              </div>

              <div className="py-1">
                <MenuItem to="/account" onClick={close}>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17.982 18.725A7.488 7.488 0 0012 15.75a7.488 7.488 0 00-5.982 2.975m11.963 0a9 9 0 10-11.963 0m11.963 0A8.966 8.966 0 0112 21a8.966 8.966 0 01-5.982-2.275M15 9.75a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  Konto verwalten
                </MenuItem>

                <div className="border-t border-base-content/8 mx-2 my-1" />

                <MenuItem onClick={() => { logout(); close(); navigate('/home'); }}>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
                  </svg>
                  <span className="text-error/80">Abmelden</span>
                </MenuItem>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
