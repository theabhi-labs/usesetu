import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useLocation } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { platformApi } from '../../services/platform.api';
import { authApi } from '../../services/auth.api';
import { cmsApi } from '../../services/cms.api';
import { getTenantContext } from '../../lib/tenant';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { TwoFactorSetupModal } from '../../components/auth/TwoFactorSetupModal';
import { TwoFactorAlertBanner } from '../../components/auth/TwoFactorAlertBanner';
import { ThemeToggle } from '../../components/common/ThemeToggle';
import {
  User,
  Shield,
  KeyRound,
  ExternalLink,
  Globe,
  HardDrive,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  Server,
  Layers,
  ArrowUpRight,
  Sparkles,
  ShieldCheck,
  QrCode,
  Mail,
  Smartphone,
} from 'lucide-react';

export function UseSetuProfile() {
  const { user, setSession, accessToken } = useAuthStore();
  const location = useLocation();
  const queryClient = useQueryClient();

  const tenantContext = React.useMemo(() => getTenantContext(location.search), [location.search]);
  const activeSlug = tenantContext.tenantSlug || 'default';

  // Copied state
  const [copiedUrl, setCopiedUrl] = useState(false);

  // 2FA modal states
  const [setup2FAModalOpen, setSetup2FAModalOpen] = useState(false);
  const [showDisable2FAModal, setShowDisable2FAModal] = useState(false);
  const [disable2FAPassword, setDisable2FAPassword] = useState('');
  const [twoFactorMessage, setTwoFactorMessage] = useState<string | null>(null);
  const [twoFactorError, setTwoFactorError] = useState<string | null>(null);

  // Form states
  const [profileForm, setProfileForm] = useState({
    name: '',
    accountName: '',
    mobile: '',
  });
  const [profileSuccess, setProfileSuccess] = useState<string | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  // Queries
  const { data: accountProfile } = useQuery({
    queryKey: ['platform-account-profile'],
    queryFn: platformApi.getAccountProfile,
  });

  const { data: applications } = useQuery({
    queryKey: ['platform-applications'],
    queryFn: platformApi.getApplications,
  });

  const { data: cmsSettings } = useQuery({
    queryKey: ['cmsSettings', activeSlug],
    queryFn: cmsApi.getSettings,
  });

  // Find active application for this tenant
  const currentApp = React.useMemo(() => {
    if (!applications || applications.length === 0) return null;
    return applications.find((app) => app.slug.toLowerCase() === activeSlug.toLowerCase()) || applications[0];
  }, [applications, activeSlug]);

  useEffect(() => {
    if (accountProfile) {
      setProfileForm({
        name: accountProfile.user?.name || user?.name || '',
        accountName: accountProfile.account?.name || '',
        mobile: accountProfile.user?.mobile || user?.mobile || '',
      });
    } else if (user) {
      setProfileForm({
        name: user.name || '',
        accountName: '',
        mobile: user.mobile || '',
      });
    }
  }, [accountProfile, user]);

  // Mutations
  const updateProfileMutation = useMutation({
    mutationFn: (payload: { accountName?: string; name?: string; mobile?: string }) =>
      platformApi.updateAccountProfile(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['platform-account-profile'] });
      setProfileSuccess('UseSetu Profile updated successfully!');
      setProfileError(null);
      setTimeout(() => setProfileSuccess(null), 4000);
    },
    onError: (err: any) => {
      setProfileError(err.response?.data?.message || err.message || 'Failed to update profile');
      setProfileSuccess(null);
    },
  });

  const changePasswordMutation = useMutation({
    mutationFn: (payload: { currentPassword: string; newPassword: string }) =>
      authApi.changePassword(payload),
    onSuccess: () => {
      setPasswordSuccess('Password updated successfully!');
      setPasswordError(null);
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setTimeout(() => setPasswordSuccess(null), 5000);
    },
    onError: (err: any) => {
      setPasswordError(err.response?.data?.message || err.message || 'Failed to change password');
      setPasswordSuccess(null);
    },
  });

  const disable2FAMutation = useMutation({
    mutationFn: (password: string) => authApi.disable2FA(password),
    onSuccess: () => {
      if (user) {
        setSession({ ...user, twoFactor: { enabled: false } }, accessToken);
      }
      queryClient.invalidateQueries({ queryKey: ['twoFactorStatus'] });
      setShowDisable2FAModal(false);
      setDisable2FAPassword('');
      setTwoFactorMessage('Two-Factor Authentication has been disabled.');
      setTwoFactorError(null);
      setTimeout(() => setTwoFactorMessage(null), 4000);
    },
    onError: (err: any) => {
      setTwoFactorError(err.response?.data?.message || err.message || 'Failed to disable 2FA');
    },
  });

  const handleProfileSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateProfileMutation.mutate(profileForm);
  };

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordError('New password and confirmation do not match');
      return;
    }
    if (passwordForm.newPassword.length < 8) {
      setPasswordError('New password must be at least 8 characters long');
      return;
    }
    changePasswordMutation.mutate({
      currentPassword: passwordForm.currentPassword,
      newPassword: passwordForm.newPassword,
    });
  };

  const handleDisable2FASubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!disable2FAPassword) {
      setTwoFactorError('Password is required');
      return;
    }
    disable2FAMutation.mutate(disable2FAPassword);
  };

  const publicUrl = `${window.location.protocol}//${window.location.host}${
    window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
      ? `/?tenant=${activeSlug}`
      : ''
  }`;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(publicUrl);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2000);
  };

  const storageUsedMB = currentApp?.usage?.storage?.used
    ? Math.round(currentApp.usage.storage.used / (1024 * 1024))
    : 0;
  const storageLimitMB = currentApp?.usage?.storage?.limit
    ? Math.round(currentApp.usage.storage.limit / (1024 * 1024))
    : 500;
  const storagePercent = Math.min(100, Math.round((storageUsedMB / (storageLimitMB || 1)) * 100));

  const activeStaffUsed = currentApp?.usage?.activeUsers?.used || 1;
  const activeStaffLimit = currentApp?.usage?.activeUsers?.limit || 5;
  const staffPercent = Math.min(100, Math.round((activeStaffUsed / (activeStaffLimit || 1)) * 100));

  return (
    <div className="p-6 w-full space-y-8 text-left">
      {/* Hero Header Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-accent/20 via-surface-elevated to-surface border border-accent/30 p-6 md:p-8 shadow-sm">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2.5">
              <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-accent to-accent-hover flex items-center justify-center font-bold text-white shadow-md font-mono text-base">
                U
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl md:text-2xl font-black text-text-primary tracking-tight">
                    UseSetu Platform Profile & Kendra Hub
                  </h1>
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-accent/20 border border-accent/40 text-accent">
                    Tenant: {activeSlug}
                  </span>
                </div>
                <p className="text-xs text-text-secondary mt-0.5">
                  Manage your UseSetu account credentials, cloud deployment domain, subscription quotas, and platform controls directly from here.
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <a
              href={publicUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg bg-surface border border-border hover:bg-surface-elevated text-text-primary transition-all shadow-xs"
            >
              <Globe className="w-3.5 h-3.5 text-accent" />
              <span>View Public Portal</span>
              <ArrowUpRight className="w-3.5 h-3.5 opacity-60" />
            </a>

            <a
              href="/platform"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg bg-accent text-white hover:bg-accent-hover transition-all shadow-md shadow-accent/20"
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Open UseSetu Control Plane</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      </div>

      {/* Grid: App Deployment Details & Cloud Quotas */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Kendra App & Deployment Information */}
        <Card className="p-6 lg:col-span-2 space-y-6 bg-surface border-border">
          <div className="flex items-center justify-between border-b border-border pb-4">
            <div className="flex items-center gap-2">
              <Server className="w-4 h-4 text-accent" />
              <h2 className="font-bold text-base text-text-primary">Kendra Cloud Deployment Details</h2>
            </div>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-success/15 border border-success/30 text-success">
              <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
              {currentApp?.status ? currentApp.status.toUpperCase() : 'ACTIVE CLOUD TENANT'}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-surface-elevated border border-border/80 space-y-1">
              <div className="text-[11px] font-mono text-text-tertiary uppercase">Service Center Name</div>
              <div className="font-bold text-text-primary text-sm">
                {cmsSettings?.cscName || cmsSettings?.websiteName || currentApp?.name || activeSlug}
              </div>
            </div>

            <div className="p-4 rounded-xl bg-surface-elevated border border-border/80 space-y-1">
              <div className="text-[11px] font-mono text-text-tertiary uppercase">Tenant Slug Identifier</div>
              <div className="font-mono font-bold text-accent text-sm">{activeSlug}</div>
            </div>

            <div className="p-4 rounded-xl bg-surface-elevated border border-border/80 space-y-1 sm:col-span-2">
              <div className="flex justify-between items-center">
                <span className="text-[11px] font-mono text-text-tertiary uppercase">Public Access URL (Citizen Storefront)</span>
                <button
                  type="button"
                  onClick={copyToClipboard}
                  className="text-xs text-accent hover:text-accent-hover inline-flex items-center gap-1 font-medium cursor-pointer"
                >
                  {copiedUrl ? <Check className="w-3.5 h-3.5 text-success" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedUrl ? 'Copied' : 'Copy URL'}</span>
                </button>
              </div>
              <div className="font-mono text-xs text-text-primary font-medium truncate pt-1">{publicUrl}</div>
            </div>

            <div className="p-4 rounded-xl bg-surface-elevated border border-border/80 space-y-1">
              <div className="text-[11px] font-mono text-text-tertiary uppercase">Subdomain Fleet</div>
              <div className="font-mono text-xs text-text-secondary">{activeSlug}.usesetu.com</div>
            </div>

            <div className="p-4 rounded-xl bg-surface-elevated border border-border/80 space-y-1">
              <div className="text-[11px] font-mono text-text-tertiary uppercase">Custom Domain Mapping</div>
              <div className="font-mono text-xs text-text-secondary">
                {currentApp?.primaryDomain || 'Not configured (Uses UseSetu Subdomain)'}
              </div>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-accent/5 border border-accent/20 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Shield className="w-5 h-5 text-accent shrink-0" />
              <div>
                <div className="font-bold text-xs text-text-primary">Isolated Database & Cloud Storage Active</div>
                <p className="text-[11px] text-text-secondary">
                  Your Common Service Center runs in an isolated tenant environment with automated TLS encryption.
                </p>
              </div>
            </div>
          </div>
        </Card>

        {/* Right 1 Col: Subscription & Cloud Entitlements */}
        <Card className="p-6 space-y-6 bg-surface border-border">
          <div className="flex items-center justify-between border-b border-border pb-4">
            <div className="flex items-center gap-2">
              <HardDrive className="w-4 h-4 text-accent" />
              <h2 className="font-bold text-base text-text-primary">Cloud Entitlements</h2>
            </div>
            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-accent/15 text-accent border border-accent/30">
              {currentApp?.subscription?.plan || 'FREE TIER'}
            </span>
          </div>

          <div className="space-y-4">
            {/* Storage Meter */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-mono">
                <span className="text-text-secondary">Storage Quota</span>
                <span className="text-text-primary font-bold">
                  {storageUsedMB} MB / {storageLimitMB} MB ({storagePercent}%)
                </span>
              </div>
              <div className="w-full bg-border rounded-full h-2 overflow-hidden">
                <div
                  className="bg-accent h-full rounded-full transition-all duration-500"
                  style={{ width: `${Math.max(5, storagePercent)}%` }}
                />
              </div>
            </div>

            {/* Staff Seats Meter */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-mono">
                <span className="text-text-secondary">Active Operator Seats</span>
                <span className="text-text-primary font-bold">
                  {activeStaffUsed} / {activeStaffLimit} Seats ({staffPercent}%)
                </span>
              </div>
              <div className="w-full bg-border rounded-full h-2 overflow-hidden">
                <div
                  className="bg-success h-full rounded-full transition-all duration-500"
                  style={{ width: `${Math.max(10, staffPercent)}%` }}
                />
              </div>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-surface-elevated border border-border/80 space-y-2 text-xs">
            <div className="flex justify-between text-text-secondary">
              <span>Billing Status:</span>
              <span className="font-bold text-success capitalize">{currentApp?.subscription?.status || 'Active'}</span>
            </div>
            <div className="flex justify-between text-text-secondary">
              <span>Billing Cycle:</span>
              <span className="font-mono text-text-primary">{currentApp?.subscription?.billingCycle || 'Monthly'}</span>
            </div>
          </div>

          <a
            href="/platform/billing"
            target="_blank"
            rel="noreferrer"
            className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-surface-elevated hover:bg-surface border border-border text-text-primary transition-colors text-center"
          >
            <Sparkles className="w-3.5 h-3.5 text-accent" />
            <span>Manage UseSetu Subscription</span>
          </a>
        </Card>
      </div>

      {/* Grid: Owner Profile Edit & Password Change */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Owner Account Details */}
        <Card className="p-6 space-y-5 bg-surface border-border">
          <div className="flex items-center justify-between border-b border-border pb-4">
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-accent" />
              <h2 className="font-bold text-base text-text-primary">UseSetu Owner Profile</h2>
            </div>
            <span className="text-xs font-mono text-text-tertiary uppercase">Role: {user?.role}</span>
          </div>

          {profileSuccess && (
            <div className="p-3 rounded-lg bg-success/15 border border-success/30 text-success text-xs font-medium flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{profileSuccess}</span>
            </div>
          )}

          {profileError && (
            <div className="p-3 rounded-lg bg-error/15 border border-error/30 text-error text-xs font-medium flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{profileError}</span>
            </div>
          )}

          <form onSubmit={handleProfileSubmit} className="space-y-4 text-left">
            <div>
              <Input
                label="Full Name"
                type="text"
                value={profileForm.name}
                onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                placeholder="Enter owner full name"
                required
              />
            </div>

            <div>
              <Input
                label="Email Address (Login ID)"
                type="email"
                value={user?.email || ''}
                disabled
                className="opacity-70 cursor-not-allowed bg-bg"
              />
              <span className="text-[10px] text-text-tertiary mt-1 block">
                Email is permanently linked to your UseSetu primary master account.
              </span>
            </div>

            <div>
              <Input
                label="Mobile Number"
                type="tel"
                value={profileForm.mobile}
                onChange={(e) => setProfileForm({ ...profileForm, mobile: e.target.value })}
                placeholder="10-digit mobile number"
              />
            </div>

            <Button
              type="submit"
              size="sm"
              isLoading={updateProfileMutation.isPending}
              className="gap-1.5 shadow-sm shadow-accent/20"
            >
              <span>Save Owner Profile</span>
            </Button>
          </form>
        </Card>

        {/* Two-Factor Authentication (2FA) */}
        <Card className="p-6 space-y-5 bg-surface border-border">
          <div className="flex items-center justify-between border-b border-border pb-4">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-accent" />
              <h2 className="font-bold text-base text-text-primary">Two-Factor Authentication (2FA)</h2>
            </div>
            <span
              className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full ${
                user?.twoFactor?.enabled
                  ? 'bg-success/20 text-success'
                  : 'bg-warning/20 text-warning'
              }`}
            >
              {user?.twoFactor?.enabled ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" /> 2FA Active ({user.twoFactor.method?.toUpperCase()})
                </>
              ) : (
                <>
                  <AlertCircle className="w-3.5 h-3.5" /> Action Required
                </>
              )}
            </span>
          </div>

          {twoFactorMessage && (
            <div className="p-3 rounded-lg bg-success/15 border border-success/30 text-success text-xs font-medium flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{twoFactorMessage}</span>
            </div>
          )}

          {twoFactorError && (
            <div className="p-3 rounded-lg bg-error/15 border border-error/30 text-error text-xs font-medium flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{twoFactorError}</span>
            </div>
          )}

          <p className="text-xs text-text-secondary leading-relaxed">
            Enhance administrative access security by requiring a 6-digit verification code via Authenticator App, Email, or Mobile SMS.
          </p>

          <div className="pt-2 flex items-center justify-between">
            {user?.twoFactor?.enabled ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowDisable2FAModal(true)}
                className="text-error hover:bg-error/10 hover:border-error text-xs"
              >
                Disable 2FA
              </Button>
            ) : (
              <Button
                type="button"
                size="sm"
                onClick={() => setSetup2FAModalOpen(true)}
                className="gap-1.5 shadow-sm shadow-accent/20 text-xs font-bold"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Setup 2FA Protection</span>
              </Button>
            )}
          </div>
        </Card>

        {/* Theme & Appearance */}
        <Card className="p-6 space-y-4 bg-surface border-border">
          <div className="flex items-center justify-between border-b border-border pb-4">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-accent" />
              <h2 className="font-bold text-base text-text-primary">Theme & Appearance</h2>
            </div>
            <ThemeToggle variant="segmented" />
          </div>
          <p className="text-xs text-text-secondary leading-relaxed">
            Customize the visual style of your administrative workspace with dark mode, light mode, or system automatic sync.
          </p>
        </Card>

        {/* Security & Password */}
        <Card className="p-6 space-y-5 bg-surface border-border">
          <div className="flex items-center justify-between border-b border-border pb-4">
            <div className="flex items-center gap-2">
              <KeyRound className="w-4 h-4 text-accent" />
              <h2 className="font-bold text-base text-text-primary">Change Password</h2>
            </div>
          </div>

          {passwordSuccess && (
            <div className="p-3 rounded-lg bg-success/15 border border-success/30 text-success text-xs font-medium flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{passwordSuccess}</span>
            </div>
          )}

          {passwordError && (
            <div className="p-3 rounded-lg bg-error/15 border border-error/30 text-error text-xs font-medium flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{passwordError}</span>
            </div>
          )}

          <form onSubmit={handlePasswordSubmit} className="space-y-4 text-left">
            <div>
              <Input
                label="Current Password"
                type="password"
                value={passwordForm.currentPassword}
                onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                placeholder="••••••••"
                required
              />
            </div>

            <div>
              <Input
                label="New Password"
                type="password"
                value={passwordForm.newPassword}
                onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                placeholder="Minimum 8 characters"
                required
              />
            </div>

            <div>
              <Input
                label="Confirm New Password"
                type="password"
                value={passwordForm.confirmPassword}
                onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                placeholder="Re-enter new password"
                required
              />
            </div>

            <Button
              type="submit"
              size="sm"
              variant="secondary"
              isLoading={changePasswordMutation.isPending}
              className="gap-1.5"
            >
              <span>Update Password</span>
            </Button>
          </form>
        </Card>
      </div>

      {/* 2FA Setup Modal */}
      <TwoFactorSetupModal
        isOpen={setup2FAModalOpen}
        onClose={() => setSetup2FAModalOpen(false)}
        onSuccess={() => {
          setTwoFactorMessage('Two-Factor Authentication is now enabled!');
          setTimeout(() => setTwoFactorMessage(null), 4000);
        }}
      />

      {/* 2FA Disable Modal */}
      {showDisable2FAModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-md rounded-2xl bg-surface border border-border shadow-2xl p-6 space-y-5 text-left">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-error/10 border border-error/20 flex items-center justify-center text-error shrink-0">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-text-primary">Disable Two-Factor Authentication</h3>
                <p className="text-xs text-text-secondary mt-0.5">Please confirm your current password to remove 2FA.</p>
              </div>
            </div>

            <form onSubmit={handleDisable2FASubmit} className="space-y-4">
              <Input
                label="Current Password"
                type="password"
                value={disable2FAPassword}
                onChange={(e) => setDisable2FAPassword(e.target.value)}
                placeholder="Enter password"
                autoFocus
                required
              />

              <div className="flex items-center justify-end gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setShowDisable2FAModal(false);
                    setDisable2FAPassword('');
                  }}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="danger"
                  size="sm"
                  isLoading={disable2FAMutation.isPending}
                >
                  Disable 2FA
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
