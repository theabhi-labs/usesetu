import * as React from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '../../hooks/useAuth';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { getErrorMessage, getFieldErrors } from '../../lib/api';
import { cn } from '../../lib/cn';

const resetPasswordSchema = z.object({
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character'),
});

type ResetPasswordValues = z.infer<typeof resetPasswordSchema>;

export function ResetPassword() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { resetPassword } = useAuth();
  const token = searchParams.get('token') || '';
  const [generalError, setGeneralError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!token) {
      setGeneralError('Invalid or expired password reset link. Please request a new one.');
    }
  }, [token]);

  const {
    register,
    handleSubmit,
    watch,
    setError,
    formState: { errors },
  } = useForm<ResetPasswordValues>({
    resolver: zodResolver(resetPasswordSchema),
  });

  const password = watch('password', '');

  // Live password requirements
  const requirements = [
    { id: 'minChar', label: 'At least 8 characters', met: password.length >= 8 },
    { id: 'upper', label: 'One uppercase letter', met: /[A-Z]/.test(password) },
    { id: 'lower', label: 'One lowercase letter', met: /[a-z]/.test(password) },
    { id: 'num', label: 'One number', met: /[0-9]/.test(password) },
    { id: 'special', label: 'One special character', met: /[^A-Za-z0-9]/.test(password) },
  ];
  const strengthScore = requirements.filter((req) => req.met).length;

  const onSubmit = async (data: ResetPasswordValues) => {
    if (!token) return;
    setGeneralError(null);
    try {
      await resetPassword.mutateAsync({ token, password: data.password });
      navigate('/login');
    } catch (err: any) {
      const fieldErrors = getFieldErrors(err);
      if (fieldErrors.length > 0) {
        fieldErrors.forEach((fe) => {
          setError(fe.field as keyof ResetPasswordValues, { message: fe.message });
        });
      } else {
        setGeneralError(getErrorMessage(err));
      }
    }
  };

  return (
    <div className="space-y-6 text-left">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-text-primary">Create new password</h1>
        <p className="text-sm text-text-secondary mt-1">
          Your new password must be different from previous passwords.
        </p>
      </div>

      {generalError && (
        <div className="p-3 rounded-md bg-error/10 border border-error/25 text-sm text-error font-medium">
          {generalError}
        </div>
      )}

      {token && (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2 text-left">
            <Input
              label="New Password"
              type="password"
              placeholder="••••••••"
              error={errors.password?.message}
              {...register('password')}
            />

            {password.length > 0 && (
              <div className="space-y-2 pt-1 text-left">
                <div className="flex gap-1 h-1.5 w-full rounded bg-border overflow-hidden">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div
                      key={i}
                      className={cn(
                        'flex-1 transition-all duration-300',
                        i < strengthScore
                          ? strengthScore <= 2
                            ? 'bg-error'
                            : strengthScore <= 4
                            ? 'bg-warning'
                            : 'bg-success'
                          : 'bg-transparent'
                      )}
                    />
                  ))}
                </div>
                <ul className="text-xs text-text-secondary space-y-1 mt-2">
                  {requirements.map((req) => (
                    <li key={req.id} className="flex items-center gap-1.5">
                      <span className={cn('h-1.5 w-1.5 rounded-full', req.met ? 'bg-success' : 'bg-text-tertiary')} />
                      <span className={req.met ? 'text-text-primary' : 'text-text-tertiary'}>{req.label}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <Button type="submit" fullWidth isLoading={resetPassword.isPending}>
            Reset password
          </Button>
        </form>
      )}

      <div className="text-center pt-2">
        <Link to="/login" className="text-sm text-accent hover:text-accent-hover font-medium select-none">
          Back to login
        </Link>
      </div>
    </div>
  );
}
