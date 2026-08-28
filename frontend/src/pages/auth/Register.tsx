import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { getErrorMessage, getFieldErrors } from '../../lib/api';
import { cn } from '../../lib/cn';
import { getTenantContext } from '../../lib/tenant';

const registerSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(100),
  email: z.string().trim().email('Invalid email address'),
  mobile: z.string().regex(/^[6-9]\d{9}$/, 'Invalid Indian mobile number (10 digits starting with 6-9)'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character'),
});

type RegisterFormValues = z.infer<typeof registerSchema>;

export function Register() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { register: registerUser } = useAuth();
  const [generalError, setGeneralError] = React.useState<string | null>(null);

  const redirectUrl = searchParams.get('redirect');
  const tenantContext = React.useMemo(() => getTenantContext(searchParams.toString()), [searchParams]);

  const {
    register,
    handleSubmit,
    watch,
    setError,
    formState: { errors },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: '',
      email: '',
      mobile: '',
      password: '',
    },
  });

  const password = watch('password', '');

  // Live password strength calculation
  const getPasswordRequirements = (val: string) => {
    return [
      { id: 'minChar', label: 'At least 8 characters', met: val.length >= 8 },
      { id: 'upper', label: 'One uppercase letter', met: /[A-Z]/.test(val) },
      { id: 'lower', label: 'One lowercase letter', met: /[a-z]/.test(val) },
      { id: 'num', label: 'One number', met: /[0-9]/.test(val) },
      { id: 'special', label: 'One special character', met: /[^A-Za-z0-9]/.test(val) },
    ];
  };

  const requirements = getPasswordRequirements(password);
  const strengthScore = requirements.filter((req) => req.met).length;

  const tenantPrefix = tenantContext.tenantSlug ? `tenant=${encodeURIComponent(tenantContext.tenantSlug)}&` : '';
  const tenantOnly = tenantContext.tenantSlug ? `?tenant=${encodeURIComponent(tenantContext.tenantSlug)}` : '';

  const onSubmit = async (data: RegisterFormValues) => {
    setGeneralError(null);
    try {
      await registerUser.mutateAsync(data);
      const tenantArg = tenantContext.tenantSlug ? `&tenant=${encodeURIComponent(tenantContext.tenantSlug)}` : '';
      const target = `/verify-otp?email=${encodeURIComponent(data.email)}${tenantArg}${
        redirectUrl ? `&redirect=${encodeURIComponent(redirectUrl)}` : tenantContext.isRootPlatform ? '&redirect=%2Fplatform' : ''
      }`;
      navigate(target);
    } catch (error: any) {
      const fieldErrors = getFieldErrors(error);
      if (fieldErrors.length > 0) {
        fieldErrors.forEach((err) => {
          setError(err.field as keyof RegisterFormValues, { message: err.message });
        });
      } else {
        setGeneralError(getErrorMessage(error));
      }
    }
  };

  const loginTarget = redirectUrl
    ? `/login?${tenantPrefix}redirect=${encodeURIComponent(redirectUrl)}`
    : tenantContext.isRootPlatform
    ? '/login?redirect=%2Fplatform'
    : `/login${tenantOnly}`;

  return (
    <div className="space-y-6 text-left">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-text-primary">
          {tenantContext.isRootPlatform ? 'Create a Platform Account' : 'Create an Account'}
        </h1>
        <p className="text-sm text-text-secondary mt-1">
          Already have an account?{' '}
          <Link to={loginTarget} className="text-accent hover:text-accent-hover font-medium">
            Sign in
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
          label="Full Name"
          placeholder="John Doe"
          error={errors.name?.message}
          {...register('name')}
        />

        <Input
          label="Email Address"
          type="email"
          placeholder="name@example.com"
          error={errors.email?.message}
          {...register('email')}
        />

        <Input
          label="Mobile Number (Indian)"
          placeholder="e.g. 9876543210"
          error={errors.mobile?.message}
          {...register('mobile')}
        />

        <div className="space-y-2">
          <Input
            label="Password"
            type="password"
            placeholder="••••••••"
            error={errors.password?.message}
            {...register('password')}
          />

          {/* Password strength visual meter */}
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

        <Button type="submit" fullWidth isLoading={registerUser.isPending} className="mt-2">
          Register Account
        </Button>
      </form>
    </div>
  );
}
