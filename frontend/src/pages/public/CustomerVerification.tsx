import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { authApi } from '../../services/auth.api';
import { cmsApi } from '../../services/cms.api';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Skeleton } from '../../components/ui/Skeleton';
import { CheckCircle2, AlertOctagon, ShieldCheck } from 'lucide-react';

export function CustomerVerification() {
  const { token } = useParams<{ token: string }>();

  // Fetch Verification Data
  const verificationQuery = useQuery({
    queryKey: ['publicVerifyCustomerCard', token],
    queryFn: () => authApi.verifyCard(token || ''),
    enabled: !!token,
    retry: false,
  });

  // Fetch Settings for Branding
  const settingsQuery = useQuery({
    queryKey: ['publicSettingsForVerify'],
    queryFn: () => cmsApi.getSettings(),
  });

  const settings = settingsQuery.data || {
    cscName: 'CSC OS Digital Seva',
    websiteName: 'CSC OS Portal',
    logoUrl: '',
    tagline: 'Empowering Citizens Digitally',
  };

  const info = verificationQuery.data;

  return (
    <div className="min-h-screen bg-bg flex flex-col justify-between items-center p-4">
      {/* Header */}
      <div className="py-6 select-none flex flex-col items-center gap-2">
        <div className="flex items-center gap-2">
          {settings.logoUrl ? (
            <img src={settings.logoUrl} className="h-8 w-8 object-contain rounded" alt="Logo" />
          ) : (
            <div className="h-8 w-8 bg-accent rounded flex items-center justify-center font-bold text-white text-base">C</div>
          )}
          <span className="font-extrabold text-sm tracking-tight text-text-primary uppercase">
            {settings.cscName || settings.websiteName}
          </span>
        </div>
      </div>

      {/* Main Card */}
      <div className="w-full max-w-md my-auto">
        {verificationQuery.isLoading ? (
          <Card className="p-8 text-center space-y-4">
            <Skeleton className="h-12 w-12 rounded-full mx-auto animate-pulse" />
            <Skeleton className="h-6 w-48 mx-auto animate-pulse" />
            <Skeleton className="h-20 w-full animate-pulse" />
          </Card>
        ) : verificationQuery.isError ? (
          <Card className="p-8 text-center space-y-6 border-error/20 bg-error/5">
            <div className="flex justify-center">
              <AlertOctagon size={48} className="text-error" />
            </div>
            <div className="space-y-2 select-none">
              <h2 className="text-xl font-bold text-text-primary">Verification Failed</h2>
              <p className="text-xs text-text-secondary">
                The card identification token is invalid, revoked, or has expired.
              </p>
            </div>
            <Link to="/">
              <Button className="w-full mt-2">Go to Homepage</Button>
            </Link>
          </Card>
        ) : (
          <Card className="p-8 space-y-6 border-success/20 bg-success/5 shadow-lg">
            {/* Verification Header */}
            <div className="text-center space-y-4 select-none">
              <div className="flex justify-center">
                <CheckCircle2 size={54} className="text-success" />
              </div>
              <div className="space-y-1">
                <h2 className="text-lg font-bold text-text-primary uppercase tracking-wide">Customer Verified</h2>
                <div className="flex items-center justify-center gap-1.5 text-success font-semibold text-xs uppercase tracking-wider">
                  <ShieldCheck size={14} /> Official Customer Identity
                </div>
              </div>
            </div>

            {/* Profile Grid */}
            <div className="divide-y divide-border border border-border rounded-md overflow-hidden bg-surface text-xs text-left">
              <div className="p-3.5 flex justify-between gap-4">
                <span className="text-text-secondary select-none font-bold uppercase text-[10px]">Customer ID</span>
                <span className="font-mono font-bold text-accent">{info.customerId}</span>
              </div>
              <div className="p-3.5 flex justify-between gap-4">
                <span className="text-text-secondary select-none font-bold uppercase text-[10px]">Full Name</span>
                <span className="font-extrabold text-text-primary">{info.name}</span>
              </div>
              <div className="p-3.5 flex justify-between gap-4">
                <span className="text-text-secondary select-none font-bold uppercase text-[10px]">Account Status</span>
                <span className={`font-bold uppercase tracking-wider ${info.isActive ? 'text-success' : 'text-error'}`}>
                  ● {info.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>
              <div className="p-3.5 flex justify-between gap-4">
                <span className="text-text-secondary select-none font-bold uppercase text-[10px]">Contact Mobile</span>
                <span className="font-mono font-bold text-text-secondary">{info.mobile}</span>
              </div>
              <div className="p-3.5 flex justify-between gap-4">
                <span className="text-text-secondary select-none font-bold uppercase text-[10px]">Member Since</span>
                <span className="font-semibold text-text-secondary">
                  {new Date(info.memberSince).toLocaleDateString('en-IN', {
                    month: 'long',
                    year: 'numeric',
                  })}
                </span>
              </div>
            </div>

            {/* Action home link */}
            <Link to="/">
              <Button className="w-full select-none">Visit Public Portal</Button>
            </Link>
          </Card>
        )}
      </div>

      {/* Footer */}
      <div className="py-6 select-none text-[10px] text-text-tertiary font-medium">
        © {new Date().getFullYear()} {settings.cscName || settings.websiteName}. All Rights Reserved.
      </div>
    </div>
  );
}
