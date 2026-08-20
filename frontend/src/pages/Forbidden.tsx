import { Link } from 'react-router-dom';
import { Button } from '../components/ui/Button';

export function Forbidden() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center space-y-4 bg-bg text-text-primary">
      <h1 className="text-6xl font-bold font-mono text-error select-none">403</h1>
      <h2 className="text-xl font-semibold select-none">Access Denied</h2>
      <p className="text-text-secondary max-w-sm select-none">
        You do not have permission to view this page. If you believe this is an error, please contact your administrator.
      </p>
      <Link to="/" className="pt-4">
        <Button variant="secondary">Go back home</Button>
      </Link>
    </div>
  );
}
