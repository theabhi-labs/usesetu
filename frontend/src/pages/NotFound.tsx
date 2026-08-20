import { Link } from 'react-router-dom';
import { Button } from '../components/ui/Button';

export function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center space-y-4 bg-bg text-text-primary">
      <h1 className="text-6xl font-bold font-mono text-text-secondary select-none">404</h1>
      <h2 className="text-xl font-semibold select-none">Page Not Found</h2>
      <p className="text-text-secondary max-w-sm select-none">
        The page you are looking for does not exist or has been moved.
      </p>
      <Link to="/" className="pt-4">
        <Button variant="secondary">Go back home</Button>
      </Link>
    </div>
  );
}
