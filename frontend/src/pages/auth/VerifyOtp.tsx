import * as React from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { Button } from '../../components/ui/Button';
import { getErrorMessage } from '../../lib/api';
import { getTenantContext } from '../../lib/tenant';

export function VerifyOtp() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { verifyOtp, resendOtp } = useAuth();

  const email = searchParams.get('email') || '';
  const [otp, setOtp] = React.useState<string[]>(Array(6).fill(''));
  const [cooldown, setCooldown] = React.useState(30);
  const [generalError, setGeneralError] = React.useState<string | null>(null);

  const inputRefs = React.useRef<HTMLInputElement[]>([]);

  React.useEffect(() => {
    if (!email) {
      navigate('/login');
    }
  }, [email, navigate]);

  React.useEffect(() => {
    if (cooldown === 0) return;
    const timer = setInterval(() => {
      setCooldown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  const handleChange = (value: string, index: number) => {
    if (isNaN(Number(value))) return;
    const newOtp = [...otp];
    newOtp[index] = value.substring(value.length - 1);
    setOtp(newOtp);

    // Auto-advance
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      const newOtp = [...otp];
      newOtp[index - 1] = '';
      setOtp(newOtp);
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasteData = e.clipboardData.getData('text').trim();
    if (pasteData.length === 6 && !isNaN(Number(pasteData))) {
      const pasteOtp = pasteData.split('');
      setOtp(pasteOtp);
      inputRefs.current[5]?.focus();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setGeneralError(null);
    const otpCode = otp.join('');
    if (otpCode.length !== 6) {
      setGeneralError('Please enter the full 6-digit OTP code.');
      return;
    }

    try {
      const response = await verifyOtp.mutateAsync({ email, otp: otpCode });
      const params = new URLSearchParams(window.location.search);
      const redirectUrl = params.get('redirect');
      const tenantContext = getTenantContext();

      if (redirectUrl) {
        if (tenantContext.isRootPlatform && (redirectUrl === '/admin' || redirectUrl.startsWith('/admin?'))) {
          navigate('/platform');
        } else {
          navigate(redirectUrl);
        }
      } else if (tenantContext.isRootPlatform) {
        navigate('/platform');
      } else {
        if (response.user.role === 'customer') {
          navigate(tenantContext.tenantSlug ? `/portal?tenant=${tenantContext.tenantSlug}` : '/portal');
        } else {
          navigate(tenantContext.tenantSlug ? `/admin?tenant=${tenantContext.tenantSlug}` : '/admin');
        }
      }
    } catch (err: any) {
      setGeneralError(getErrorMessage(err));
    }
  };

  const handleResend = async () => {
    setGeneralError(null);
    try {
      await resendOtp.mutateAsync(email);
      setCooldown(30);
    } catch (err: any) {
      setGeneralError(getErrorMessage(err));
    }
  };

  return (
    <div className="space-y-6 text-left">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-text-primary font-sans">Verify your email</h1>
        <p className="text-sm text-text-secondary mt-1 leading-relaxed select-none">
          We have sent a 6-digit verification code to <span className="text-text-primary font-medium">{email}</span>.
        </p>
      </div>

      {generalError && (
        <div className="p-3 rounded-md bg-error/10 border border-error/25 text-sm text-error font-medium">
          {generalError}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="flex justify-between gap-2">
          {otp.map((digit, index) => (
            <input
              key={index}
              ref={(el) => {
                if (el) inputRefs.current[index] = el;
              }}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={digit}
              onChange={(e) => handleChange(e.target.value, index)}
              onKeyDown={(e) => handleKeyDown(e, index)}
              onPaste={handlePaste}
              className="w-12 h-12 rounded-md border border-border bg-surface text-center text-lg font-bold text-text-primary font-mono focus:outline-none focus:border-accent transition-colors"
            />
          ))}
        </div>

        <Button type="submit" fullWidth isLoading={verifyOtp.isPending}>
          Verify OTP
        </Button>
      </form>

      <div className="text-center pt-2 text-sm text-text-secondary select-none">
        Didn't receive the code?{' '}
        {cooldown > 0 ? (
          <span className="font-mono text-text-tertiary">Resend in {cooldown}s</span>
        ) : (
          <button
            type="button"
            onClick={handleResend}
            disabled={resendOtp.isPending}
            className="text-accent hover:text-accent-hover font-medium cursor-pointer"
          >
            Resend OTP
          </button>
        )}
      </div>
    </div>
  );
}
