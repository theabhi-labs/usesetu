import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { getErrorMessage, getFieldErrors } from '../../lib/api';

const loginSchema = z.object({
  email: z.string().trim().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [generalError, setGeneralError] = React.useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const onSubmit = async (data: LoginFormValues) => {
    setGeneralError(null);
    try {
      const response = await login.mutateAsync(data);
      if (response.user.role === 'customer') {
        navigate('/portal');
      } else {
        navigate('/admin');
      }
    } catch (error: any) {
      const fieldErrors = getFieldErrors(error);
      if (fieldErrors.length > 0) {
        fieldErrors.forEach((err) => {
          setError(err.field as keyof LoginFormValues, { message: err.message });
        });
      } else {
        setGeneralError(getErrorMessage(error));
      }
    }
  };

  return (
    <div className="space-y-6 text-left">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-text-primary">Sign in to your account</h1>
        <p className="text-sm text-text-secondary mt-1">
          Or{' '}
          <Link to="/register" className="text-accent hover:text-accent-hover font-medium">
            register a new customer account
          </Link>
        </p>
      </div>

      {generalError && (
        <div className="p-3 rounded-md bg-error/10 border border-error/25 text-sm text-error font-medium">
          {generalError}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Input
          label="Email Address"
          type="email"
          placeholder="name@example.com"
          error={errors.email?.message}
          {...register('email')}
        />

        <div className="space-y-1">
          <div className="flex justify-between items-center">
            <label className="text-sm font-medium text-text-secondary select-none">Password</label>
            <Link to="/forgot-password" className="text-xs text-accent hover:text-accent-hover font-medium">
              Forgot password?
            </Link>
          </div>
          <Input
            type="password"
            placeholder="••••••••"
            error={errors.password?.message}
            {...register('password')}
          />
        </div>

        <Button type="submit" fullWidth isLoading={login.isPending} className="mt-2">
          Sign In
        </Button>
      </form>
    </div>
  );
}
