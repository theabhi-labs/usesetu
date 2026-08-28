import { useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toPng } from 'html-to-image';
import { cmsApi } from '../../services/cms.api';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../ui/Dialog';
import { Eye, Download, Printer, Share2, Copy, Check, ShieldAlert } from 'lucide-react';

interface CustomerCardProps {
  customer: {
    _id?: string;
    id?: string;
    name: string;
    email?: string;
    mobile: string;
    isActive?: boolean;
    cardVerificationToken?: string;
    avatar?: {
      url: string;
    };
    createdAt?: string | Date;
  };
}

export function CustomerCard({ customer }: CustomerCardProps) {
  const cardRef = useRef<HTMLDivElement | null>(null);
  const queryClient = useQueryClient();
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedId, setCopiedId] = useState(false);

  const searchParams = new URLSearchParams(window.location.search);
  const tenantParam = searchParams.get('tenant') || searchParams.get('app');

  // Fetch Website Settings for Organization Branding
  const settingsQuery = useQuery({
    queryKey: ['publicSettingsForCard', tenantParam],
    queryFn: () => cmsApi.getSettings(),
  });

  const settings = settingsQuery.data || {
    cscName: 'Digital Seva Kendra',
    websiteName: 'Portal',
    logoUrl: '',
    tagline: 'Empowering Citizens Digitally',
  };


  const rawId = (customer as any)?._id || (customer as any)?.id || '';
  const getCustomerId = (id?: string) => {
    const val = id || rawId;
    if (!val) return 'CUST-000000';
    return 'CUST-' + (val.length > 6 ? val.substring(val.length - 6) : val).toUpperCase();
  };

  const formattedDate = customer?.createdAt
    ? new Date(customer.createdAt).toLocaleDateString('en-IN', {
        month: 'short',
        year: 'numeric',
      })
    : 'MEMBER';

  const verificationUrl = `${window.location.origin}/verify-customer/${customer.cardVerificationToken || ''}`;
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=140x140&data=${encodeURIComponent(verificationUrl)}`;

  // Download Card as PNG Image
  const handleDownloadPNG = async () => {
    if (!cardRef.current) return;
    setIsDownloading(true);
    try {
      // Small timeout to allow styles to settle
      await new Promise((r) => setTimeout(r, 100));
      const dataUrl = await toPng(cardRef.current, {
        cacheBust: true,
        pixelRatio: 2, // High resolution
        style: {
          transform: 'scale(1)',
          borderRadius: '0px',
        },
      });

      const link = document.createElement('a');
      link.download = `${customer.name.replace(/\s+/g, '_')}_Customer_Card.png`;
      link.href = dataUrl;
      link.click();
    } catch (error) {
      console.error('Failed to download card:', error);
    } finally {
      setIsDownloading(false);
    }
  };

  // Print Card — generates print-only Tailwind document
  const handlePrint = () => {
    if (!cardRef.current) return;
    const printWindow = window.open('', '_blank', 'width=800,height=600');
    if (printWindow) {
      const orgLogoMarkup = settings.logoUrl
        ? `<img src="${settings.logoUrl}" class="h-10 w-10 object-contain rounded" />`
        : `<div class="h-10 w-10 bg-indigo-600 rounded flex items-center justify-center font-bold text-white text-lg">C</div>`;

      const avatarMarkup = customer.avatar?.url
        ? `<img src="${customer.avatar.url}" class="h-28 w-24 object-cover border border-slate-300 rounded-md" />`
        : `<div class="h-28 w-24 bg-slate-100 border border-slate-300 rounded-md flex items-center justify-center font-bold text-slate-500 text-2xl uppercase select-none">${customer.name.substring(0, 2)}</div>`;

      printWindow.document.write(`
        <html>
          <head>
            <title>Print Customer Card - ${customer.name}</title>
            <link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet">
            <style>
              @media print {
                body { margin: 0; padding: 0; background: white; }
                @page { size: auto; margin: 0mm; }
                .no-print { display: none; }
              }
            </style>
          </head>
          <body class="bg-white flex items-center justify-center min-h-screen p-6">
            <div class="w-[500px] h-[315px] border-2 border-slate-800 rounded-2xl p-5 flex flex-col justify-between bg-white relative font-sans shadow-sm" style="box-sizing: border-box;">
              <!-- Header -->
              <div class="flex items-center gap-3 border-b border-slate-200 pb-3">
                ${orgLogoMarkup}
                <div class="text-left">
                  <h2 class="text-sm font-bold text-slate-800 uppercase tracking-tight">${settings.cscName || settings.websiteName}</h2>
                  <p class="text-[9px] font-bold text-indigo-600 uppercase tracking-wider">Customer Identification Card</p>
                </div>
              </div>

              <!-- Body -->
              <div class="flex gap-4 items-center flex-1 my-3">
                <!-- Photo -->
                <div class="shrink-0">
                  ${avatarMarkup}
                </div>

                <!-- Info -->
                <div class="text-left space-y-2 flex-1 min-w-0">
                  <div class="space-y-0.5">
                    <span class="text-xs text-slate-400 font-bold uppercase block tracking-wider">Name</span>
                    <span class="text-base font-extrabold text-slate-800 truncate block">${customer.name}</span>
                  </div>
                  <div class="space-y-0.5">
                    <span class="text-xs text-slate-400 font-bold uppercase block tracking-wider">Customer ID</span>
                    <span class="text-sm font-bold font-mono text-indigo-600 block">${getCustomerId()}</span>
                  </div>
                  <div class="space-y-0.5">
                    <span class="text-xs text-slate-400 font-bold uppercase block tracking-wider">Contact Number</span>
                    <span class="text-xs font-bold text-slate-700 font-mono block">${customer.mobile}</span>
                  </div>
                </div>

                <!-- QR Verification -->
                <div class="shrink-0 flex flex-col items-center gap-1">
                  <img src="${qrCodeUrl}" class="h-20 w-20 object-contain" />
                  <span class="text-[7px] text-slate-400 font-bold uppercase tracking-wider">Scan to Verify</span>
                </div>
              </div>

              <!-- Footer -->
              <div class="flex justify-between items-center border-t border-slate-100 pt-2 text-[10px]">
                <div class="text-left">
                  <span class="text-slate-400 font-bold mr-1">MEMBER SINCE:</span>
                  <span class="font-extrabold text-slate-700 uppercase">${formattedDate}</span>
                </div>
                <div class="flex items-center gap-1.5 font-bold">
                  <span class="h-2 w-2 rounded-full ${customer.isActive ? 'bg-green-500' : 'bg-red-500'}"></span>
                  <span class="${customer.isActive ? 'text-green-600' : 'text-red-600'} uppercase tracking-wider">${customer.isActive ? 'Active' : 'Inactive'}</span>
                </div>
              </div>
            </div>
            <script>
              window.onload = function() {
                window.focus();
                window.print();
                setTimeout(() => window.close(), 500);
              };
            </script>
          </body>
        </html>
      `);
      printWindow.document.close();
    }
  };

  // Share Card Handler
  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${customer.name} - Customer Card`,
          text: `Verifiable Customer Card for ${customer.name} at ${settings.cscName}`,
          url: verificationUrl,
        });
      } catch (err) {
        setIsShareOpen(true);
      }
    } else {
      setIsShareOpen(true);
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(verificationUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleCopyId = () => {
    navigator.clipboard.writeText(getCustomerId());
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  return (
    <Card className="p-6 space-y-6 text-left max-w-xl">
      <div className="border-b border-border pb-3 select-none">
        <h3 className="text-sm font-bold text-text-primary uppercase tracking-wider">Customer Card</h3>
        <p className="text-[10px] text-text-tertiary mt-0.5">Your official verifiable customer identification card.</p>
      </div>

      {/* Visual Card (Scaled 1.586 aspect ratio) */}
      <div className="flex justify-center select-none">
        <div
          ref={cardRef}
          className="w-full max-w-[480px] border border-border bg-surface rounded-2xl p-5 flex flex-col justify-between aspect-[1.586] shadow-sm relative overflow-hidden font-sans"
        >
          {/* Header */}
          <div className="flex items-center gap-3 border-b border-border pb-3">
            {settings.logoUrl ? (
              <img src={settings.logoUrl} className="h-10 w-10 object-contain rounded" />
            ) : (
              <div className="h-10 w-10 bg-accent rounded flex items-center justify-center font-bold text-white text-lg">C</div>
            )}
            <div className="text-left">
              <h2 className="text-xs sm:text-sm font-extrabold text-text-primary uppercase tracking-tight">
                {settings.cscName || settings.websiteName}
              </h2>
              <p className="text-[9px] font-bold text-accent uppercase tracking-wider">Customer Identification Card</p>
            </div>
          </div>

          {/* Body */}
          <div className="flex gap-4 items-center flex-1 my-3 min-w-0">
            {/* Photo */}
            <div className="shrink-0">
              {customer.avatar?.url ? (
                <img src={customer.avatar.url} className="h-28 w-24 object-cover border border-border rounded-md bg-surface-elevated" />
              ) : (
                <div className="h-28 w-24 bg-surface-elevated border border-border rounded-md flex items-center justify-center font-bold text-text-secondary text-2xl uppercase">
                  {(customer.name || 'CU').substring(0, 2)}
                </div>
              )}
            </div>

            {/* Info */}
            <div className="text-left space-y-2 flex-1 min-w-0">
              <div className="space-y-0.5">
                <span className="text-[10px] text-text-tertiary font-bold uppercase block tracking-wider">Name</span>
                <span className="text-sm sm:text-base font-extrabold text-text-primary truncate block">{customer.name || 'Valued Customer'}</span>
              </div>
              <div className="space-y-0.5">
                <span className="text-[10px] text-text-tertiary font-bold uppercase block tracking-wider">Customer ID</span>
                <div className="flex items-center gap-1">
                  <span className="text-xs sm:text-sm font-bold font-mono text-accent block">{getCustomerId()}</span>
                  <button onClick={handleCopyId} className="text-text-tertiary hover:text-accent p-0.5 rounded transition-colors cursor-pointer">
                    {copiedId ? <Check size={10} className="text-success" /> : <Copy size={10} />}
                  </button>
                </div>
              </div>
              <div className="space-y-0.5">
                <span className="text-[10px] text-text-tertiary font-bold uppercase block tracking-wider">Contact Number</span>
                <span className="text-xs font-bold text-text-secondary font-mono block">{customer.mobile}</span>
              </div>
            </div>

            {/* QR Verification */}
            <div className="shrink-0 flex flex-col items-center gap-1 select-none">
              <img src={qrCodeUrl} className="h-16 w-16 sm:h-20 sm:w-20 object-contain" alt="QR Code" />
              <span className="text-[7px] text-text-tertiary font-bold uppercase tracking-wider">Scan to Verify</span>
            </div>
          </div>

          {/* Footer */}
          <div className="flex justify-between items-center border-t border-border pt-2 text-[10px]">
            <div className="text-left">
              <span className="text-text-tertiary font-bold mr-1">MEMBER SINCE:</span>
              <span className="font-extrabold text-text-secondary uppercase">{formattedDate}</span>
            </div>
            <div className="flex items-center gap-1.5 font-bold">
              <span className={`h-2 w-2 rounded-full ${customer.isActive ? 'bg-success' : 'bg-error'}`}></span>
              <span className={`${customer.isActive ? 'text-success' : 'text-error'} uppercase tracking-wider`}>
                {customer.isActive ? 'Active' : 'Inactive'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Buttons */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 select-none">
        <Button size="sm" variant="outline" onClick={() => setIsPreviewOpen(true)}>
          <Eye size={12} className="mr-1.5" /> Preview
        </Button>
        <Button size="sm" variant="outline" onClick={handleShare}>
          <Share2 size={12} className="mr-1.5" /> Share
        </Button>
        <Button size="sm" variant="outline" onClick={handleDownloadPNG} isLoading={isDownloading}>
          <Download size={12} className="mr-1.5" /> Download PNG
        </Button>
        <Button size="sm" variant="outline" onClick={handlePrint}>
          <Printer size={12} className="mr-1.5" /> Print
        </Button>
      </div>

      {/* Card Preview Modal */}
      <Dialog isOpen={isPreviewOpen} onClose={() => setIsPreviewOpen(false)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Customer Identification Card</DialogTitle>
          </DialogHeader>

          <div className="py-6 flex justify-center bg-surface-elevated rounded-lg p-4 my-2 border border-border">
            {/* Same design wrapper */}
            <div className="w-full max-w-[420px] border border-slate-300 bg-white rounded-xl p-5 flex flex-col justify-between aspect-[1.586] text-slate-800 shadow-lg">
              <div className="flex items-center gap-3 border-b border-slate-200 pb-3">
                {settings.logoUrl ? (
                  <img src={settings.logoUrl} className="h-10 w-10 object-contain rounded" />
                ) : (
                  <div className="h-10 w-10 bg-indigo-600 rounded flex items-center justify-center font-bold text-white text-lg">C</div>
                )}
                <div className="text-left">
                  <h2 className="text-xs font-bold text-slate-800 uppercase tracking-tight">
                    {settings.cscName || settings.websiteName}
                  </h2>
                  <p className="text-[9px] font-bold text-indigo-600 uppercase tracking-wider">Customer Identification Card</p>
                </div>
              </div>

              <div className="flex gap-4 items-center flex-1 my-3 min-w-0">
                <div className="shrink-0">
                  {customer.avatar?.url ? (
                    <img src={customer.avatar.url} className="h-24 w-20 object-cover border border-slate-200 rounded-md bg-slate-50" />
                  ) : (
                    <div className="h-24 w-20 bg-slate-100 border border-slate-200 rounded-md flex items-center justify-center font-bold text-slate-500 text-lg uppercase">
                      {(customer.name || 'CU').substring(0, 2)}
                    </div>
                  )}
                </div>

                <div className="text-left space-y-1.5 flex-1 min-w-0">
                  <div className="space-y-0.5">
                    <span className="text-[9px] text-slate-400 font-bold uppercase block tracking-wider">Name</span>
                    <span className="text-sm font-extrabold text-slate-800 truncate block">{customer.name || 'Valued Customer'}</span>
                  </div>
                  <div className="space-y-0.5">
                    <span className="text-[9px] text-slate-400 font-bold uppercase block tracking-wider">Customer ID</span>
                    <span className="text-xs font-bold font-mono text-indigo-600 block">{getCustomerId()}</span>
                  </div>
                  <div className="space-y-0.5">
                    <span className="text-[9px] text-slate-400 font-bold uppercase block tracking-wider">Contact</span>
                    <span className="text-xs font-bold text-slate-700 font-mono block">{customer.mobile}</span>
                  </div>
                </div>

                <div className="shrink-0 flex flex-col items-center gap-0.5">
                  <img src={qrCodeUrl} className="h-16 w-16 object-contain" alt="QR" />
                  <span className="text-[6px] text-slate-400 font-bold uppercase tracking-wider">Verify Link</span>
                </div>
              </div>

              <div className="flex justify-between items-center border-t border-slate-100 pt-2 text-[9px]">
                <div className="text-left">
                  <span className="text-slate-400 font-bold mr-1">SINCE:</span>
                  <span className="font-extrabold text-slate-700 uppercase">{formattedDate}</span>
                </div>
                <div className="flex items-center gap-1 font-bold">
                  <span className={`h-1.5 w-1.5 rounded-full ${customer.isActive ? 'bg-green-500' : 'bg-red-500'}`}></span>
                  <span className={`${customer.isActive ? 'text-green-600' : 'text-red-600'} uppercase tracking-wider`}>
                    {customer.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button size="sm" variant="outline" onClick={() => setIsPreviewOpen(false)}>
              Close
            </Button>
            <Button size="sm" onClick={handleDownloadPNG}>
              Download PNG
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Share Links Dialog */}
      <Dialog isOpen={isShareOpen} onClose={() => setIsShareOpen(false)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Share Customer Card</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-3 text-xs text-left">
            <p className="text-text-secondary">Copy the secure card verification page link below to share with others:</p>

            <div className="flex border border-border rounded-md bg-surface-elevated p-2 items-center justify-between font-mono">
              <span className="truncate text-text-primary select-all max-w-[80%]">{verificationUrl}</span>
              <Button size="sm" variant="secondary" onClick={handleCopyLink} className="h-7">
                {copiedLink ? <Check size={12} className="text-success mr-1" /> : <Copy size={12} className="mr-1" />}
                {copiedLink ? 'Copied' : 'Copy'}
              </Button>
            </div>

            <div className="flex gap-2 justify-end pt-2">
              <a
                href={`https://wa.me/?text=${encodeURIComponent(`Verifiable Customer ID Card for ${customer.name}: ${verificationUrl}`)}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button size="sm" className="bg-success hover:bg-success-hover text-white">
                  Share to WhatsApp
                </Button>
              </a>
            </div>
          </div>

          <DialogFooter>
            <Button size="sm" variant="outline" onClick={() => setIsShareOpen(false)}>
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
