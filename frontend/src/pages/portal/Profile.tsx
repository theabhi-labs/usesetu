import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { useAuth } from '../../hooks/useAuth';
import { notificationApi } from '../../services/notification.api';
import { authApi } from '../../services/auth.api';
import { CustomerCard } from '../../components/common/CustomerCard';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Checkbox } from '../../components/ui/Checkbox';
import { Skeleton } from '../../components/ui/Skeleton';
import { TwoFactorSetupModal } from '../../components/auth/TwoFactorSetupModal';
import { ThemeToggle } from '../../components/common/ThemeToggle';
import {
  User as UserIcon,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  Camera,
  LogOut,
  Edit3,
  Check,
  X,
  Phone,
  Mail,
  CreditCard,
  Settings,
  Lock,
  UploadCloud,
} from 'lucide-react';

export function Profile() {
  const { user, setSession, accessToken } = useAuthStore();
  const { logout } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Profile Edit State
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileName, setProfileName] = useState(user?.name || '');
  const [profileMobile, setProfileMobile] = useState(user?.mobile || '');
  const [profileError, setProfileError] = useState('');
  const [profileSuccess, setProfileSuccess] = useState('');
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);

  // 2FA States
  const [setup2FAModalOpen, setSetup2FAModalOpen] = useState(false);
  const [showDisable2FAModal, setShowDisable2FAModal] = useState(false);
  const [disable2FAPassword, setDisable2FAPassword] = useState('');
  const [twoFactorMessage, setTwoFactorMessage] = useState<string | null>(null);
  const [twoFactorError, setTwoFactorError] = useState<string | null>(null);

  // Notification Preferences
  const [emailNotif, setEmailNotif] = useState(true);
  const [inAppNotif, setInAppNotif] = useState(true);

  // Change Password Form
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passError, setPassError] = useState('');
  const [passSuccess, setPassSuccess] = useState('');

  // Sync profile fields when user changes
  useEffect(() => {
    if (user) {
      setProfileName(user.name || '');
      setProfileMobile(user.mobile || '');
    }
  }, [user]);

  // Queries
  const preferencesQuery = useQuery({
    queryKey: ['notificationPreferences'],
    queryFn: notificationApi.getPreferences,
  });

  useEffect(() => {
    if (preferencesQuery.data) {
      setEmailNotif(preferencesQuery.data.email ?? true);
      setInAppNotif(preferencesQuery.data.in_app ?? true);
    }
  }, [preferencesQuery.data]);

  // Preferences Mutation
  const updatePrefsMutation = useMutation({
    mutationFn: (body: { email: boolean; in_app: boolean }) =>
      notificationApi.updatePreferences(body),
  });

  // Profile Update Mutation
  const updateProfileMutation = useMutation({
    mutationFn: (body: { name?: string; mobile?: string }) => authApi.updateProfile(body),
    onSuccess: (data) => {
      if (data.user && accessToken) {
        setSession(data.user, accessToken);
      }
      queryClient.invalidateQueries({ queryKey: ['portalRecentRequests'] });
      setProfileSuccess('Profile updated successfully!');
      setProfileError('');
      setIsEditingProfile(false);
      setTimeout(() => setProfileSuccess(''), 4000);
    },
    onError: (err: any) => {
      setProfileError(err.response?.data?.message || err.message || 'Failed to update profile');
      setProfileSuccess('');
    },
  });

  // Photo Upload Handler
  const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setProfileError('Please upload a valid image file (JPG, PNG, WEBP)');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setProfileError('Image file size must be less than 5MB');
      return;
    }

    setIsUploadingPhoto(true);
    setProfileError('');
    setProfileSuccess('');

    try {
      const data = await authApi.uploadAvatar(file);
      if (data.user && accessToken) {
        setSession(data.user, accessToken);
      }
      setProfileSuccess('Profile photo updated successfully!');
      setTimeout(() => setProfileSuccess(''), 4000);
    } catch (err: any) {
      setProfileError(err.response?.data?.message || 'Failed to upload photo');
    } finally {
      setIsUploadingPhoto(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!profileName.trim()) {
      setProfileError('Name cannot be empty');
      return;
    }
    if (!/^[6-9]\d{9}$/.test(profileMobile.trim())) {
      setProfileError('Please enter a valid 10-digit Indian mobile number');
      return;
    }

    setProfileError('');
    updateProfileMutation.mutate({
      name: profileName.trim(),
      mobile: profileMobile.trim(),
    });
  };

  // 2FA Mutation
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

  const handleDisable2FASubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!disable2FAPassword) {
      setTwoFactorError('Password is required');
      return;
    }
    disable2FAMutation.mutate(disable2FAPassword);
  };

  const handlePreferencesChange = (type: 'email' | 'in_app', checked: boolean) => {
    const nextPrefs = {
      email: type === 'email' ? checked : emailNotif,
      in_app: type === 'in_app' ? checked : inAppNotif,
    };
    if (type === 'email') setEmailNotif(checked);
    if (type === 'in_app') setInAppNotif(checked);

    updatePrefsMutation.mutate(nextPrefs);
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!oldPassword || !newPassword || !confirmPassword) {
      setPassError('All password fields are required.');
      return;
    }
    if (newPassword.length < 8) {
      setPassError('New password must be at least 8 characters long.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPassError('New passwords do not match.');
      return;
    }

    setPassError('');
    setPassSuccess('');
    try {
      await authApi.changePassword({ currentPassword: oldPassword, newPassword });
      setPassSuccess('Password updated successfully!');
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setPassError(err?.response?.data?.message || 'Password update failed.');
    }
  };

  const handleLogout = async () => {
    await logout.mutateAsync();
    navigate('/login');
  };

  return (
    <div className="p-4 sm:p-6 text-left space-y-8 max-w-5xl mx-auto text-xs">
      {/* Header */}
      <div className="border-b border-border pb-4 flex flex-col sm:flex-row justify-between sm:items-center gap-2">
        <div>
          <h1 className="text-2xl font-bold font-sans text-text-primary flex items-center gap-2 select-none">
            <UserIcon size={24} className="text-accent" /> Account & ID Profile
          </h1>
          <p className="text-xs text-text-secondary mt-0.5 select-none">
            View your official customer ID card, manage personal details, security credentials, and preferences.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleLogout}
            className="text-error border-error/30 hover:bg-error/10 hover:border-error text-xs font-semibold gap-1.5"
          >
            <LogOut size={14} /> Sign Out
          </Button>
        </div>
      </div>

      {/* Global Toast Messages */}
      {twoFactorMessage && (
        <div className="p-3 rounded-xl bg-success/15 border border-success/30 text-success text-xs font-medium flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{twoFactorMessage}</span>
        </div>
      )}

      {profileSuccess && (
        <div className="p-3 rounded-xl bg-success/15 border border-success/30 text-success text-xs font-medium flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{profileSuccess}</span>
        </div>
      )}

      {profileError && (
        <div className="p-3 rounded-xl bg-error/15 border border-error/30 text-error text-xs font-medium flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{profileError}</span>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* SECTION 1: CUSTOMER ID CARD (FIRST) & PERSONAL PROFILE (SIDE-BY-SIDE) */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column (Customer Card) - Takes 7 Cols on desktop */}
        <div className="lg:col-span-7 space-y-2">
          <div className="flex items-center gap-2 select-none mb-1">
            <CreditCard size={16} className="text-accent" />
            <h2 className="text-sm font-bold text-text-primary uppercase tracking-wider">Official Customer ID Card</h2>
          </div>
          {user ? (
            <CustomerCard customer={user as any} />
          ) : (
            <Skeleton className="h-80 w-full animate-pulse rounded-2xl" />
          )}
        </div>

        {/* Right Column (Personal Profile & Photo Upload) - Takes 5 Cols on desktop */}
        <div className="lg:col-span-5 space-y-2">
          <div className="flex items-center justify-between select-none mb-1">
            <div className="flex items-center gap-2">
              <UserIcon size={16} className="text-accent" />
              <h2 className="text-sm font-bold text-text-primary uppercase tracking-wider">Personal Profile</h2>
            </div>
            {!isEditingProfile && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsEditingProfile(true)}
                className="h-7 text-xs font-semibold gap-1"
              >
                <Edit3 size={12} /> Edit Profile
              </Button>
            )}
          </div>

          <Card className="p-5 space-y-5">
            {/* Avatar & Photo Upload Section */}
            <div className="flex items-center gap-4 border-b border-border pb-4">
              <div className="relative group shrink-0">
                <div className="h-20 w-20 rounded-2xl bg-surface-elevated border-2 border-border flex items-center justify-center font-bold text-text-primary uppercase overflow-hidden shadow-inner ring-2 ring-border/50">
                  {user?.avatar?.url ? (
                    <img
                      src={user.avatar.url}
                      alt={user?.name || 'Avatar'}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <span className="text-2xl text-text-secondary">{(user?.name || 'CU').substring(0, 2)}</span>
                  )}
                </div>

                {/* Photo Upload Overlay Button */}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploadingPhoto}
                  className="absolute inset-0 bg-black/60 rounded-2xl flex flex-col items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer border-none"
                  title="Upload New Photo"
                >
                  <Camera size={18} />
                  <span className="text-[9px] font-bold mt-1">Change</span>
                </button>
              </div>

              <div className="text-left space-y-1 flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="font-extrabold text-sm sm:text-base text-text-primary truncate">{user?.name}</h3>
                  <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold uppercase bg-success/15 border border-success/30 text-success">
                    Active
                  </span>
                </div>
                <p className="text-[11px] text-text-secondary truncate">{user?.email}</p>

                {/* Upload Button */}
                <div className="pt-1">
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handlePhotoSelect}
                    accept="image/png, image/jpeg, image/webp"
                    className="hidden"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    isLoading={isUploadingPhoto}
                    className="h-7 text-[11px] gap-1.5"
                  >
                    <UploadCloud size={13} />
                    <span>{isUploadingPhoto ? 'Uploading...' : 'Upload Photo'}</span>
                  </Button>
                </div>
              </div>
            </div>

            {/* Profile Form Details */}
            {isEditingProfile ? (
              <form onSubmit={handleSaveProfile} className="space-y-4 text-left">
                <div className="space-y-1.5">
                  <label className="font-bold text-text-secondary select-none">Full Name</label>
                  <Input
                    value={profileName}
                    onChange={(e) => setProfileName(e.target.value)}
                    placeholder="Enter your full name"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="font-bold text-text-secondary select-none">Mobile Number</label>
                  <Input
                    value={profileMobile}
                    onChange={(e) => setProfileMobile(e.target.value)}
                    placeholder="10-digit mobile number"
                    maxLength={10}
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="font-bold text-text-secondary select-none">Email Address (Read-only)</label>
                  <Input value={user?.email || ''} readOnly disabled className="opacity-70 bg-surface" />
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <Button
                    type="submit"
                    size="sm"
                    isLoading={updateProfileMutation.isPending}
                    className="gap-1.5 flex-1"
                  >
                    <Check size={14} /> Save Profile
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setIsEditingProfile(false);
                      setProfileName(user?.name || '');
                      setProfileMobile(user?.mobile || '');
                      setProfileError('');
                    }}
                    className="gap-1"
                  >
                    <X size={14} /> Cancel
                  </Button>
                </div>
              </form>
            ) : (
              <div className="space-y-3 text-left">
                <div className="p-2.5 rounded-lg bg-surface border border-border flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <UserIcon size={14} className="text-text-tertiary" />
                    <div>
                      <span className="text-[10px] text-text-tertiary block font-bold uppercase">Full Name</span>
                      <span className="font-bold text-text-primary text-xs">{user?.name}</span>
                    </div>
                  </div>
                </div>

                <div className="p-2.5 rounded-lg bg-surface border border-border flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Phone size={14} className="text-text-tertiary" />
                    <div>
                      <span className="text-[10px] text-text-tertiary block font-bold uppercase">Mobile Number</span>
                      <span className="font-mono font-bold text-text-primary text-xs">{user?.mobile || 'Not set'}</span>
                    </div>
                  </div>
                </div>

                <div className="p-2.5 rounded-lg bg-surface border border-border flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Mail size={14} className="text-text-tertiary" />
                    <div>
                      <span className="text-[10px] text-text-tertiary block font-bold uppercase">Email Address</span>
                      <span className="text-text-primary text-xs truncate max-w-[180px] block">{user?.email}</span>
                    </div>
                  </div>
                  <span className="text-[9px] font-bold text-success bg-success/15 px-1.5 py-0.5 rounded border border-success/30">
                    Verified
                  </span>
                </div>

                <div className="p-2.5 rounded-lg bg-surface border border-border flex items-center justify-between text-[10px]">
                  <span className="text-text-tertiary font-bold uppercase">Customer ID</span>
                  <span className="font-mono font-bold text-accent">
                    CUST-{(user?.id || (user as any)?._id || '000000').substring(18).toUpperCase()}
                  </span>
                </div>
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* SECTION 2: CHANGE PASSWORD & SECURITY / LOGOUT (BOTTOM)                */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start pt-2">
        {/* Change Password Card */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 select-none mb-1">
            <Lock size={16} className="text-accent" />
            <h2 className="text-sm font-bold text-text-primary uppercase tracking-wider">Change Password</h2>
          </div>

          <Card className="p-5 space-y-4">
            <p className="text-xs text-text-secondary leading-relaxed">
              Keep your account secure by using a strong password with at least 8 characters.
            </p>

            {passError && (
              <div className="p-2.5 rounded-lg bg-error/15 border border-error/30 text-error text-[11px] font-medium flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{passError}</span>
              </div>
            )}
            {passSuccess && (
              <div className="p-2.5 rounded-lg bg-success/15 border border-success/30 text-success text-[11px] font-medium flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{passSuccess}</span>
              </div>
            )}

            <form onSubmit={handleChangePassword} className="space-y-3">
              <div className="space-y-1.5">
                <label className="font-bold text-text-secondary select-none">Current Password</label>
                <Input
                  type="password"
                  value={oldPassword}
                  onChange={(e) => setOldPassword(e.target.value)}
                  placeholder="Enter current password"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <label className="font-bold text-text-secondary select-none">New Password</label>
                <Input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="At least 8 characters"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <label className="font-bold text-text-secondary select-none">Confirm New Password</label>
                <Input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter new password"
                  required
                />
              </div>
              <Button type="submit" className="w-full mt-2 font-bold">
                Update Password
              </Button>
            </form>
          </Card>
        </div>

        {/* Security & Logout Card */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 select-none mb-1">
            <ShieldCheck size={16} className="text-accent" />
            <h2 className="text-sm font-bold text-text-primary uppercase tracking-wider">Security & Session</h2>
          </div>

          <div className="space-y-4">
            {/* Two-Factor Authentication Card */}
            <Card className="p-5 space-y-3.5">
              <div className="flex items-center justify-between border-b border-border pb-2">
                <h3 className="font-bold text-text-primary text-xs sm:text-sm flex items-center gap-1.5 select-none">
                  <ShieldCheck size={16} className="text-accent" /> Two-Factor Authentication
                </h3>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    user?.twoFactor?.enabled
                      ? 'bg-success/20 text-success'
                      : 'bg-warning/20 text-warning'
                  }`}
                >
                  {user?.twoFactor?.enabled ? `Active (${user.twoFactor.method?.toUpperCase()})` : 'Not Configured'}
                </span>
              </div>

              {twoFactorError && (
                <div className="p-2.5 rounded-lg bg-error/15 border border-error/30 text-error text-[11px] font-medium flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{twoFactorError}</span>
                </div>
              )}

              <p className="text-xs text-text-secondary leading-relaxed">
                Add an extra layer of protection to your customer portal and encrypted document locker with 2FA verification.
              </p>

              <div className="pt-1 flex items-center justify-between">
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
                    className="gap-1.5 text-xs font-bold shadow-sm"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Setup 2FA</span>
                  </Button>
                )}
              </div>
            </Card>

            {/* Appearance & Theme Mode Card */}
            <Card className="p-5 space-y-3">
              <div className="flex items-center justify-between border-b border-border pb-2">
                <h3 className="font-bold text-text-primary text-xs sm:text-sm flex items-center gap-1.5 select-none">
                  <Sparkles size={16} className="text-accent" /> Theme & Appearance
                </h3>
              </div>
              <p className="text-xs text-text-secondary">
                Choose your preferred visual theme for the citizen portal and dashboards.
              </p>
              <div className="pt-1 flex items-center justify-between">
                <span className="text-xs font-semibold text-text-primary">Interface Theme</span>
                <ThemeToggle variant="segmented" />
              </div>
            </Card>

            {/* Channel Preferences Card */}
            <Card className="p-5 space-y-3">
              <h3 className="font-bold text-text-primary text-xs sm:text-sm flex items-center gap-1.5 border-b border-border pb-2 select-none">
                <Settings size={16} /> Notifications
              </h3>

              {preferencesQuery.isLoading ? (
                <Skeleton className="h-10 w-full animate-pulse" />
              ) : (
                <div className="flex flex-col gap-2.5 pt-1 select-none">
                  <Checkbox
                    id="prefEmail"
                    label="Receive request updates via Email"
                    checked={emailNotif}
                    onChange={(e) => handlePreferencesChange('email', e.target.checked)}
                  />
                  <Checkbox
                    id="prefInApp"
                    label="Receive portal and locker notifications"
                    checked={inAppNotif}
                    onChange={(e) => handlePreferencesChange('in_app', e.target.checked)}
                  />
                </div>
              )}
            </Card>

            {/* Logout Option Card */}
            <Card className="p-4 bg-error/5 border-error/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="text-left space-y-0.5">
                <span className="font-bold text-text-primary text-xs flex items-center gap-1.5">
                  <LogOut size={14} className="text-error" /> End Session
                </span>
                <p className="text-[11px] text-text-secondary">Sign out of your account on this device.</p>
              </div>
              <Button
                type="button"
                variant="danger"
                size="sm"
                onClick={handleLogout}
                className="gap-1.5 font-bold shrink-0"
              >
                <LogOut size={14} /> Sign Out Now
              </Button>
            </Card>
          </div>
        </div>
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
                <p className="text-xs text-text-secondary mt-0.5">Please enter your password to confirm disabling 2FA.</p>
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

