import { Outlet, Link } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

export function PublicLayout() {
  const { isAuthenticated, user } = useAuthStore();

  return (
    <div className="min-h-screen flex flex-col bg-bg text-text-primary">
      <header className="h-16 border-b border-border bg-surface flex items-center justify-between px-6 shrink-0">
        <Link to="/" className="flex items-center gap-2">
          <span className="h-8 w-8 rounded-md bg-accent flex items-center justify-center font-bold text-white select-none">C</span>
          <span className="font-bold tracking-tight text-text-primary font-sans select-none">Common Service Center</span>
        </Link>
        <nav className="flex items-center gap-4">
          <Link to="/track" className="text-sm font-medium text-text-secondary hover:text-text-primary">
            Track Application
          </Link>
          {isAuthenticated ? (
            <Link
              to={user?.role === 'customer' ? '/portal' : '/admin'}
              className="text-sm font-medium text-accent hover:underline"
            >
              Dashboard
            </Link>
          ) : (
            <Link to="/login" className="text-sm font-medium text-accent hover:underline">
              Sign In
            </Link>
          )}
        </nav>
      </header>

      <main className="flex-grow">
        <Outlet />
      </main>

      <footer className="border-t border-border bg-surface py-6 text-center text-xs text-text-tertiary select-none">
        <p>© {new Date().getFullYear()} Common Service Center OS. All rights reserved.</p>
      </footer>
    </div>
  );
}
