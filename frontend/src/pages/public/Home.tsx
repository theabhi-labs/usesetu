import { Link } from 'react-router-dom';
import { Button } from '../../components/ui/Button';

export function Home() {
  return (
    <div className="py-20 px-6 max-w-4xl mx-auto text-center space-y-6">
      <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl font-sans">
        Simplify Public Service Operations
      </h1>
      <p className="text-xl text-text-secondary max-w-2xl mx-auto select-none">
        A professional, secure, and integrated platform for managing digital tokens, appointments, dynamic forms, and payments.
      </p>
      <div className="flex justify-center gap-4 pt-4">
        <Link to="/login">
          <Button variant="primary" size="lg">Sign In to Dashboard</Button>
        </Link>
        <Link to="/register">
          <Button variant="outline" size="lg">Register Account</Button>
        </Link>
      </div>
    </div>
  );
}
