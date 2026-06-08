import { Link, useLocation } from 'react-router-dom';
import { UserMenu } from './UserMenu';

export function Navbar() {
  const location = useLocation();

  const navLink = (to: string, label: string) => (
    <Link
      to={to}
      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors
        ${location.pathname === to
          ? 'bg-primary/15 text-primary'
          : 'text-base-content/60 hover:text-base-content hover:bg-base-300'
        }`}
    >
      {label}
    </Link>
  );

  return (
    <header className="sticky top-0 z-40 border-b border-base-content/5 bg-base-100/80 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <Link to="/home" className="text-xl font-bold signal-text tracking-tight">HiFly</Link>
          <nav className="flex items-center gap-1">
            {navLink('/admin/upload', 'Hochladen')}
            {navLink('/admin/manage', 'Bearbeiten')}
          </nav>
        </div>
        <UserMenu />
      </div>
    </header>
  );
}
