import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Shield, KeyRound, CheckCircle2, AlertCircle, Clock, ShieldCheck, QrCode, Mail, Smartphone, Sparkles } from 'lucide-react';
import { platformApi } from '../../services/platform.api';
import { authApi } from '../../services/auth.api';
import { useAuthStore } from '../../store/authStore';
import { TwoFactorSetupModal } from '../../components/auth/TwoFactorSetupModal';
import type { AccountSecurityData } from '../../services/platform.api';

export const SecurityPage: React.FC = () => {
  const { user, setSession, accessToken } = useAuthStore();
  const queryClient = useQueryClient();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // 2FA states
  const [setupModalOpen, setSetupModalOpen] = useState(false);
  const [disablePassword, setDisablePassword] = useState('');
  const [showDisableModal, setShowDisableModal] = useState(false);

  const { data } = useQuery<AccountSecurityData>({
    queryKey: ['platform-account-security'],
    queryFn: platformApi.getAccountSecurity,
  });

  const changePasswordMutation = useMutation({
    mutationFn: (payload: { currentPassword: string; newPassword: string }) =>
      authApi.changePassword(payload),
    onSuccess: () => {
      setSuccessMessage('Password changed successfully! Please use your new password next time you login.');
      setErrorMessage(null);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setSuccessMessage(null), 5000);
    },
    onError: (err: any) => {
      setErrorMessage(err.response?.data?.message || err.message || 'Failed to change password');
      setSuccessMessage(null);
    },
  });

  const disable2FAMutation = useMutation({
    mutationFn: (password: string) => authApi.disable2FA(password),
    onSuccess: () => {
      if (user) {
        setSession({ ...user, twoFactor: { enabled: false } }, accessToken);
      }
      queryClient.invalidateQueries({ queryKey: ['twoFactorStatus'] });
      setShowDisableModal(false);
      setDisablePassword('');
      setSuccessMessage('Two-Factor Authentication has been disabled.');
      setTimeout(() => setSuccessMessage(null), 4000);
    },
    onError: (err: any) => {
      setErrorMessage(err.response?.data?.message || err.message || 'Failed to disable 2FA');
    },
  });

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setErrorMessage('New password and confirmation do not match');
      return;
    }
    if (newPassword.length < 8) {
      setErrorMessage('New password must be at least 8 characters long');
      return;
    }
    changePasswordMutation.mutate({ currentPassword, newPassword });
  };

  const handleDisable2FASubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!disablePassword) {
      setErrorMessage('Please enter your password to disable 2FA');
      return;
    }
    disable2FAMutation.mutate(disablePassword);
  };

  const is2FAEnabled = user?.twoFactor?.enabled;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-white tracking-tight">Security & Authentication</h1>
        <p className="text-xs text-slate-400 mt-0.5">
          Manage your account credentials, login history, and platform access protections.
        </p>
      </div>

      {successMessage && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl text-emerald-400 text-xs flex items-center space-x-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl text-rose-400 text-xs flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* 2FA Security Control Card */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-6">
          <div className="flex items-start space-x-3.5">
            <div className="p-2.5 rounded-2xl bg-orange-500/10 border border-orange-500/20 text-orange-400 shrink-0">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-base font-black text-white">Two-Factor Authentication (2FA)</h3>
                <span
                  className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${
                    is2FAEnabled
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                  }`}
                >
                  {is2FAEnabled ? 'Protected' : 'Not Configured'}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1 max-w-xl leading-relaxed">
                Protect your master account and all deployed customer centers from password breaches. Support for Authenticator Apps, Email OTP, and Mobile SMS.
              </p>
            </div>
          </div>

          <div className="shrink-0">
            {is2FAEnabled ? (
              <button
                type="button"
                onClick={() => setShowDisableModal(true)}
                className="px-4 py-2 text-xs font-bold text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 border border-rose-500/20 rounded-xl transition-colors cursor-pointer"
              >
                Disable 2FA
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setSetupModalOpen(true)}
                className="inline-flex items-center space-x-1.5 px-4 py-2 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white text-xs font-bold rounded-xl shadow-md shadow-orange-500/20 transition-all cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Enable 2FA Now</span>
              </button>
            )}
          </div>
        </div>

        {/* 2FA Method Status */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800/80 space-y-1.5">
            <div className="flex items-center space-x-2 text-slate-400 font-bold">
              <QrCode className="w-4 h-4 text-orange-400" />
              <span>Authenticator App</span>
            </div>
            <p className="text-[11px] text-slate-500">Google / Microsoft Authenticator (RFC 6238 TOTP)</p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800/80 space-y-1.5">
            <div className="flex items-center space-x-2 text-slate-400 font-bold">
              <Mail className="w-4 h-4 text-emerald-400" />
              <span>Email Verification</span>
            </div>
            <p className="text-[11px] text-slate-500">Instant one-time security passcodes sent via email</p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800/80 space-y-1.5">
            <div className="flex items-center space-x-2 text-slate-400 font-bold">
              <Smartphone className="w-4 h-4 text-sky-400" />
              <span>Mobile SMS OTP</span>
            </div>
            <p className="text-[11px] text-slate-500">Direct mobile security codes for registered phone</p>
          </div>
        </div>
      </div>

      {/* Security Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-6 space-y-2">
          <div className="flex items-center space-x-2 text-slate-400">
            <Clock className="w-4 h-4 text-orange-400" />
            <span className="text-[10px] font-bold uppercase tracking-wider">Last Login Session</span>
          </div>
          <span className="text-sm font-bold text-white block">
            {data?.lastLoginAt ? new Date(data.lastLoginAt).toLocaleString() : 'Active session'}
          </span>
          <span className="text-xs text-slate-500 block">
            IP: <span className="font-mono text-slate-400">{data?.lastLoginIp || '127.0.0.1'}</span>
          </span>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-6 space-y-2">
          <div className="flex items-center space-x-2 text-slate-400">
            <Shield className="w-4 h-4 text-emerald-400" />
            <span className="text-[10px] font-bold uppercase tracking-wider">Failed Attempts</span>
          </div>
          <span className="text-sm font-bold text-white block">
            {data?.failedLoginAttempts || 0} failed login attempts
          </span>
          <span className="text-xs text-emerald-400 font-semibold block">Account Lockout Protection Active</span>
        </div>
      </div>

      {/* Change Password Form */}
      <form onSubmit={handlePasswordSubmit} className="bg-slate-900/60 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6">
        <div>
          <h3 className="text-base font-black text-white flex items-center space-x-2">
            <KeyRound className="w-4 h-4 text-orange-400" />
            <span>Update Account Password</span>
          </h3>
          <p className="text-xs text-slate-400">Enter your current password followed by your new secure password.</p>
        </div>

        <div className="space-y-4 max-w-md text-xs">
          <div className="space-y-1.5">
            <label className="font-semibold text-slate-300">Current Password</label>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-orange-500"
            />
          </div>

          <div className="space-y-1.5">
            <label className="font-semibold text-slate-300">New Password (min 8 characters)</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              minLength={8}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-orange-500"
            />
          </div>

          <div className="space-y-1.5">
            <label className="font-semibold text-slate-300">Confirm New Password</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={8}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-orange-500"
            />
          </div>
        </div>

        <div className="flex justify-start pt-4 border-t border-slate-800">
          <button
            type="submit"
            disabled={changePasswordMutation.isPending}
            className="px-6 py-2.5 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white text-xs font-bold rounded-xl shadow-lg shadow-orange-500/20 transition-all"
          >
            {changePasswordMutation.isPending ? 'Updating Password...' : 'Update Password'}
          </button>
        </div>
      </form>

      {/* Security Best Practices */}
      <div className="bg-slate-900/40 border border-slate-800 rounded-3xl p-6 space-y-3">
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300">
          Platform Security Best Practices
        </h4>
        <ul className="text-xs text-slate-400 space-y-2 list-disc pl-4 leading-relaxed">
          {data?.securityRecommendations?.map((rec, idx) => (
            <li key={idx}>{rec}</li>
          )) || (
            <>
              <li>Use strong passwords unique to your UseSetu administrative account.</li>
              <li>Keep your DNS records configured with verified CNAME targets.</li>
              <li>Regularly review staff operator seats and revoke unused accounts.</li>
            </>
          )}
        </ul>
      </div>

      {/* 2FA Setup Modal */}
      <TwoFactorSetupModal
        isOpen={setupModalOpen}
        onClose={() => setSetupModalOpen(false)}
      />

      {/* 2FA Disable Confirmation Modal */}
      {showDisableModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-md rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl p-6 space-y-5 text-left">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 shrink-0">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Disable Two-Factor Authentication</h3>
                <p className="text-xs text-slate-400 mt-0.5">Please confirm your account password to remove 2FA security.</p>
              </div>
            </div>

            <form onSubmit={handleDisable2FASubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">Current Password</label>
                <input
                  type="password"
                  value={disablePassword}
                  onChange={(e) => setDisablePassword(e.target.value)}
                  placeholder="Enter your password"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-rose-500"
                  autoFocus
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowDisableModal(false);
                    setDisablePassword('');
                  }}
                  className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={disable2FAMutation.isPending}
                  className="px-5 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-md transition-all cursor-pointer"
                >
                  {disable2FAMutation.isPending ? 'Disabling...' : 'Confirm & Disable 2FA'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
