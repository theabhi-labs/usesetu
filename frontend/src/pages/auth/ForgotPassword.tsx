import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { getErrorMessage } from '../../lib/api';
import { getTenantContext } from '../../lib/tenant';

const forgotPasswordSchema = z.object({
  email: z.string().trim().email('Invalid email address'),
});

type ForgotPasswordValues = z.infer<typeof forgotPasswordSchema>;

export function ForgotPassword() {
  const [searchParams] = useSearchParams();
  const { forgotPassword } = useAuth();
  const [success, setSuccess] = React.useState(false);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);

  const redirectUrl = searchParams.get('redirect');
  const tenantContext = React.useMemo(() => getTenantContext(), [searchParams]);

  const loginTarget = redirectUrl
    ? `/login?redirect=${encodeURIComponent(redirectUrl)}`
    : tenantContext.isRootPlatform
    ? '/login?redirect=%2Fplatform'
    : '/login';

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordValues>({
    resolver: zodResolver(forgotPasswordSchema),
  });

  const onSubmit = async (data: ForgotPasswordValues) => {
    setErrorMsg(null);
    try {
      await forgotPassword.mutateAsync(data);
      setSuccess(true);
    } catch (err: any) {
      setErrorMsg(getErrorMessage(err));
    }
  };

  if (success) {
    return (
      <div className="space-y-6 text-left select-none">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-text-primary">Check your email</h1>
          <p className="text-sm text-text-secondary mt-2 leading-relaxed">
            If an account exists with that email, we have sent instructions to reset your password.
          </p>
        </div>
        <Link to={loginTarget} className="block w-full">
          <Button variant="secondary" fullWidth>
            Back to sign in
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 text-left">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-text-primary">Reset your password</h1>
        <p className="text-sm text-text-secondary mt-1">
          Enter your email address and we will send you a reset link.
        </p>
      </div>

      {errorMsg && (
        <div className="p-3 rounded-md bg-error/10 border border-error/25 text-sm text-error font-medium">
          {errorMsg}
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

        <Button type="submit" fullWidth isLoading={forgotPassword.isPending}>
          Send reset link
        </Button>
      </form>

      <div className="text-center pt-2">
        <Link to={loginTarget} className="text-sm text-accent hover:text-accent-hover font-medium select-none">
          Back to login
        </Link>
      </div>
    </div>
  );
}
