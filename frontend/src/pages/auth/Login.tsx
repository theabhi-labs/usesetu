import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { getErrorMessage, getFieldErrors } from '../../lib/api';
import { getTenantContext } from '../../lib/tenant';

const loginSchema = z.object({
  email: z.string().trim().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export function Login() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { login } = useAuth();
  const [generalError, setGeneralError] = React.useState<string | null>(null);

  const redirectUrl = searchParams.get('redirect');
  const tenantContext = React.useMemo(() => getTenantContext(), [searchParams]);

  const {
    register,
    handleSubmit,
    setError,
    watch,
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

      if (redirectUrl) {
        // If user was heading to /admin from root platform context, normalize to /platform
        if (tenantContext.isRootPlatform && (redirectUrl === '/admin' || redirectUrl.startsWith('/admin?'))) {
          navigate('/platform');
        } else {
          navigate(redirectUrl);
        }
      } else if (tenantContext.isRootPlatform) {
        // GOLDEN RULE: Root Platform Login always lands in /platform (Platform Dashboard)
        navigate('/platform');
      } else {
        // Tenant Context Login lands in Tenant Admin (staff/admin) or Tenant Portal (citizen customer)
        if (response.user.role === 'customer') {
          const target = tenantContext.tenantSlug ? `/portal?tenant=${tenantContext.tenantSlug}` : '/portal';
          navigate(target);
        } else {
          const target = tenantContext.tenantSlug ? `/admin?tenant=${tenantContext.tenantSlug}` : '/admin';
          navigate(target);
        }
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

  const registerTarget = redirectUrl
    ? `/register?redirect=${encodeURIComponent(redirectUrl)}`
    : tenantContext.isRootPlatform
    ? '/register?redirect=%2Fplatform'
    : '/register';

  const forgotPasswordTarget = redirectUrl
    ? `/forgot-password?redirect=${encodeURIComponent(redirectUrl)}`
    : tenantContext.isRootPlatform
    ? '/forgot-password?redirect=%2Fplatform'
    : '/forgot-password';

  return (
    <div className="space-y-6 text-left">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-text-primary">
          {tenantContext.isRootPlatform ? 'Sign in to UseSetu Platform' : 'Sign in to your account'}
        </h1>
        <p className="text-sm text-text-secondary mt-1">
          Or{' '}
          <Link to={registerTarget} className="text-accent hover:text-accent-hover font-medium">
            {tenantContext.isRootPlatform ? 'create a platform account' : 'register a new customer account'}
          </Link>
        </p>
      </div>

      {generalError && (
        <div className="p-3 rounded-md bg-error/10 border border-error/25 text-sm text-error font-medium space-y-2 text-left">
          <p>{generalError}</p>
          {generalError.includes('Please verify your email before logging in') && (
            <div className="pt-1 select-none">
              <Link
                to={`/verify-otp?email=${encodeURIComponent(watch('email') || '')}${
                  redirectUrl ? `&redirect=${encodeURIComponent(redirectUrl)}` : ''
                }`}
                className="inline-flex items-center justify-center px-3 py-1.5 text-xs font-bold text-white bg-error hover:bg-error/90 rounded-md transition-colors shadow-sm cursor-pointer"
              >
                Verify Email Now &rarr;
              </Link>
            </div>
          )}
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
            <Link to={forgotPasswordTarget} className="text-xs text-accent hover:text-accent-hover font-medium">
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
          {tenantContext.isRootPlatform ? 'Sign In to Platform' : 'Sign In'}
        </Button>
      </form>
    </div>
  );
}
