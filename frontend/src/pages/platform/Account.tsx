import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { User, CheckCircle2, AlertCircle, Phone, Mail, Building } from 'lucide-react';
import { platformApi } from '../../services/platform.api';
import type { AccountProfileData } from '../../services/platform.api';

export const AccountPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    name: '',
    accountName: '',
    mobile: '',
  });
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const { data, isLoading } = useQuery<AccountProfileData>({
    queryKey: ['platform-account-profile'],
    queryFn: platformApi.getAccountProfile,
  });

  useEffect(() => {
    if (data) {
      setForm({
        name: data.user.name || '',
        accountName: data.account.name || '',
        mobile: data.user.mobile || '',
      });
    }
  }, [data]);

  const updateMutation = useMutation({
    mutationFn: (payload: { accountName?: string; name?: string; mobile?: string }) =>
      platformApi.updateAccountProfile(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['platform-account-profile'] });
      setSuccessMessage('Profile updated successfully!');
      setErrorMessage(null);
      setTimeout(() => setSuccessMessage(null), 3000);
    },
    onError: (err: any) => {
      setErrorMessage(err.response?.data?.message || err.message || 'Failed to update profile');
      setSuccessMessage(null);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateMutation.mutate(form);
  };

  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-28 bg-slate-900/80 border border-slate-800 rounded-3xl" />
        <div className="h-64 bg-slate-900/60 border border-slate-800 rounded-3xl" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-white tracking-tight">Account Settings</h1>
        <p className="text-xs text-slate-400 mt-0.5">
          Manage your platform account identity, owner contact details, and organization metadata.
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

      {/* Account Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-6 space-y-2">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
            Account Status
          </span>
          <span className="text-lg font-black text-emerald-400 uppercase flex items-center space-x-1.5">
            <CheckCircle2 className="w-4 h-4" />
            <span>{data?.account.status || 'Active'}</span>
          </span>
          <span className="text-[11px] text-slate-500 block">
            Member since {data?.account?.createdAt ? new Date(data.account.createdAt).toLocaleDateString() : 'N/A'}
          </span>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-6 space-y-2">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
            Email Verification
          </span>
          <span className="text-lg font-black text-white flex items-center space-x-1.5">
            {data?.user.isEmailVerified ? (
              <span className="text-emerald-400 flex items-center space-x-1 text-sm font-bold">
                <CheckCircle2 className="w-4 h-4" />
                <span>Verified</span>
              </span>
            ) : (
              <span className="text-amber-400 text-sm font-bold">Pending OTP</span>
            )}
          </span>
          <span className="text-[11px] text-slate-500 truncate block">{data?.user.email}</span>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-6 space-y-2">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
            Role & Security Level
          </span>
          <span className="text-lg font-black text-white uppercase text-sm">
            {data?.user.role?.replace(/_/g, ' ') || 'Platform Owner'}
          </span>
          <span className="text-[11px] text-slate-500 block">Full control-plane privileges</span>
        </div>
      </div>

      {/* Edit Profile Form */}
      <form onSubmit={handleSubmit} className="bg-slate-900/60 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6">
        <div>
          <h3 className="text-base font-black text-white">Owner Profile & Organization</h3>
          <p className="text-xs text-slate-400">Update your public contact info and account display name.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
          <div className="space-y-1.5">
            <label className="font-semibold text-slate-300">Account / Organization Name</label>
            <div className="relative">
              <Building className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 transform -translate-y-1/2" />
              <input
                type="text"
                value={form.accountName}
                onChange={(e) => setForm({ ...form, accountName: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3.5 py-2.5 text-white focus:outline-none focus:border-orange-500"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="font-semibold text-slate-300">Owner Full Name</label>
            <div className="relative">
              <User className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 transform -translate-y-1/2" />
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3.5 py-2.5 text-white focus:outline-none focus:border-orange-500"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="font-semibold text-slate-300">Registered Email Address (Read-only)</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 transform -translate-y-1/2" />
              <input
                type="email"
                disabled
                value={data?.user.email || ''}
                className="w-full bg-slate-950/60 border border-slate-800/80 rounded-xl pl-9 pr-3.5 py-2.5 text-slate-500 cursor-not-allowed"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="font-semibold text-slate-300">Mobile Phone Number (10-digit Indian)</label>
            <div className="relative">
              <Phone className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 transform -translate-y-1/2" />
              <input
                type="tel"
                value={form.mobile}
                onChange={(e) => setForm({ ...form, mobile: e.target.value })}
                placeholder="9876543210"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3.5 py-2.5 text-white focus:outline-none focus:border-orange-500"
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-4 border-t border-slate-800">
          <button
            type="submit"
            disabled={updateMutation.isPending}
            className="px-6 py-2.5 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white text-xs font-bold rounded-xl shadow-lg shadow-orange-500/20 transition-all"
          >
            {updateMutation.isPending ? 'Saving...' : 'Save Profile Changes'}
          </button>
        </div>
      </form>
    </div>
  );
};
