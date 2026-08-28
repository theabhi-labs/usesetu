import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { authApi } from '../../services/auth.api';
import { useAuthStore } from '../../store/authStore';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import {
  ShieldCheck,
  Mail,
  Smartphone,
  QrCode,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  Download,
  X,
  ArrowRight,
  KeyRound,
  Sparkles,
} from 'lucide-react';
import type { TwoFactorMethod } from '../../types/auth.types';

interface TwoFactorSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function TwoFactorSetupModal({ isOpen, onClose, onSuccess }: TwoFactorSetupModalProps) {
  const { user, setSession, accessToken } = useAuthStore();
  const queryClient = useQueryClient();

  const [step, setStep] = useState<'choose' | 'verify' | 'backup'>('choose');
  const [selectedMethod, setSelectedMethod] = useState<TwoFactorMethod>('authenticator');
  const [initData, setInitData] = useState<{
    secret?: string;
    qrCodeUrl?: string;
    targetMasked?: string;
  }>({});
  const [verificationCode, setVerificationCode] = useState('');
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copiedSecret, setCopiedSecret] = useState(false);
  const [copiedBackup, setCopiedBackup] = useState(false);

  // Initiate Mutation
  const initiateMutation = useMutation({
    mutationFn: (method: TwoFactorMethod) => authApi.initiate2FA(method),
    onSuccess: (data: any) => {
      setInitData({
        secret: data.secret,
        qrCodeUrl: data.qrCodeUrl,
        targetMasked: data.targetMasked,
      });
      setStep('verify');
      setErrorMessage(null);
      setVerificationCode('');
    },
    onError: (err: any) => {
      setErrorMessage(err.response?.data?.message || err.message || 'Failed to initiate 2FA');
    },
  });

  // Confirm Mutation
  const confirmMutation = useMutation({
    mutationFn: (payload: { method: string; code: string }) => authApi.confirm2FA(payload),
    onSuccess: (data: any) => {
      setBackupCodes(data.backupCodes || []);
      setStep('backup');
      setErrorMessage(null);

      // Update Auth Store user
      if (user) {
        setSession(
          {
            ...user,
            twoFactor: {
              enabled: true,
              method: selectedMethod,
              lastVerifiedAt: new Date().toISOString(),
            },
          },
          accessToken,
        );
      }

      queryClient.invalidateQueries({ queryKey: ['twoFactorStatus'] });
      queryClient.invalidateQueries({ queryKey: ['platform-account-security'] });
      if (onSuccess) onSuccess();
    },
    onError: (err: any) => {
      setErrorMessage(err.response?.data?.message || err.message || 'Invalid verification code');
    },
  });

  if (!isOpen) return null;

  const handleStartSetup = (method: TwoFactorMethod) => {
    setSelectedMethod(method);
    initiateMutation.mutate(method);
  };

  const handleVerifySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!verificationCode || verificationCode.trim().length < 6) {
      setErrorMessage('Please enter the full 6-digit code');
      return;
    }
    confirmMutation.mutate({
      method: selectedMethod,
      code: verificationCode.trim(),
    });
  };

  const handleCopySecret = () => {
    if (initData.secret) {
      navigator.clipboard.writeText(initData.secret);
      setCopiedSecret(true);
      setTimeout(() => setCopiedSecret(false), 2000);
    }
  };

  const handleCopyBackupCodes = () => {
    navigator.clipboard.writeText(backupCodes.join('\n'));
    setCopiedBackup(true);
    setTimeout(() => setCopiedBackup(false), 2000);
  };

  const handleDownloadBackupCodes = () => {
    const text = `UseSetu 2FA Emergency Backup Recovery Codes\nUser: ${user?.email || ''}\nDate: ${new Date().toLocaleString()}\n\n` +
      backupCodes.map((c, i) => `${i + 1}. ${c}`).join('\n') +
      '\n\nKeep these codes in a safe, offline location. Each code can only be used once.';
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `usesetu-2fa-backup-codes-${user?.name?.toLowerCase().replace(/\s+/g, '-') || 'user'}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg rounded-2xl bg-surface border border-border shadow-2xl p-6 sm:p-8 space-y-6 text-left overflow-hidden">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-text-tertiary hover:text-text-primary p-1.5 rounded-lg hover:bg-surface-elevated transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-accent/15 border border-accent/30 flex items-center justify-center text-accent shrink-0">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-text-primary tracking-tight">
              {step === 'choose' && 'Enable Two-Factor Authentication (2FA)'}
              {step === 'verify' && 'Verify & Activate 2FA'}
              {step === 'backup' && 'Save Emergency Backup Codes'}
            </h2>
            <p className="text-xs text-text-secondary mt-0.5">
              {step === 'choose' && 'Add an extra layer of protection to your account and services.'}
              {step === 'verify' && `Complete setup using your chosen method: ${selectedMethod.toUpperCase()}`}
              {step === 'backup' && 'Keep these codes safe in case you lose access to your 2FA device.'}
            </p>
          </div>
        </div>

        {errorMessage && (
          <div className="p-3 rounded-lg bg-error/15 border border-error/30 text-error text-xs font-medium flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* STEP 1: CHOOSE METHOD */}
        {step === 'choose' && (
          <div className="space-y-3">
            {/* Authenticator App Option */}
            <div
              onClick={() => handleStartSetup('authenticator')}
              className="p-4 rounded-xl border border-border hover:border-accent bg-surface-elevated/50 hover:bg-surface-elevated transition-all cursor-pointer flex items-center justify-between group"
            >
              <div className="flex items-start gap-3.5">
                <div className="p-2.5 rounded-lg bg-accent/10 border border-accent/20 text-accent group-hover:scale-105 transition-transform shrink-0">
                  <QrCode className="w-5 h-5" />
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-text-primary">Authenticator App</span>
                    <span className="text-[10px] font-bold px-2 py-0.2 rounded-full bg-accent/20 text-accent font-mono">
                      Recommended
                    </span>
                  </div>
                  <p className="text-xs text-text-secondary leading-relaxed">
                    Use Google Authenticator, Microsoft Authenticator, or Authy to generate time-based codes.
                  </p>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-text-tertiary group-hover:text-accent group-hover:translate-x-1 transition-all shrink-0 ml-2" />
            </div>

            {/* Email OTP Option */}
            <div
              onClick={() => handleStartSetup('email')}
              className="p-4 rounded-xl border border-border hover:border-accent bg-surface-elevated/50 hover:bg-surface-elevated transition-all cursor-pointer flex items-center justify-between group"
            >
              <div className="flex items-start gap-3.5">
                <div className="p-2.5 rounded-lg bg-accent/10 border border-accent/20 text-accent group-hover:scale-105 transition-transform shrink-0">
                  <Mail className="w-5 h-5" />
                </div>
                <div className="space-y-1">
                  <div className="font-bold text-sm text-text-primary">Email One-Time Passcode (OTP)</div>
                  <p className="text-xs text-text-secondary leading-relaxed">
                    Receive a 6-digit security code sent directly to your registered email ({user?.email}).
                  </p>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-text-tertiary group-hover:text-accent group-hover:translate-x-1 transition-all shrink-0 ml-2" />
            </div>

            {/* Mobile SMS OTP Option */}
            <div
              onClick={() => handleStartSetup('mobile')}
              className="p-4 rounded-xl border border-border hover:border-accent bg-surface-elevated/50 hover:bg-surface-elevated transition-all cursor-pointer flex items-center justify-between group"
            >
              <div className="flex items-start gap-3.5">
                <div className="p-2.5 rounded-lg bg-accent/10 border border-accent/20 text-accent group-hover:scale-105 transition-transform shrink-0">
                  <Smartphone className="w-5 h-5" />
                </div>
                <div className="space-y-1">
                  <div className="font-bold text-sm text-text-primary">Mobile SMS Verification</div>
                  <p className="text-xs text-text-secondary leading-relaxed">
                    Receive SMS security codes directly on your registered phone number ({user?.mobile || 'Phone'}).
                  </p>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-text-tertiary group-hover:text-accent group-hover:translate-x-1 transition-all shrink-0 ml-2" />
            </div>
          </div>
        )}

        {/* STEP 2: VERIFY CODE */}
        {step === 'verify' && (
          <form onSubmit={handleVerifySubmit} className="space-y-5">
            {selectedMethod === 'authenticator' && initData.qrCodeUrl && (
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row items-center gap-4 p-4 rounded-xl bg-surface-elevated border border-border">
                  <div className="bg-white p-2 rounded-xl shrink-0 shadow-sm">
                    <img src={initData.qrCodeUrl} alt="2FA QR Code" className="w-32 h-32" />
                  </div>
                  <div className="space-y-2 text-xs text-text-secondary leading-relaxed">
                    <p className="font-semibold text-text-primary">1. Scan QR code in your Authenticator app</p>
                    <p>Open Google Authenticator or Microsoft Authenticator, tap "+" and scan this code.</p>
                    <div className="pt-1">
                      <span className="text-[10px] font-mono text-text-tertiary uppercase block">Or enter key manually:</span>
                      <div className="flex items-center gap-2 mt-1">
                        <code className="text-xs font-mono text-accent bg-accent/10 px-2 py-1 rounded select-all font-bold">
                          {initData.secret}
                        </code>
                        <button
                          type="button"
                          onClick={handleCopySecret}
                          className="text-xs text-text-tertiary hover:text-accent p-1 cursor-pointer"
                          title="Copy Secret Key"
                        >
                          {copiedSecret ? <Check className="w-4 h-4 text-success" /> : <Copy className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {(selectedMethod === 'email' || selectedMethod === 'mobile') && (
              <div className="p-4 rounded-xl bg-accent/10 border border-accent/20 space-y-1 text-xs">
                <div className="font-bold text-accent">Verification Code Dispatched</div>
                <p className="text-text-secondary">
                  We sent a 6-digit security code to your {selectedMethod === 'email' ? 'email' : 'phone'} ({initData.targetMasked}).
                </p>
              </div>
            )}

            <div className="space-y-2">
              <label className="block text-xs font-bold text-text-primary uppercase tracking-wider font-mono">
                Enter 6-Digit Verification Code
              </label>
              <Input
                type="text"
                maxLength={6}
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ''))}
                placeholder="000000"
                className="text-center font-mono text-2xl tracking-[8px] font-bold h-14"
                autoFocus
                required
              />
            </div>

            <div className="flex items-center justify-between gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setStep('choose')}
                disabled={confirmMutation.isPending}
              >
                Change Method
              </Button>

              <Button
                type="submit"
                size="sm"
                isLoading={confirmMutation.isPending}
                className="gap-2 shadow-md shadow-accent/20"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Verify & Activate 2FA</span>
              </Button>
            </div>
          </form>
        )}

        {/* STEP 3: BACKUP RECOVERY CODES */}
        {step === 'backup' && (
          <div className="space-y-5">
            <div className="p-4 rounded-xl bg-success/10 border border-success/30 flex items-center gap-3">
              <CheckCircle2 className="w-6 h-6 text-success shrink-0" />
              <div>
                <div className="font-bold text-sm text-text-primary">2FA Protection Active!</div>
                <p className="text-xs text-text-secondary">
                  Your account is now secured with {selectedMethod.toUpperCase()} Two-Factor Authentication.
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-text-primary uppercase font-mono">Emergency Backup Codes</span>
                <span className="text-[11px] text-text-tertiary">Save these codes safely</span>
              </div>

              <div className="grid grid-cols-2 gap-2 p-3 bg-surface-elevated rounded-xl border border-border font-mono text-xs font-bold text-center">
                {backupCodes.map((code, idx) => (
                  <div key={idx} className="p-2 bg-bg rounded-lg text-accent tracking-wider border border-border/50">
                    {code}
                  </div>
                ))}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2.5 pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleCopyBackupCodes}
                className="gap-1.5 flex-1"
              >
                {copiedBackup ? <Check className="w-3.5 h-3.5 text-success" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedBackup ? 'Copied' : 'Copy All'}</span>
              </Button>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleDownloadBackupCodes}
                className="gap-1.5 flex-1"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download .txt</span>
              </Button>

              <Button
                type="button"
                size="sm"
                onClick={onClose}
                className="w-full sm:w-auto px-6 font-bold shadow-md shadow-accent/20"
              >
                Done
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
