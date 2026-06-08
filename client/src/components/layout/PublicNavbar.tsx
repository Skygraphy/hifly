import { Link } from 'react-router-dom';
import { UserMenu } from './UserMenu';

export function PublicNavbar() {
  return (
    <header className="sticky top-0 z-40 border-b border-base-content/5 bg-base-100/80 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
        <Link to="/home" className="text-xl font-bold signal-text tracking-tight">HiFly</Link>
        <UserMenu />
      </div>
    </header>
  );
}
