import React, { useState } from 'react';
import { useAuthStore } from '../../store/authStore';
import { TwoFactorSetupModal } from './TwoFactorSetupModal';
import { ShieldAlert, ShieldCheck, ArrowRight, Sparkles } from 'lucide-react';
import { Button } from '../ui/Button';

interface TwoFactorAlertBannerProps {
  className?: string;
  variant?: 'banner' | 'card';
}

export function TwoFactorAlertBanner({ className = '', variant = 'banner' }: TwoFactorAlertBannerProps) {
  const { user } = useAuthStore();
  const [modalOpen, setModalOpen] = useState(false);

  // If user is not logged in or already has 2FA enabled, don't show the setup warning
  if (!user || user.twoFactor?.enabled) {
    if (variant === 'card') {
      return (
        <div className={`p-4 rounded-2xl bg-success/10 border border-success/30 flex items-center justify-between gap-4 ${className}`}>
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-success/20 flex items-center justify-center text-success shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="font-bold text-xs text-text-primary flex items-center gap-1.5">
                <span>Two-Factor Authentication Active</span>
                <span className="text-[10px] font-mono font-bold uppercase px-1.5 py-0.2 rounded bg-success/20 text-success">
                  {user?.twoFactor?.method || '2FA'}
                </span>
              </div>
              <p className="text-[11px] text-text-secondary">
                Your account logins and critical operations are secured with multi-factor verification.
              </p>
            </div>
          </div>
        </div>
      );
    }
    return null;
  }

  if (variant === 'card') {
    return (
      <>
        <div className={`p-5 rounded-2xl bg-gradient-to-r from-warning/15 via-warning/10 to-surface-elevated border border-warning/35 shadow-sm space-y-3 text-left ${className}`}>
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-lg bg-warning/20 border border-warning/30 flex items-center justify-center text-warning shrink-0">
                <ShieldAlert className="w-4 h-4 animate-pulse" />
              </div>
              <div>
                <h4 className="font-bold text-sm text-text-primary">2FA Protection Inactive</h4>
                <p className="text-xs text-text-secondary">
                  Your account is only protected by a password. Enable 2FA with Email, SMS, or Authenticator App.
                </p>
              </div>
            </div>
          </div>

          <div className="pt-1 flex items-center justify-between">
            <span className="text-[10px] font-mono text-warning uppercase font-bold">Action Recommended</span>
            <Button
              size="sm"
              onClick={() => setModalOpen(true)}
              className="gap-1.5 shadow-sm shadow-accent/20 text-xs font-bold"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Enable 2FA</span>
            </Button>
          </div>
        </div>

        <TwoFactorSetupModal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
        />
      </>
    );
  }

  return (
    <>
      <div className={`w-full bg-gradient-to-r from-warning/20 via-warning/10 to-accent/15 border-b border-warning/30 px-4 py-2.5 sm:px-6 transition-all ${className}`}>
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2.5 text-xs text-left">
          <div className="flex items-center gap-2.5">
            <span className="flex h-2 w-2 relative shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-warning opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-warning" />
            </span>
            <div className="flex flex-wrap items-center gap-1.5 text-text-primary">
              <span className="font-bold text-warning font-mono uppercase tracking-wider text-[11px]">
                Security Alert:
              </span>
              <span className="text-text-secondary">
                Two-Factor Authentication is not enabled on your account. Protect your data from unauthorized access.
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-warning text-black hover:bg-warning/90 font-bold text-xs transition-all shadow-xs shrink-0 cursor-pointer"
          >
            <span>Enable 2FA Now</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <TwoFactorSetupModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
      />
    </>
  );
}
