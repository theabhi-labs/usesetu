import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Shield, KeyRound, CheckCircle2, AlertCircle, Clock } from 'lucide-react';
import { platformApi } from '../../services/platform.api';
import { authApi } from '../../services/auth.api';
import type { AccountSecurityData } from '../../services/platform.api';

export const SecurityPage: React.FC = () => {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

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
    </div>
  );
};
