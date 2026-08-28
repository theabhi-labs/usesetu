import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useAuthStore } from '../../store/authStore';
import { authApi } from '../../services/auth.api';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { getErrorMessage, getFieldErrors } from '../../lib/api';
import { getTenantContext } from '../../lib/tenant';
import { ShieldCheck, Mail, Smartphone, QrCode, KeyRound, ArrowLeft, RotateCw } from 'lucide-react';

const loginSchema = z.object({
  email: z.string().trim().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export function Login() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { login } = useAuth();
  const setSession = useAuthStore((state) => state.setSession);
  const [generalError, setGeneralError] = React.useState<string | null>(null);

  // 2FA Challenge State
  const [twoFactorRequired, setTwoFactorRequired] = React.useState(false);
  const [twoFactorData, setTwoFactorData] = React.useState<{
    token: string;
    method: 'email' | 'mobile' | 'authenticator';
    emailMasked?: string;
    mobileMasked?: string;
  } | null>(null);
  const [twoFactorCode, setTwoFactorCode] = React.useState('');
  const [isBackupCodeMode, setIsBackupCodeMode] = React.useState(false);
  const [twoFactorLoading, setTwoFactorLoading] = React.useState(false);
  const [resendingCode, setResendingCode] = React.useState(false);
  const [resendSuccess, setResendSuccess] = React.useState<string | null>(null);

  const redirectUrl = searchParams.get('redirect');
  const tenantContext = React.useMemo(() => getTenantContext(searchParams.toString()), [searchParams]);

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

  const handleSuccessfulNavigation = (userRole: string) => {
    if (userRole === 'super_admin' && (!redirectUrl || redirectUrl === '/platform/create-app' || redirectUrl === '/platform')) {
      navigate('/platform/super-admin');
      return;
    }

    if (redirectUrl) {
      if (tenantContext.isRootPlatform && (redirectUrl === '/admin' || redirectUrl.startsWith('/admin?'))) {
        navigate('/platform');
      } else {
        navigate(redirectUrl);
      }
    } else if (tenantContext.isRootPlatform) {
      navigate('/platform');
    } else {
      if (userRole === 'customer') {
        const target = tenantContext.tenantSlug ? `/portal?tenant=${tenantContext.tenantSlug}` : '/portal';
        navigate(target);
      } else {
        const target = tenantContext.tenantSlug ? `/admin?tenant=${tenantContext.tenantSlug}` : '/admin';
        navigate(target);
      }
    }
  };

  const onSubmit = async (data: LoginFormValues) => {
    setGeneralError(null);
    try {
      const response = await login.mutateAsync(data);

      if (response.requires2FA && response.twoFactorToken) {
        setTwoFactorRequired(true);
        setTwoFactorData({
          token: response.twoFactorToken,
          method: response.twoFactorMethod || 'authenticator',
          emailMasked: response.emailMasked,
          mobileMasked: response.mobileMasked,
        });
        setTwoFactorCode('');
        return;
      }

      if (response.user && response.accessToken) {
        handleSuccessfulNavigation(response.user.role);
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

  const handle2FASubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!twoFactorData?.token || !twoFactorCode.trim()) {
      setGeneralError('Please enter your verification code');
      return;
    }

    setGeneralError(null);
    setTwoFactorLoading(true);

    try {
      const response = await authApi.verify2FA({
        twoFactorToken: twoFactorData.token,
        code: twoFactorCode.trim(),
        isBackupCode: isBackupCodeMode,
      });

      if (response.user && response.accessToken) {
        setSession(response.user, response.accessToken);
        handleSuccessfulNavigation(response.user.role);
      }
    } catch (error: any) {
      setGeneralError(getErrorMessage(error));
    } finally {
      setTwoFactorLoading(false);
    }
  };

  const handleResend2FACode = async () => {
    if (!twoFactorData?.token) return;
    setResendingCode(true);
    setGeneralError(null);
    setResendSuccess(null);

    try {
      const res = await authApi.resend2FACode(twoFactorData.token);
      setResendSuccess(res.message || 'Verification code resent!');
      setTimeout(() => setResendSuccess(null), 4000);
    } catch (error: any) {
      setGeneralError(getErrorMessage(error));
    } finally {
      setResendingCode(false);
    }
  };

  const tenantPrefix = tenantContext.tenantSlug ? `tenant=${encodeURIComponent(tenantContext.tenantSlug)}&` : '';
  const tenantOnly = tenantContext.tenantSlug ? `?tenant=${encodeURIComponent(tenantContext.tenantSlug)}` : '';

  const registerTarget = redirectUrl
    ? `/register?${tenantPrefix}redirect=${encodeURIComponent(redirectUrl)}`
    : tenantContext.isRootPlatform
    ? '/register?redirect=%2Fplatform'
    : `/register${tenantOnly}`;

  const forgotPasswordTarget = redirectUrl
    ? `/forgot-password?${tenantPrefix}redirect=${encodeURIComponent(redirectUrl)}`
    : tenantContext.isRootPlatform
    ? '/forgot-password?redirect=%2Fplatform'
    : `/forgot-password${tenantOnly}`;

  // ---------------------------------------------------------------------------
  // 2FA CHALLENGE VIEW
  // ---------------------------------------------------------------------------
  if (twoFactorRequired && twoFactorData) {
    return (
      <div className="space-y-6 text-left animate-in fade-in duration-200">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <div className="p-2 rounded-xl bg-accent/15 text-accent border border-accent/25">
              {twoFactorData.method === 'authenticator' && <QrCode className="w-5 h-5" />}
              {twoFactorData.method === 'email' && <Mail className="w-5 h-5" />}
              {twoFactorData.method === 'mobile' && <Smartphone className="w-5 h-5" />}
            </div>
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-accent">
              Two-Factor Authentication
            </span>
          </div>

          <h1 className="text-2xl font-bold tracking-tight text-text-primary">
            {isBackupCodeMode ? 'Enter Backup Recovery Code' : 'Verify Your Identity'}
          </h1>
          <p className="text-xs text-text-secondary mt-1 leading-relaxed">
            {isBackupCodeMode ? (
              'Enter one of the 8-character backup recovery codes generated when 2FA was set up.'
            ) : twoFactorData.method === 'authenticator' ? (
              'Enter the 6-digit verification code from your Google Authenticator or Microsoft Authenticator app.'
            ) : twoFactorData.method === 'email' ? (
              `Enter the 6-digit verification code sent to ${twoFactorData.emailMasked || 'your email'}.`
            ) : (
              `Enter the 6-digit verification code sent to ${twoFactorData.mobileMasked || 'your mobile number'}.`
            )}
          </p>
        </div>

        {generalError && (
          <div className="p-3 rounded-lg bg-error/10 border border-error/25 text-xs text-error font-medium text-left">
            <p>{generalError}</p>
          </div>
        )}

        {resendSuccess && (
          <div className="p-3 rounded-lg bg-success/15 border border-success/30 text-xs text-success font-medium text-left">
            <p>{resendSuccess}</p>
          </div>
        )}

        <form onSubmit={handle2FASubmit} className="space-y-5">
          <div className="space-y-2">
            <label className="block text-xs font-bold text-text-primary uppercase tracking-wider font-mono">
              {isBackupCodeMode ? 'Backup Code (XXXX-XXXX)' : '6-Digit Security Code'}
            </label>
            <Input
              type="text"
              maxLength={isBackupCodeMode ? 10 : 6}
              value={twoFactorCode}
              onChange={(e) =>
                setTwoFactorCode(
                  isBackupCodeMode ? e.target.value.toUpperCase() : e.target.value.replace(/\D/g, '')
                )
              }
              placeholder={isBackupCodeMode ? 'A1B2-C3D4' : '000000'}
              className={`text-center font-mono font-bold h-14 ${
                isBackupCodeMode ? 'text-lg tracking-widest' : 'text-2xl tracking-[8px]'
              }`}
              autoFocus
              required
            />
          </div>

          <Button type="submit" fullWidth isLoading={twoFactorLoading} className="gap-2 shadow-md shadow-accent/20">
            <ShieldCheck className="w-4 h-4" />
            <span>Verify & Continue</span>
          </Button>

          {/* Helper links */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-2 pt-2 text-xs">
            {twoFactorData.method !== 'authenticator' && !isBackupCodeMode && (
              <button
                type="button"
                onClick={handleResend2FACode}
                disabled={resendingCode}
                className="inline-flex items-center gap-1 text-accent hover:text-accent-hover font-semibold cursor-pointer"
              >
                <RotateCw className={`w-3.5 h-3.5 ${resendingCode ? 'animate-spin' : ''}`} />
                <span>Resend Code</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                setIsBackupCodeMode(!isBackupCodeMode);
                setTwoFactorCode('');
                setGeneralError(null);
              }}
              className="inline-flex items-center gap-1 text-text-secondary hover:text-text-primary cursor-pointer font-medium"
            >
              <KeyRound className="w-3.5 h-3.5" />
              <span>{isBackupCodeMode ? 'Use 2FA Code instead' : 'Use Backup Code'}</span>
            </button>
          </div>

          <div className="border-t border-border pt-4 text-center">
            <button
              type="button"
              onClick={() => {
                setTwoFactorRequired(false);
                setTwoFactorData(null);
                setGeneralError(null);
              }}
              className="inline-flex items-center gap-1.5 text-xs text-text-tertiary hover:text-text-primary cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to login</span>
            </button>
          </div>
        </form>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // STANDARD LOGIN VIEW
  // ---------------------------------------------------------------------------
  return (
    <div className="space-y-6 text-left">
      <div>
        <h1 className="text-2xl font-black tracking-tight text-text-primary">
          {tenantContext.isRootPlatform ? 'Welcome to UseSetu' : 'Welcome Back'}
        </h1>
        <p className="text-xs text-text-secondary mt-1">
          {tenantContext.isRootPlatform
            ? 'Enter your credentials to manage digital service centers & control planes.'
            : 'Sign in to track your service requests and citizen documents.'}
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
