import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { Navbar } from './Navbar';

interface AppShellProps {
  require?: 'admin' | 'super_admin';
}

export function AppShell({ require: requireRole }: AppShellProps) {
  const { isAuthenticated, isAdmin, isSuperAdmin } = useAuth();

  if (!isAuthenticated) return <Navigate to="/login" replace />;

  if (requireRole === 'admin' && !isAdmin) return <Navigate to="/gallery" replace />;
  if (requireRole === 'super_admin' && !isSuperAdmin) return <Navigate to="/gallery" replace />;

  return (
    <div className="min-h-screen bg-base-100">
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 py-6">
        <Outlet />
      </main>
    </div>
  );
}
