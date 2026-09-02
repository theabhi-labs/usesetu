import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { cmsApi } from '../../services/cms.api';
import { useToastStore } from '../../store/toastStore';
import type { WebsiteSetting, MenuItem, Banner, Announcement } from '../../types/cms.types';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Textarea } from '../../components/ui/Textarea';
import { Checkbox } from '../../components/ui/Checkbox';
import { Select } from '../../components/ui/Select';
import { Skeleton } from '../../components/ui/Skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/Dialog';
import { MediaPickerModal } from '../../components/common/MediaPickerModal';
import { Table, THead, TBody, TR, TH, TD } from '../../components/ui/Table';
import { Badge } from '../../components/ui/Badge';
import {
  ArrowUp,
  ArrowDown,
  Edit2,
  Trash2,
  Plus,
  Monitor,
  AlertOctagon,
  FolderOpen,
  Sparkles,
  ExternalLink,
  Layout,
  PanelLeft,
  PanelRight,
  Code2,
  Image as ImageIcon,
  FileText,
  Copy,
  Check,
} from 'lucide-react';

const UNIVERSAL_AI_BANNER_PROMPT = `Create a sleek, modern vertical HTML greeting card/banner that fits 100% in a container of width: 240px and height: 380px without any scrollbars (overflow: hidden).

Specifications:
- Use inline CSS styles only (style="...").
- Flexbox layout: display: flex; flex-direction: column; justify-content: space-between; align-items: center; width: 100%; height: 100%; min-height: 340px; box-sizing: border-box; padding: 16px; border-radius: 14px; text-align: center; overflow: hidden;
- Background: Vibrant modern CSS gradient with subtle border.
- Top: Circular white/glass icon badge with festive emoji/icon.
- Middle: Catchy Hindi and English greeting typography (e.g. Shubh Deepawali / Happy Raksha Bandhan / Eid Mubarak / Special Offer).
- Bottom: Small badge ("✨ Digital Seva Kendra").
- Target Occasion/Festival: [Change this to Diwali / Holi / Raksha Bandhan / Eid / Independence Day / New Year / Kendra Offer]`;

export function CMSConfig() {
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const tenantParam = searchParams.get('tenant') || searchParams.get('app');
  const [activeTab, setActiveTab] = useState<'settings' | 'menus' | 'pages' | 'banners' | 'faqs' | 'announcements' | 'side_displays'>('settings');

  // Media Picker Trigger State
  const [isMediaPickerOpen, setIsMediaPickerOpen] = useState(false);
  const [mediaPickerTarget, setMediaPickerTarget] = useState<
    'settings_logo' | 'banner' | 'page' | 'hero_bg' | 'left_wing_banner' | 'right_wing_banner' | null
  >(null);

  // Settings states
  const [websiteName, setWebsiteName] = useState('');
  const [cscName, setCscName] = useState('');
  const [tagline, setTagline] = useState('');
  const [description, setDescription] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [address, setAddress] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [maintenanceEnabled, setMaintenanceEnabled] = useState(false);
  const [maintenanceMessage, setMaintenanceMessage] = useState('');
  const [maintenanceDuration, setMaintenanceDuration] = useState('');

  // Hero Background / Thumbnails State
  const [heroBgEnabled, setHeroBgEnabled] = useState(false);
  const [heroBgImages, setHeroBgImages] = useState<string[]>([]);
  const [heroOverlayOpacity, setHeroOverlayOpacity] = useState(0.65);
  const [heroAutoPlaySeconds, setHeroAutoPlaySeconds] = useState(5);
  const [customHeroImageUrl, setCustomHeroImageUrl] = useState('');

  // Side Displays & Wings State
  const [sideDisplaysEnabled, setSideDisplaysEnabled] = useState(false);
  // Left Wing
  const [leftWingEnabled, setLeftWingEnabled] = useState(false);
  const [leftWingType, setLeftWingType] = useState<'banner' | 'legal_pages' | 'custom_html'>('banner');
  const [leftWingTitle, setLeftWingTitle] = useState('Festival Greetings');
  const [leftWingBannerUrl, setLeftWingBannerUrl] = useState('');
  const [leftWingBannerLink, setLeftWingBannerLink] = useState('');
  const [leftWingCustomHtml, setLeftWingCustomHtml] = useState('');
  const [leftWingShowLegal, setLeftWingShowLegal] = useState(false);

  // Right Wing
  const [rightWingEnabled, setRightWingEnabled] = useState(false);
  const [rightWingType, setRightWingType] = useState<'banner' | 'legal_pages' | 'custom_html'>('legal_pages');
  const [rightWingTitle, setRightWingTitle] = useState('Important Links');
  const [rightWingBannerUrl, setRightWingBannerUrl] = useState('');
  const [rightWingBannerLink, setRightWingBannerLink] = useState('');
  const [rightWingCustomHtml, setRightWingCustomHtml] = useState('');
  const [rightWingShowLegal, setRightWingShowLegal] = useState(true);

  // Menus tab states
  const [menuLocation, setMenuLocation] = useState<'header' | 'footer' | 'sidebar'>('header');
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [isMenuModalOpen, setIsMenuModalOpen] = useState(false);
  const [editingMenuItem, setEditingMenuItem] = useState<MenuItem | null>(null);
  const [menuLabel, setMenuLabel] = useState('');
  const [menuUrl, setMenuUrl] = useState('');
  const [menuOpenInNewTab, setMenuOpenInNewTab] = useState(false);

  // Pages tab states
  const [isPageModalOpen, setIsPageModalOpen] = useState(false);
  const [editingPage, setEditingPage] = useState<any>(null);
  const [pageTitle, setPageTitle] = useState('');
  const [pageSlug, setPageSlug] = useState('');
  const [pageContent, setPageContent] = useState('');
  const [pageStatus, setPageStatus] = useState<'draft' | 'published'>('draft');

  // Banners tab states
  const [isBannerModalOpen, setIsBannerModalOpen] = useState(false);
  const [editingBanner, setEditingBanner] = useState<any>(null);
  const [bannerTitle, setBannerTitle] = useState('');
  const [bannerSubtitle, setBannerSubtitle] = useState('');
  const [bannerCtaText, setBannerCtaText] = useState('');
  const [bannerCtaLink, setBannerCtaLink] = useState('');
  const [bannerDevice, setBannerDevice] = useState<'desktop' | 'mobile' | 'both'>('both');
  const [bannerImageUrl, setBannerImageUrl] = useState('');
  const [bannerFile, setBannerFile] = useState<File | null>(null);

  // FAQs tab states
  const [isFaqModalOpen, setIsFaqModalOpen] = useState(false);
  const [editingFaq, setEditingFaq] = useState<any>(null);
  const [faqQuestion, setFaqQuestion] = useState('');
  const [faqAnswer, setFaqAnswer] = useState('');

  // Announcements states
  const [isAnnModalOpen, setIsAnnModalOpen] = useState(false);
  const [editingAnn, setEditingAnn] = useState<any>(null);
  const [annTitle, setAnnTitle] = useState('');
  const [annContent, setAnnContent] = useState('');
  const [annType, setAnnType] = useState<'notice' | 'holiday' | 'new_scheme' | 'portal_down'>('notice');
  const [annIsPinned, setAnnIsPinned] = useState(false);
  const [annIsActive, setAnnIsActive] = useState(true);
  const [annHasExpiry, setAnnHasExpiry] = useState(false);
  const [annEndDate, setAnnEndDate] = useState('');

  // Auto-fill slug
  useEffect(() => {
    if (!editingPage) {
      setPageSlug(pageTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''));
    }
  }, [pageTitle, editingPage]);

  // Queries
  const settingsQuery = useQuery({
    queryKey: ['adminSettings'],
    queryFn: cmsApi.getSettings,
  });

  useEffect(() => {
    if (settingsQuery.data) {
      const cfg = settingsQuery.data;
      setWebsiteName(cfg.websiteName || '');
      setCscName(cfg.cscName || '');
      setTagline(cfg.tagline || '');
      setDescription(cfg.description || '');
      setLogoUrl(cfg.logoUrl || '');
      setAddress(cfg.contact?.address || '');
      setEmail(cfg.contact?.email || '');
      setPhone(cfg.contact?.phone || '');
      setWhatsapp(cfg.contact?.whatsapp || '');
      setMaintenanceEnabled(cfg.maintenanceMode?.enabled || false);
      setMaintenanceMessage(cfg.maintenanceMode?.message || '');
      setMaintenanceDuration(cfg.maintenanceMode?.estimatedTime || '');
      setHeroBgEnabled(cfg.heroBackground?.enabled || false);
      setHeroBgImages(cfg.heroBackground?.images || []);
      setHeroOverlayOpacity(cfg.heroBackground?.overlayOpacity ?? 0.65);
      setHeroAutoPlaySeconds(cfg.heroBackground?.autoPlayIntervalSeconds ?? 5);

      setSideDisplaysEnabled(cfg.sideDisplays?.enabled || false);
      setLeftWingEnabled(cfg.sideDisplays?.leftWing?.enabled || false);
      setLeftWingType(cfg.sideDisplays?.leftWing?.type || 'banner');
      setLeftWingTitle(cfg.sideDisplays?.leftWing?.title || '');
      setLeftWingBannerUrl(cfg.sideDisplays?.leftWing?.bannerImageUrl || '');
      setLeftWingBannerLink(cfg.sideDisplays?.leftWing?.bannerLink || '');
      setLeftWingCustomHtml(cfg.sideDisplays?.leftWing?.customHtml || '');
      setLeftWingShowLegal(cfg.sideDisplays?.leftWing?.showLegalPagesList || false);

      setRightWingEnabled(cfg.sideDisplays?.rightWing?.enabled || false);
      setRightWingType(cfg.sideDisplays?.rightWing?.type || 'legal_pages');
      setRightWingTitle(cfg.sideDisplays?.rightWing?.title || '');
      setRightWingBannerUrl(cfg.sideDisplays?.rightWing?.bannerImageUrl || '');
      setRightWingBannerLink(cfg.sideDisplays?.rightWing?.bannerLink || '');
      setRightWingCustomHtml(cfg.sideDisplays?.rightWing?.customHtml || '');
      setRightWingShowLegal(cfg.sideDisplays?.rightWing?.showLegalPagesList ?? true);
    }
  }, [settingsQuery.data]);

  const menuQuery = useQuery({
    queryKey: ['adminMenus', menuLocation],
    queryFn: () => cmsApi.getMenu(menuLocation),
  });

  useEffect(() => {
    if (menuQuery.data) {
      setMenuItems(menuQuery.data.sort((a, b) => a.order - b.order));
    }
  }, [menuQuery.data]);

  const pagesQuery = useQuery({
    queryKey: ['adminPagesList'],
    queryFn: () => cmsApi.getPages(1, 100),
    enabled: activeTab === 'pages',
  });

  const pagesList = Array.isArray(pagesQuery.data)
    ? pagesQuery.data
    : (pagesQuery.data as any)?.pages || [];

  const bannersQuery = useQuery({
    queryKey: ['adminBannersList'],
    queryFn: () => cmsApi.getBanners(1, 100),
    enabled: activeTab === 'banners',
  });

  const bannersList: Banner[] = Array.isArray(bannersQuery.data)
    ? bannersQuery.data
    : (bannersQuery.data as any)?.banners || [];

  const faqsQuery = useQuery({
    queryKey: ['adminFaqsList'],
    queryFn: () => cmsApi.getFaqs(1, 100),
    enabled: activeTab === 'faqs',
  });

  const faqsList = Array.isArray(faqsQuery.data)
    ? faqsQuery.data
    : (faqsQuery.data as any)?.faqs || [];

  const announcementsQuery = useQuery({
    queryKey: ['adminAnnouncementsList'],
    queryFn: () => cmsApi.getAnnouncements(1, 100),
    enabled: activeTab === 'announcements',
  });

  const announcementsList: Announcement[] = Array.isArray(announcementsQuery.data)
    ? announcementsQuery.data
    : (announcementsQuery.data as any)?.announcements || [];

  const addToast = useToastStore((state) => state.addToast);
  const [copiedPrompt, setCopiedPrompt] = useState(false);

  const handleCopyAiPrompt = () => {
    navigator.clipboard.writeText(UNIVERSAL_AI_BANNER_PROMPT);
    setCopiedPrompt(true);
    addToast('📋 Universal AI Banner Prompt copied! Paste in ChatGPT or Gemini.', 'info');
    setTimeout(() => setCopiedPrompt(false), 3000);
  };

  // Mutations
  const saveSettingsMutation = useMutation({
    mutationFn: (body: Partial<WebsiteSetting>) => cmsApi.updateSettings(body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminSettings'] });
      queryClient.invalidateQueries({ queryKey: ['publicSettings'] });
      addToast('✅ Configuration saved successfully!', 'success');
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message || err?.message || 'Failed to save configuration';
      addToast(`❌ Save Failed: ${msg}`, 'error');
    },
  });

  const maintenanceMutation = useMutation({
    mutationFn: (body: any) => cmsApi.toggleMaintenanceMode(body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminSettings'] });
      addToast('✅ Maintenance mode status updated!', 'success');
    },
    onError: (err: any) => {
      addToast(`❌ Maintenance mode update failed: ${err?.message || 'Error'}`, 'error');
    },
  });

  const saveMenuMutation = useMutation({
    mutationFn: (items: MenuItem[]) => cmsApi.saveMenu(menuLocation, items),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminMenus', menuLocation] });
      addToast('✅ Navigation menu updated successfully!', 'success');
    },
  });

  const savePageMutation = useMutation({
    mutationFn: (body: any) => {
      if (editingPage) {
        return cmsApi.updatePage(editingPage._id, body);
      } else {
        return cmsApi.createPage(body);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminPagesList'] });
      setIsPageModalOpen(false);
      addToast('✅ Legal Page saved successfully!', 'success');
    },
    onError: (err: any) => {
      addToast(`❌ Failed to save page: ${err?.message || 'Error'}`, 'error');
    },
  });

  const deletePageMutation = useMutation({
    mutationFn: (id: string) => cmsApi.deletePage(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminPagesList'] });
      addToast('🗑️ Legal Page deleted!', 'info');
    },
  });

  const saveBannerMutation = useMutation({
    mutationFn: (formData: FormData) => {
      if (editingBanner) {
        return cmsApi.updateBanner(editingBanner._id, formData);
      } else {
        return cmsApi.createBanner(formData);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminBannersList'] });
      setIsBannerModalOpen(false);
      addToast('✅ Carousel Banner saved successfully!', 'success');
    },
    onError: (err: any) => {
      addToast(`❌ Failed to save banner: ${err?.message || 'Error'}`, 'error');
    },
  });

  const deleteBannerMutation = useMutation({
    mutationFn: (id: string) => cmsApi.deleteBanner(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminBannersList'] });
      addToast('🗑️ Banner deleted!', 'info');
    },
  });

  const saveFaqMutation = useMutation({
    mutationFn: (body: any) => {
      if (editingFaq) {
        return cmsApi.updateFaq(editingFaq._id, body);
      } else {
        return cmsApi.createFaq(body);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminFaqsList'] });
      setIsFaqModalOpen(false);
      addToast('✅ FAQ row saved successfully!', 'success');
    },
  });

  const deleteFaqMutation = useMutation({
    mutationFn: (id: string) => cmsApi.deleteFaq(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminFaqsList'] });
      addToast('🗑️ FAQ deleted!', 'info');
    },
  });

  const saveAnnMutation = useMutation({
    mutationFn: (body: any) => {
      if (editingAnn) {
        return cmsApi.updateAnnouncement(editingAnn._id, body);
      } else {
        return cmsApi.createAnnouncement(body);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminAnnouncementsList'] });
      setIsAnnModalOpen(false);
      addToast('✅ Announcement Alert saved successfully!', 'success');
    },
    onError: (err: any) => {
      addToast(`❌ Failed to save announcement: ${err?.message || 'Error'}`, 'error');
    },
  });

  const deleteAnnMutation = useMutation({
    mutationFn: (id: string) => cmsApi.deleteAnnouncement(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminAnnouncementsList'] });
      addToast('🗑️ Announcement deleted!', 'info');
    },
  });

  const handleSaveSettings = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    saveSettingsMutation.mutate({
      websiteName,
      cscName,
      tagline,
      description,
      logoUrl,
      contact: { address, email, phone, whatsapp },
      heroBackground: {
        enabled: heroBgEnabled,
        images: heroBgImages,
        overlayOpacity: Number(heroOverlayOpacity),
        autoPlayIntervalSeconds: Number(heroAutoPlaySeconds),
      },
      sideDisplays: {
        enabled: sideDisplaysEnabled,
        leftWing: {
          enabled: leftWingEnabled,
          type: leftWingType,
          title: leftWingTitle,
          bannerImageUrl: leftWingBannerUrl,
          bannerLink: leftWingBannerLink,
          customHtml: leftWingCustomHtml,
          showLegalPagesList: leftWingShowLegal,
        },
        rightWing: {
          enabled: rightWingEnabled,
          type: rightWingType,
          title: rightWingTitle,
          bannerImageUrl: rightWingBannerUrl,
          bannerLink: rightWingBannerLink,
          customHtml: rightWingCustomHtml,
          showLegalPagesList: rightWingShowLegal,
        },
      },
    });
  };

  const handleMaintenanceToggle = () => {
    maintenanceMutation.mutate({
      enabled: !maintenanceEnabled,
      message: maintenanceMessage || undefined,
      estimatedTime: maintenanceDuration || undefined,
    });
  };

  const handleMenuMove = (idx: number, direction: 'up' | 'down') => {
    const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= menuItems.length) return;

    const list = [...menuItems];
    const tempOrder = list[idx].order;
    list[idx].order = list[targetIdx].order;
    list[targetIdx].order = tempOrder;

    const sortedList = list.sort((a, b) => a.order - b.order);
    setMenuItems(sortedList);
    saveMenuMutation.mutate(sortedList);
  };

  const handleMenuSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!menuLabel.trim() || !menuUrl.trim()) return;

    let updatedList = [...menuItems];
    if (editingMenuItem) {
      updatedList = updatedList.map((item) =>
        item.key === editingMenuItem.key
          ? { ...item, label: menuLabel, url: menuUrl, openInNewTab: menuOpenInNewTab }
          : item
      );
    } else {
      updatedList.push({
        key: `menu_${Date.now()}`,
        label: menuLabel,
        url: menuUrl,
        order: updatedList.length + 1,
        openInNewTab: menuOpenInNewTab,
        isActive: true,
      });
    }

    setMenuItems(updatedList);
    saveMenuMutation.mutate(updatedList);
    setIsMenuModalOpen(false);
  };

  const handleMenuDelete = (key: string) => {
    const nextList = menuItems.filter((i) => i.key !== key);
    setMenuItems(nextList);
    saveMenuMutation.mutate(nextList);
  };

  const handleBannerSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const formData = new FormData();
    formData.append('title', bannerTitle);
    formData.append('subtitle', bannerSubtitle);
    formData.append('ctaText', bannerCtaText);
    formData.append('ctaLink', bannerCtaLink);
    formData.append('device', bannerDevice);
    formData.append('isActive', 'true');
    formData.append('imageUrl', bannerImageUrl);

    if (bannerFile) {
      formData.append('banner', bannerFile);
    }

    saveBannerMutation.mutate(formData);
  };

  const handleAnnSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!annTitle.trim() || !annContent.trim()) return;

    saveAnnMutation.mutate({
      title: annTitle.trim(),
      content: annContent.trim(),
      type: annType,
      isPinned: annIsPinned,
      isActive: annIsActive,
      startDate: new Date().toISOString(),
      endDate: annHasExpiry && annEndDate ? new Date(annEndDate).toISOString() : null,
    });
  };

  // Reusable Media Selection Injection
  const handleMediaSelect = (url: string) => {
    if (mediaPickerTarget === 'settings_logo') setLogoUrl(url);
    if (mediaPickerTarget === 'banner') setBannerImageUrl(url);
    if (mediaPickerTarget === 'page') setPageContent((p) => p + `<img src="${url}" alt="image" />`);
    if (mediaPickerTarget === 'hero_bg') {
      if (!heroBgImages.includes(url)) {
        setHeroBgImages((prev) => [...prev, url]);
      }
    }
    if (mediaPickerTarget === 'left_wing_banner') setLeftWingBannerUrl(url);
    if (mediaPickerTarget === 'right_wing_banner') setRightWingBannerUrl(url);
    setMediaPickerTarget(null);
  };

  return (
    <div className="p-6 text-left space-y-6 w-full">
      {/* Top Header */}
      <div className="border-b border-border pb-4">
        <h1 className="text-2xl font-bold font-sans text-text-primary">CMS Config Console</h1>
        <p className="text-xs text-text-secondary mt-0.5 select-none">Admin settings portal for branding, menus, pages and banners.</p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border text-xs select-none overflow-x-auto">
        {[
          { key: 'settings', label: 'Site Settings' },
          { key: 'menus', label: 'Menus Editor' },
          { key: 'pages', label: 'Legal Pages' },
          { key: 'banners', label: 'Hero Banners' },
          { key: 'faqs', label: 'FAQs CRUD' },
          { key: 'announcements', label: 'Announcements' },
          { key: 'side_displays', label: 'Side Displays & Wings' },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as any)}
            className={`px-4 py-2.5 border-b-2 font-medium transition-all cursor-pointer ${
              activeTab === tab.key
                ? 'border-accent text-accent font-bold'
                : 'border-transparent text-text-secondary hover:text-text-primary'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Settings Tab */}
      {activeTab === 'settings' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          {/* Main settings form */}
          <div className="lg:col-span-2">
            <form onSubmit={handleSaveSettings} className="space-y-6 text-xs">
              <Card className="p-5 space-y-4">
                <h3 className="font-bold text-text-primary text-sm border-b border-border pb-2">Branding Identity</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="font-bold text-text-secondary select-none">Website Name</label>
                    <Input value={websiteName} onChange={(e) => setWebsiteName(e.target.value)} required />
                  </div>
                  <div className="space-y-1.5">
                    <label className="font-bold text-text-secondary select-none">CSC Center Name</label>
                    <Input value={cscName} onChange={(e) => setCscName(e.target.value)} required />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="font-bold text-text-secondary select-none">Tagline</label>
                    <Input value={tagline} onChange={(e) => setTagline(e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="font-bold text-text-secondary select-none">Logo URL / Image</label>
                      <span className="text-[10px] text-accent font-medium font-mono">
                        📐 Rec: 256x256 px or 200x60 px (PNG/SVG)
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <Input value={logoUrl} onChange={(e) => setLogoUrl(e.target.value)} placeholder="https://... logo image link" />
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={() => {
                          setMediaPickerTarget('settings_logo');
                          setIsMediaPickerOpen(true);
                        }}
                      >
                        <FolderOpen size={14} />
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="font-bold text-text-secondary select-none">Business Profile Description</label>
                  <Textarea value={description} onChange={(e) => setDescription(e.target.value)} />
                </div>
              </Card>

              {/* Hero Background & Thumbnail Slider Configuration */}
              <Card className="p-5 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-3">
                  <div>
                    <h3 className="font-bold text-text-primary text-sm flex items-center gap-2">
                      <Sparkles size={16} className="text-accent" /> Hero Background & Thumbnail Slider
                    </h3>
                    <p className="text-[11px] text-text-secondary mt-0.5">
                      Display single thumbnail or multiple rotating image banners in the background of your Citizen Portal Hero section.
                    </p>
                    <div className="mt-1.5 inline-block px-2 py-0.5 rounded bg-surface-elevated border border-border text-[10px] text-text-tertiary font-mono">
                      📐 Recommended Size: 1920x1080 px or 1600x900 px (16:9 Landscape Full HD) • JPG, PNG, WebP
                    </div>
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer select-none bg-surface-elevated px-3 py-1.5 rounded-lg border border-border">
                    <input
                      type="checkbox"
                      checked={heroBgEnabled}
                      onChange={(e) => setHeroBgEnabled(e.target.checked)}
                      className="rounded border-border text-accent focus:ring-accent w-4 h-4 cursor-pointer"
                    />
                    <span className="text-xs font-bold text-text-primary">Enable Background</span>
                  </label>
                </div>

                {heroBgEnabled && (
                  <div className="space-y-4 pt-1">
                    {/* Image List / Gallery */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="font-bold text-text-secondary select-none text-xs">
                          Background Thumbnails ({heroBgImages.length} images)
                        </label>
                        <span className="text-[10px] text-text-tertiary">
                          {heroBgImages.length > 1 ? 'Auto-sliding enabled' : heroBgImages.length === 1 ? 'Single cover banner' : 'No images'}
                        </span>
                      </div>

                      {heroBgImages.length === 0 ? (
                        <div className="p-5 border border-dashed border-border rounded-xl text-center text-xs text-text-tertiary bg-surface-elevated/20">
                          No background thumbnails added yet. Pick from Media Assets or paste an Image URL below.
                        </div>
                      ) : (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                          {heroBgImages.map((imgUrl, idx) => (
                            <div key={idx} className="relative group rounded-xl overflow-hidden border border-border bg-surface-elevated aspect-video shadow-sm">
                              <img src={imgUrl} alt={`hero-bg-${idx}`} className="w-full h-full object-cover" />
                              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => setHeroBgImages((prev) => prev.filter((_, i) => i !== idx))}
                                  className="p-1.5 rounded-lg bg-red-600 text-white text-xs hover:bg-red-700 transition-colors shadow-md"
                                  title="Remove image"
                                >
                                  <Trash2 size={13} />
                                </button>
                              </div>
                              <span className="absolute bottom-1.5 left-1.5 px-1.5 py-0.5 rounded bg-black/75 text-[9px] font-mono font-bold text-white">
                                Slide #{idx + 1}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Add Image Controls */}
                    <div className="flex flex-col sm:flex-row gap-2 items-center">
                      <Input
                        placeholder="Paste image URL (https://...) or choose from Media Assets"
                        value={customHeroImageUrl}
                        onChange={(e) => setCustomHeroImageUrl(e.target.value)}
                        className="flex-1 text-xs"
                      />
                      <div className="flex gap-2 w-full sm:w-auto">
                        <Button
                          type="button"
                          variant="secondary"
                          onClick={() => {
                            if (customHeroImageUrl.trim()) {
                              setHeroBgImages((prev) => [...prev, customHeroImageUrl.trim()]);
                              setCustomHeroImageUrl('');
                            }
                          }}
                          disabled={!customHeroImageUrl.trim()}
                          className="text-xs shrink-0"
                        >
                          <Plus size={14} /> Add URL
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => {
                            setMediaPickerTarget('hero_bg');
                            setIsMediaPickerOpen(true);
                          }}
                          className="text-xs shrink-0"
                        >
                          <FolderOpen size={14} /> Media Assets
                        </Button>
                      </div>
                    </div>

                    {/* Controls: Overlay Opacity & Rotation Speed */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-border/60">
                      <div className="space-y-1.5">
                        <div className="flex justify-between items-center text-[11px]">
                          <label className="font-bold text-text-secondary">Dark Overlay Darkness</label>
                          <span className="font-mono text-accent font-bold">{Math.round(heroOverlayOpacity * 100)}%</span>
                        </div>
                        <input
                          type="range"
                          min="0.1"
                          max="0.9"
                          step="0.05"
                          value={heroOverlayOpacity}
                          onChange={(e) => setHeroOverlayOpacity(parseFloat(e.target.value))}
                          className="w-full accent-accent cursor-pointer"
                        />
                        <span className="text-[10px] text-text-tertiary block">
                          Higher darkness improves readability for white text and buttons.
                        </span>
                      </div>

                      <div className="space-y-1.5">
                        <div className="flex justify-between items-center text-[11px]">
                          <label className="font-bold text-text-secondary">Slide Auto-Rotation Speed</label>
                          <span className="font-mono text-accent font-bold">{heroAutoPlaySeconds}s</span>
                        </div>
                        <input
                          type="range"
                          min="2"
                          max="20"
                          step="1"
                          value={heroAutoPlaySeconds}
                          onChange={(e) => setHeroAutoPlaySeconds(parseInt(e.target.value, 10))}
                          className="w-full accent-accent cursor-pointer"
                        />
                        <span className="text-[10px] text-text-tertiary block">
                          Duration in seconds before crossfading to the next thumbnail.
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </Card>

              <Card className="p-5 space-y-4">
                <h3 className="font-bold text-text-primary text-sm border-b border-border pb-2">Contact Details</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="font-bold text-text-secondary select-none">Email Address</label>
                    <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <label className="font-bold text-text-secondary select-none">Phone Number</label>
                    <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="font-bold text-text-secondary select-none">WhatsApp Number</label>
                    <Input value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <label className="font-bold text-text-secondary select-none">Physical Office Address</label>
                    <Input value={address} onChange={(e) => setAddress(e.target.value)} />
                  </div>
                </div>
              </Card>

              <div className="flex justify-end pt-2 select-none">
                <Button
                  type="submit"
                  disabled={saveSettingsMutation.isPending}
                  className={`gap-2 shadow-lg transition-all ${
                    saveSettingsMutation.isSuccess
                      ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-500/20'
                      : 'shadow-accent/20'
                  }`}
                >
                  {saveSettingsMutation.isPending ? (
                    <Sparkles size={14} className="animate-spin" />
                  ) : saveSettingsMutation.isSuccess ? (
                    <Check size={14} />
                  ) : null}
                  {saveSettingsMutation.isPending
                    ? 'Saving...'
                    : saveSettingsMutation.isSuccess
                    ? '✓ Saved Successfully!'
                    : 'Save Site Settings'}
                </Button>
              </div>
            </form>
          </div>

          {/* Destructive Maintenance mode */}
          <div>
            <Card className="p-5 space-y-4 border-error/25 bg-error/5 text-left text-xs">
              <h3 className="font-bold text-error text-sm flex items-center gap-1.5 border-b border-error/10 pb-2 select-none">
                <AlertOctagon size={16} /> Maintenance Lockdown
              </h3>

              <div className="space-y-3">
                <div className="space-y-1.5">
                  <label className="font-bold text-text-secondary select-none">Custom Lockdown Message</label>
                  <Textarea
                    placeholder="Provide lockdown reasons..."
                    value={maintenanceMessage}
                    onChange={(e) => setMaintenanceMessage(e.target.value)}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="font-bold text-text-secondary select-none">Estimated Duration</label>
                  <Input
                    placeholder="e.g. 2 hours or till 5PM"
                    value={maintenanceDuration}
                    onChange={(e) => setMaintenanceDuration(e.target.value)}
                  />
                </div>

                <div className="pt-2 select-none">
                  <Button
                    type="button"
                    variant={maintenanceEnabled ? 'primary' : 'outline'}
                    className="w-full bg-error hover:bg-error/85 text-white"
                    onClick={handleMaintenanceToggle}
                    disabled={maintenanceMutation.isPending}
                  >
                    {maintenanceEnabled ? 'Disable System Lockdown' : 'Enable Maintenance Lockdown'}
                  </Button>
                </div>
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* Menus Tab */}
      {activeTab === 'menus' && (
        <div className="space-y-6 text-left text-xs">
          <Card className="p-5 space-y-4">
            <div className="flex justify-between items-center border-b border-border pb-3 select-none">
              <div className="flex items-center gap-4">
                <h3 className="font-bold text-text-primary text-sm">Navigation Trees</h3>
                <Select
                  value={menuLocation}
                  onChange={(e: any) => setMenuLocation(e.target.value)}
                  className="h-8 text-xs py-0 px-2"
                >
                  <option value="header">Header Links</option>
                  <option value="footer">Footer Menu</option>
                  <option value="sidebar">Sidebar Panel</option>
                </Select>
              </div>
              <Button
                size="sm"
                onClick={() => {
                  setEditingMenuItem(null);
                  setMenuLabel('');
                  setMenuUrl('');
                  setMenuOpenInNewTab(false);
                  setIsMenuModalOpen(true);
                }}
              >
                + Add Link Item
              </Button>
            </div>

            {menuQuery.isLoading ? (
              <Skeleton className="h-40 w-full animate-pulse" />
            ) : menuItems.length === 0 ? (
              <p className="text-xs text-text-tertiary py-8 select-none text-center">No menu items configured for this location.</p>
            ) : (
              <div className="space-y-2 max-w-xl">
                {menuItems.map((item, idx) => (
                  <div
                    key={item.key}
                    className="p-3 border border-border bg-surface rounded flex items-center justify-between gap-4"
                  >
                    <div className="text-left space-y-0.5">
                      <span className="font-bold text-xs text-text-primary">{item.label}</span>
                      <span className="text-[10px] text-text-tertiary block font-mono">{item.url}</span>
                    </div>

                    <div className="flex items-center gap-1 select-none">
                      <button
                        disabled={idx === 0}
                        onClick={() => handleMenuMove(idx, 'up')}
                        className="p-1 hover:bg-surface-elevated text-text-tertiary hover:text-text-primary disabled:opacity-30 rounded cursor-pointer"
                      >
                        <ArrowUp size={12} />
                      </button>
                      <button
                        disabled={idx === menuItems.length - 1}
                        onClick={() => handleMenuMove(idx, 'down')}
                        className="p-1 hover:bg-surface-elevated text-text-tertiary hover:text-text-primary disabled:opacity-30 rounded cursor-pointer"
                      >
                        <ArrowDown size={12} />
                      </button>
                      <button
                        onClick={() => {
                          setEditingMenuItem(item);
                          setMenuLabel(item.label);
                          setMenuUrl(item.url);
                          setMenuOpenInNewTab(item.openInNewTab);
                          setIsMenuModalOpen(true);
                        }}
                        className="p-1.5 hover:bg-surface-elevated text-text-tertiary hover:text-accent rounded cursor-pointer"
                      >
                        <Edit2 size={13} />
                      </button>
                      <button
                        onClick={() => handleMenuDelete(item.key)}
                        className="p-1.5 hover:bg-surface-elevated text-text-tertiary hover:text-error rounded cursor-pointer"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      )}

      {/* Pages Tab */}
      {activeTab === 'pages' && (
        <div className="space-y-4 text-left">
          <div className="flex justify-between items-center select-none">
            <h3 className="text-xs font-bold text-text-secondary uppercase tracking-wider">Custom Legal Pages</h3>
            <Button
              size="sm"
              onClick={() => {
                setEditingPage(null);
                setPageTitle('');
                setPageSlug('');
                setPageContent('');
                setPageStatus('draft');
                setIsPageModalOpen(true);
              }}
            >
              + Create Page
            </Button>
          </div>

          {pagesQuery.isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-14 w-full animate-pulse" />
            </div>
          ) : pagesList.length === 0 ? (
            <Card className="text-center p-8 border border-dashed border-border bg-surface select-none space-y-2">
              <p className="text-xs text-text-secondary font-semibold">No custom pages configured yet.</p>
              <p className="text-[11px] text-text-tertiary">Click "+ Create Page" to publish custom pages like Terms, Privacy, About Us, or Services Details.</p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {pagesList.map((p: any) => {
                const liveUrl = tenantParam ? `/pages/${p.slug}?tenant=${tenantParam}` : `/pages/${p.slug}`;
                return (
                  <Card key={p._id} className="p-4 flex flex-col justify-between items-start gap-4 hover:border-accent/40 transition-colors">
                    <div className="text-left space-y-2 w-full">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <span className="font-bold text-sm text-text-primary block line-clamp-1">{p.title}</span>
                          <span className="text-[10px] text-accent font-mono block mt-0.5">
                            Public URL: /pages/{p.slug}
                          </span>
                        </div>
                        <Badge variant={p.status === 'published' ? 'success' : 'secondary'}>
                          {p.status}
                        </Badge>
                      </div>

                      {p.content && (
                        <p className="text-[11px] text-text-tertiary line-clamp-2 select-none leading-relaxed bg-surface-elevated/40 p-2 rounded border border-border/40">
                          {p.content.replace(/<[^>]+>/g, '').slice(0, 120)}...
                        </p>
                      )}
                    </div>

                    <div className="flex items-center justify-between gap-2 w-full pt-2 border-t border-border/50 select-none">
                      <a
                        href={liveUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs text-accent font-semibold hover:underline"
                      >
                        <ExternalLink size={13} /> View Live Page ↗
                      </a>

                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setEditingPage(p);
                            setPageTitle(p.title || '');
                            setPageSlug(p.slug || '');
                            setPageContent(p.content || '');
                            setPageStatus(p.status || 'published');
                            setIsPageModalOpen(true);
                          }}
                        >
                          Edit Page
                        </Button>
                        <button
                          onClick={() => deletePageMutation.mutate(p._id)}
                          className="text-text-tertiary hover:text-error p-1.5 hover:bg-surface-elevated rounded cursor-pointer transition-colors"
                          title="Delete Page"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Banners Tab */}
      {activeTab === 'banners' && (
        <div className="space-y-4 text-left">
          <div className="flex justify-between items-center select-none">
            <h3 className="text-xs font-bold text-text-secondary uppercase tracking-wider">Carousels Banners</h3>
            <Button
              size="sm"
              onClick={() => {
                setEditingBanner(null);
                setBannerTitle('');
                setBannerSubtitle('');
                setBannerCtaText('');
                setBannerCtaLink('');
                setBannerDevice('both');
                setBannerImageUrl('');
                setBannerFile(null);
                setIsBannerModalOpen(true);
              }}
            >
              + Add Banner Slide
            </Button>
          </div>

          {bannersQuery.isLoading ? (
            <Skeleton className="h-40 w-full animate-pulse" />
          ) : bannersList.length === 0 ? (
            <Card className="text-center p-8 border border-dashed border-border bg-surface select-none">
              <p className="text-xs text-text-tertiary">No banners listed.</p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {bannersList.map((banner) => (
                <Card key={banner._id} className="p-4 flex gap-4 text-left">
                  {banner.image?.url && (
                    <img
                      src={banner.image.url}
                      alt="Banner thumbnail"
                      className="w-16 h-16 object-cover rounded border border-border bg-surface shrink-0"
                    />
                  )}
                  <div className="flex-grow space-y-1.5">
                    <span className="font-bold text-xs text-text-primary block">{banner.title || 'Untitled Banner'}</span>
                    <span className="text-[9px] font-mono text-text-tertiary block">Device: {banner.device}</span>
                    <div className="flex gap-2 pt-2 select-none">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setEditingBanner(banner);
                          setBannerTitle(banner.title || '');
                          setBannerSubtitle(banner.subtitle || '');
                          setBannerCtaText(banner.ctaText || '');
                          setBannerCtaLink(banner.ctaLink || '');
                          setBannerDevice(banner.device || 'both');
                          setBannerImageUrl(banner.image?.url || '');
                          setIsBannerModalOpen(true);
                        }}
                      >
                        Edit
                      </Button>
                      <button
                        onClick={() => deleteBannerMutation.mutate(banner._id)}
                        className="text-text-tertiary hover:text-error p-1.5 hover:bg-surface-elevated rounded cursor-pointer"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* FAQs Tab */}
      {activeTab === 'faqs' && (
        <div className="space-y-4 text-left">
          <div className="flex justify-between items-center select-none">
            <h3 className="text-xs font-bold text-text-secondary uppercase tracking-wider">Homepage FAQs</h3>
            <Button
              size="sm"
              onClick={() => {
                setEditingFaq(null);
                setFaqQuestion('');
                setFaqAnswer('');
                setIsFaqModalOpen(true);
              }}
            >
              + Create FAQ
            </Button>
          </div>

          {faqsQuery.isLoading ? (
            <Skeleton className="h-10 w-full animate-pulse" />
          ) : faqsList.length === 0 ? (
            <Card className="text-center p-8 border border-dashed border-border bg-surface select-none">
              <p className="text-xs text-text-tertiary">No FAQs configurated.</p>
            </Card>
          ) : (
            <div className="space-y-2">
              {faqsList.map((f: any) => (
                <Card key={f._id} className="p-4 flex justify-between items-center gap-4">
                  <div className="text-left space-y-1">
                    <span className="font-bold text-xs text-text-primary block">{f.question}</span>
                    <p className="text-[10px] text-text-secondary line-clamp-1">{f.answer}</p>
                  </div>
                  <div className="flex gap-2 select-none">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setEditingFaq(f);
                        setFaqQuestion(f.question);
                        setFaqAnswer(f.answer);
                        setIsFaqModalOpen(true);
                      }}
                    >
                      Edit
                    </Button>
                    <button
                      onClick={() => deleteFaqMutation.mutate(f._id)}
                      className="text-text-tertiary hover:text-error p-1.5 hover:bg-surface-elevated rounded cursor-pointer"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Announcements Tab */}
      {activeTab === 'announcements' && (
        <div className="space-y-4 text-left">
          <div className="flex justify-between items-center select-none">
            <div>
              <h3 className="text-xs font-bold text-text-secondary uppercase tracking-wider">Official Announcements & Alerts</h3>
              <p className="text-[11px] text-text-tertiary">Publish live alerts, festival notices, or schedule auto-expiring banners on citizen portal.</p>
            </div>
            <Button
              size="sm"
              onClick={() => {
                setEditingAnn(null);
                setAnnTitle('');
                setAnnContent('');
                setAnnType('notice');
                setAnnIsPinned(false);
                setAnnIsActive(true);
                setAnnHasExpiry(false);
                setAnnEndDate('');
                setIsAnnModalOpen(true);
              }}
            >
              + Add Alert
            </Button>
          </div>

          {announcementsQuery.isLoading ? (
            <Skeleton className="h-16 w-full animate-pulse" />
          ) : announcementsList.length === 0 ? (
            <Card className="text-center p-8 border border-dashed border-border bg-surface select-none space-y-2">
              <p className="text-xs text-text-secondary font-semibold">No alerts published yet.</p>
              <p className="text-[11px] text-text-tertiary">Click "+ Add Alert" to create an announcement or holiday notice for citizens.</p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {announcementsList.map((ann) => {
                const isExpired = ann.endDate ? new Date(ann.endDate) < new Date() : false;
                return (
                  <Card key={ann._id} className="p-4 flex flex-col justify-between items-start gap-4 hover:border-accent/40 transition-colors">
                    <div className="text-left space-y-2 w-full">
                      <div className="flex items-start justify-between gap-2">
                        <span className="font-bold text-sm text-text-primary block line-clamp-1">{ann.title}</span>
                        <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded uppercase ${
                          ann.isActive && !isExpired
                            ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                            : 'bg-error/10 text-error border border-error/20'
                        }`}>
                          {isExpired ? 'Expired' : ann.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </div>

                      <p className="text-xs text-text-secondary line-clamp-2 select-none leading-relaxed">{ann.content}</p>

                      <div className="flex flex-wrap items-center gap-1.5 pt-1 select-none">
                        <Badge variant="warning">{ann.type.replace('_', ' ')}</Badge>
                        {ann.isPinned && <Badge variant="success">PINNED TO TOP</Badge>}

                        {ann.endDate ? (
                          isExpired ? (
                            <span className="px-2 py-0.5 rounded bg-error/15 border border-error/30 text-error font-bold text-[10px] font-mono">
                              EXPIRED ({new Date(ann.endDate).toLocaleDateString()})
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded bg-surface-elevated border border-border text-text-secondary text-[10px] font-mono">
                              ⏰ Expires: {new Date(ann.endDate).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                            </span>
                          )
                        ) : (
                          <span className="px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/25 text-emerald-500 font-bold text-[10px] font-mono">
                            ♾️ Active Indefinitely
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex justify-end gap-2 w-full pt-2 border-t border-border/50 select-none">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setEditingAnn(ann);
                          setAnnTitle(ann.title);
                          setAnnContent(ann.content);
                          setAnnType(ann.type);
                          setAnnIsPinned(ann.isPinned);
                          setAnnIsActive(ann.isActive);
                          if (ann.endDate) {
                            setAnnHasExpiry(true);
                            const d = new Date(ann.endDate);
                            const pad = (n: number) => n.toString().padStart(2, '0');
                            const formatted = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
                            setAnnEndDate(formatted);
                          } else {
                            setAnnHasExpiry(false);
                            setAnnEndDate('');
                          }
                          setIsAnnModalOpen(true);
                        }}
                      >
                        Edit
                      </Button>
                      <button
                        onClick={() => deleteAnnMutation.mutate(ann._id)}
                        className="text-text-tertiary hover:text-error p-1.5 hover:bg-surface-elevated rounded cursor-pointer transition-colors"
                        title="Delete Alert"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Side Displays & Wings Tab */}
      {activeTab === 'side_displays' && (
        <div className="space-y-6 text-left text-xs">
          {/* Header & Global Switch */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-4">
            <div>
              <h3 className="text-sm font-bold text-text-primary uppercase tracking-wider flex items-center gap-2">
                <Layout size={16} className="text-accent" /> Hero Side Displays & Wings
              </h3>
              <p className="text-[11px] text-text-secondary mt-0.5">
                Display promotional festival greeting banners (PNG, JPG, JPEG), custom HTML widgets, or quick legal pages lists on the Left and Right sides of your Citizen Portal Hero section.
              </p>
            </div>
            <label className="flex items-center gap-2.5 cursor-pointer select-none bg-surface-elevated px-4 py-2.5 rounded-xl border border-border shrink-0 shadow-sm">
              <input
                type="checkbox"
                checked={sideDisplaysEnabled}
                onChange={(e) => setSideDisplaysEnabled(e.target.checked)}
                className="rounded border-border text-accent focus:ring-accent w-4 h-4 cursor-pointer"
              />
              <span className="text-xs font-bold text-text-primary">Enable Side Displays on Portal</span>
            </label>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* 👈 LEFT DISPLAY WING */}
            <Card className={`p-5 space-y-4 border transition-all ${leftWingEnabled ? 'border-accent/40 bg-surface shadow-sm' : 'border-border opacity-70 bg-surface/50'}`}>
              <div className="flex items-center justify-between border-b border-border pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-accent/10 text-accent flex items-center justify-center font-bold">
                    <PanelLeft size={16} />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-text-primary">Left Display Wing</h4>
                    <span className="text-[10px] text-text-tertiary">Positioned on the Left side of Hero</span>
                  </div>
                </div>
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={leftWingEnabled}
                    onChange={(e) => setLeftWingEnabled(e.target.checked)}
                    className="rounded border-border text-accent focus:ring-accent w-4 h-4 cursor-pointer"
                  />
                  <span className="text-xs font-bold text-text-secondary">Active Left Wing</span>
                </label>
              </div>

              {leftWingEnabled && (
                <div className="space-y-4 pt-1">
                  <div className="space-y-1.5">
                    <label className="font-bold text-text-secondary select-none">Wing Title / Heading</label>
                    <Input
                      value={leftWingTitle}
                      onChange={(e) => setLeftWingTitle(e.target.value)}
                      placeholder="e.g. Festival Greetings or Important Documents"
                    />
                  </div>

                  {/* ⚡ 1-Click Master Checkbox for Legal / Custom Pages */}
                  <div className={`p-3.5 rounded-xl border transition-all ${
                    leftWingShowLegal
                      ? 'bg-emerald-500/10 border-emerald-500/30'
                      : 'bg-surface-elevated/50 border-border hover:border-accent/30'
                  }`}>
                    <label className="flex items-start gap-3 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={leftWingShowLegal}
                        onChange={(e) => {
                          const checked = e.target.checked;
                          setLeftWingShowLegal(checked);
                          if (checked) {
                            setLeftWingType('legal_pages');
                          } else {
                            setLeftWingType('banner');
                          }
                        }}
                        className="rounded border-border text-emerald-500 focus:ring-emerald-500 w-4 h-4 cursor-pointer mt-0.5"
                      />
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-text-primary">
                            ⚡ 1-Click Auto-Display All Legal & Custom Pages
                          </span>
                          {leftWingShowLegal && (
                            <Badge variant="success" className="text-[9px] font-mono">PAGES ACTIVE</Badge>
                          )}
                        </div>
                        <p className="text-[11px] text-text-secondary mt-0.5 leading-relaxed">
                          Check this box to automatically show quick links to all {pagesList.length} published pages. Banner and HTML inputs will be locked.
                        </p>
                      </div>
                    </label>
                  </div>

                  {/* Condition A: Pages Checkbox IS CHECKED */}
                  {leftWingShowLegal ? (
                    <div className="p-3.5 rounded-xl bg-emerald-500/5 border border-emerald-500/20 space-y-2.5">
                      <div className="flex items-center justify-between text-emerald-500 font-bold text-xs">
                        <span className="flex items-center gap-1.5"><FileText size={14} /> Legal Pages Widget Active</span>
                        <span className="text-[10px] font-mono font-normal">Banner Upload Disabled</span>
                      </div>
                      <p className="text-[11px] text-text-tertiary leading-relaxed">
                        Aapke banaye huye saare published pages ke direct links yaha automatically list ho rahe hain. Agar aapko festival banner ya HTML greeting lagana hai, to upar diya checkbox uncheck karein.
                      </p>
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {pagesList.length === 0 ? (
                          <span className="text-[11px] text-text-tertiary">No pages published yet. Create one in Legal Pages tab.</span>
                        ) : (
                          pagesList.map((p: any) => (
                            <span key={p._id} className="px-2.5 py-1 rounded-lg bg-surface border border-border text-[11px] font-medium text-text-primary shadow-xs">
                              📄 {p.title}
                            </span>
                          ))
                        )}
                      </div>
                    </div>
                  ) : (
                    /* Condition B: Pages Checkbox IS NOT CHECKED -> Show Banner & HTML Options */
                    <div className="space-y-3">
                      {/* Widget Type Selector */}
                      <div className="space-y-1.5">
                        <label className="font-bold text-text-secondary select-none">Wing Content Type</label>
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={() => setLeftWingType('banner')}
                            className={`p-2.5 rounded-lg border text-center transition-all cursor-pointer flex flex-col items-center gap-1 ${
                              leftWingType === 'banner'
                                ? 'border-accent bg-accent/10 text-accent font-bold shadow-sm'
                                : 'border-border bg-surface hover:bg-surface-elevated text-text-secondary'
                            }`}
                          >
                            <ImageIcon size={16} />
                            <span className="text-[11px]">Image Banner (PNG, JPG)</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => setLeftWingType('custom_html')}
                            className={`p-2.5 rounded-lg border text-center transition-all cursor-pointer flex flex-col items-center gap-1 ${
                              leftWingType === 'custom_html'
                                ? 'border-accent bg-accent/10 text-accent font-bold shadow-sm'
                                : 'border-border bg-surface hover:bg-surface-elevated text-text-secondary'
                            }`}
                          >
                            <Code2 size={16} />
                            <span className="text-[11px]">Custom HTML / Greeting</span>
                          </button>
                        </div>
                      </div>

                      {/* Type 1: Image Banner */}
                      {leftWingType === 'banner' && (
                        <div className="space-y-3 p-3.5 rounded-xl bg-surface-elevated/40 border border-border">
                          <div className="p-2 rounded-lg bg-surface border border-border text-[10px] text-accent font-mono">
                            📐 Recommended Size: 400x500 px or 600x800 px (3:4 or 4:5 Vertical Card) • PNG, JPG, JPEG • Max 2MB
                          </div>

                          <div className="space-y-1.5">
                            <label className="font-bold text-text-secondary select-none">Banner Image Link</label>
                            <div className="flex gap-2">
                              <Input
                                value={leftWingBannerUrl}
                                onChange={(e) => setLeftWingBannerUrl(e.target.value)}
                                placeholder="https://... or pick from Media Assets"
                              />
                              <Button
                                type="button"
                                variant="secondary"
                                onClick={() => {
                                  setMediaPickerTarget('left_wing_banner');
                                  setIsMediaPickerOpen(true);
                                }}
                                className="shrink-0 text-xs"
                              >
                                <FolderOpen size={14} /> Media Assets
                              </Button>
                            </div>
                          </div>

                          {leftWingBannerUrl && (
                            <div className="rounded-lg overflow-hidden border border-border aspect-video max-h-36 bg-bg">
                              <img src={leftWingBannerUrl} alt="Left Wing Banner" className="w-full h-full object-cover" />
                            </div>
                          )}

                          <div className="space-y-1.5">
                            <label className="font-bold text-text-secondary select-none">Click Destination URL (Optional)</label>
                            <Input
                              value={leftWingBannerLink}
                              onChange={(e) => setLeftWingBannerLink(e.target.value)}
                              placeholder="e.g. /pages/mera-work or https://..."
                            />
                          </div>
                        </div>
                      )}

                      {/* Type 2: Custom HTML */}
                      {leftWingType === 'custom_html' && (
                        <div className="space-y-2.5 p-3.5 rounded-xl bg-surface-elevated/40 border border-border">
                          <div className="p-2 rounded-lg bg-surface border border-border text-[10px] text-text-tertiary font-mono">
                            📐 Responsive Container: Width 280-320px • Supports HTML5 tags, CSS styles, & Festive Mubarak Banners
                          </div>

                          <div className="flex flex-wrap justify-between items-center gap-1.5">
                            <label className="font-bold text-text-secondary select-none">Custom HTML / Form Code</label>
                            <div className="flex flex-wrap items-center gap-2 text-[10px]">
                              <button
                                type="button"
                                onClick={() => setLeftWingCustomHtml('<div style="text-align:center; padding:10px; background:linear-gradient(135deg, #d97706, #ea580c); border-radius:12px; color:#fff; font-weight:bold;">✨ Happy Festival Mubarak! ✨<p style="font-size:11px; margin-top:4px; font-weight:normal; opacity:0.9;">Visit our Kendra for instant digital services.</p></div>')}
                                className="text-accent hover:underline cursor-pointer font-medium"
                              >
                                + Greeting
                              </button>
                              <span className="text-border">|</span>
                              <button
                                type="button"
                                onClick={() => setLeftWingCustomHtml('<form onsubmit="alert(\'Request received!\'); return false;" style="padding:10px; background:#18181b; border:1px solid #3f3f46; border-radius:10px;"><h4 style="font-size:12px; font-weight:bold; margin-bottom:8px; color:#f97316;">⚡ Quick Help Desk</h4><input type="text" placeholder="Your Name" required style="width:100%; padding:6px; margin-bottom:6px; background:#27272a; border:1px solid #52525b; border-radius:6px; color:#fff; font-size:11px;"/><input type="tel" placeholder="Mobile No." required style="width:100%; padding:6px; margin-bottom:6px; background:#27272a; border:1px solid #52525b; border-radius:6px; color:#fff; font-size:11px;"/><button type="submit" style="width:100%; padding:7px; background:#ea580c; color:#fff; border:none; border-radius:6px; font-weight:bold; font-size:11px; cursor:pointer;">Submit Request</button></form>')}
                                className="text-accent hover:underline cursor-pointer font-medium"
                              >
                                + Inquiry Form
                              </button>
                              <span className="text-border">|</span>
                              <button
                                type="button"
                                onClick={handleCopyAiPrompt}
                                className="inline-flex items-center gap-1 text-emerald-400 hover:text-emerald-300 font-bold hover:underline cursor-pointer bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/30"
                              >
                                {copiedPrompt ? <Check size={11} /> : <Copy size={11} />}
                                {copiedPrompt ? 'Copied Prompt!' : '📋 Copy AI Prompt'}
                              </button>
                            </div>
                          </div>
                          <Textarea
                            value={leftWingCustomHtml}
                            onChange={(e) => setLeftWingCustomHtml(e.target.value)}
                            rows={4}
                            placeholder="<form>... or <div style='...'>...</form>"
                          />
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </Card>

            {/* 👉 RIGHT DISPLAY WING */}
            <Card className={`p-5 space-y-4 border transition-all ${rightWingEnabled ? 'border-accent/40 bg-surface shadow-sm' : 'border-border opacity-70 bg-surface/50'}`}>
              <div className="flex items-center justify-between border-b border-border pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-accent/10 text-accent flex items-center justify-center font-bold">
                    <PanelRight size={16} />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-text-primary">Right Display Wing</h4>
                    <span className="text-[10px] text-text-tertiary">Positioned on the Right side of Hero</span>
                  </div>
                </div>
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={rightWingEnabled}
                    onChange={(e) => setRightWingEnabled(e.target.checked)}
                    className="rounded border-border text-accent focus:ring-accent w-4 h-4 cursor-pointer"
                  />
                  <span className="text-xs font-bold text-text-secondary">Active Right Wing</span>
                </label>
              </div>

              {rightWingEnabled && (
                <div className="space-y-4 pt-1">
                  <div className="space-y-1.5">
                    <label className="font-bold text-text-secondary select-none">Wing Title / Heading</label>
                    <Input
                      value={rightWingTitle}
                      onChange={(e) => setRightWingTitle(e.target.value)}
                      placeholder="e.g. Important Links or Quick Information"
                    />
                  </div>

                  {/* ⚡ 1-Click Master Checkbox for Legal / Custom Pages */}
                  <div className={`p-3.5 rounded-xl border transition-all ${
                    rightWingShowLegal
                      ? 'bg-emerald-500/10 border-emerald-500/30'
                      : 'bg-surface-elevated/50 border-border hover:border-accent/30'
                  }`}>
                    <label className="flex items-start gap-3 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={rightWingShowLegal}
                        onChange={(e) => {
                          const checked = e.target.checked;
                          setRightWingShowLegal(checked);
                          if (checked) {
                            setRightWingType('legal_pages');
                          } else {
                            setRightWingType('banner');
                          }
                        }}
                        className="rounded border-border text-emerald-500 focus:ring-emerald-500 w-4 h-4 cursor-pointer mt-0.5"
                      />
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-text-primary">
                            ⚡ 1-Click Auto-Display All Legal & Custom Pages
                          </span>
                          {rightWingShowLegal && (
                            <Badge variant="success" className="text-[9px] font-mono">PAGES ACTIVE</Badge>
                          )}
                        </div>
                        <p className="text-[11px] text-text-secondary mt-0.5 leading-relaxed">
                          Check this box to automatically show quick links to all {pagesList.length} published pages. Banner and HTML inputs will be locked.
                        </p>
                      </div>
                    </label>
                  </div>

                  {/* Condition A: Pages Checkbox IS CHECKED */}
                  {rightWingShowLegal ? (
                    <div className="p-3.5 rounded-xl bg-emerald-500/5 border border-emerald-500/20 space-y-2.5">
                      <div className="flex items-center justify-between text-emerald-500 font-bold text-xs">
                        <span className="flex items-center gap-1.5"><FileText size={14} /> Legal Pages Widget Active</span>
                        <span className="text-[10px] font-mono font-normal">Banner Upload Disabled</span>
                      </div>
                      <p className="text-[11px] text-text-tertiary leading-relaxed">
                        Aapke banaye huye saare published pages ke direct links yaha automatically list ho rahe hain. Agar aapko festival banner ya HTML greeting lagana hai, to upar diya checkbox uncheck karein.
                      </p>
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {pagesList.length === 0 ? (
                          <span className="text-[11px] text-text-tertiary">No pages published yet. Create one in Legal Pages tab.</span>
                        ) : (
                          pagesList.map((p: any) => (
                            <span key={p._id} className="px-2.5 py-1 rounded-lg bg-surface border border-border text-[11px] font-medium text-text-primary shadow-xs">
                              📄 {p.title}
                            </span>
                          ))
                        )}
                      </div>
                    </div>
                  ) : (
                    /* Condition B: Pages Checkbox IS NOT CHECKED -> Show Banner & HTML Options */
                    <div className="space-y-3">
                      {/* Widget Type Selector */}
                      <div className="space-y-1.5">
                        <label className="font-bold text-text-secondary select-none">Wing Content Type</label>
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={() => setRightWingType('banner')}
                            className={`p-2.5 rounded-lg border text-center transition-all cursor-pointer flex flex-col items-center gap-1 ${
                              rightWingType === 'banner'
                                ? 'border-accent bg-accent/10 text-accent font-bold shadow-sm'
                                : 'border-border bg-surface hover:bg-surface-elevated text-text-secondary'
                            }`}
                          >
                            <ImageIcon size={16} />
                            <span className="text-[11px]">Image Banner (PNG, JPG)</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => setRightWingType('custom_html')}
                            className={`p-2.5 rounded-lg border text-center transition-all cursor-pointer flex flex-col items-center gap-1 ${
                              rightWingType === 'custom_html'
                                ? 'border-accent bg-accent/10 text-accent font-bold shadow-sm'
                                : 'border-border bg-surface hover:bg-surface-elevated text-text-secondary'
                            }`}
                          >
                            <Code2 size={16} />
                            <span className="text-[11px]">Custom HTML / Greeting</span>
                          </button>
                        </div>
                      </div>

                      {/* Type 1: Image Banner */}
                      {rightWingType === 'banner' && (
                        <div className="space-y-3 p-3.5 rounded-xl bg-surface-elevated/40 border border-border">
                          <div className="p-2 rounded-lg bg-surface border border-border text-[10px] text-accent font-mono">
                            📐 Recommended Size: 400x500 px or 600x800 px (3:4 or 4:5 Vertical Card) • PNG, JPG, JPEG • Max 2MB
                          </div>

                          <div className="space-y-1.5">
                            <label className="font-bold text-text-secondary select-none">Banner Image Link</label>
                            <div className="flex gap-2">
                              <Input
                                value={rightWingBannerUrl}
                                onChange={(e) => setRightWingBannerUrl(e.target.value)}
                                placeholder="https://... or pick from Media Assets"
                              />
                              <Button
                                type="button"
                                variant="secondary"
                                onClick={() => {
                                  setMediaPickerTarget('right_wing_banner');
                                  setIsMediaPickerOpen(true);
                                }}
                                className="shrink-0 text-xs"
                              >
                                <FolderOpen size={14} /> Media Assets
                              </Button>
                            </div>
                          </div>

                          {rightWingBannerUrl && (
                            <div className="rounded-lg overflow-hidden border border-border aspect-video max-h-36 bg-bg">
                              <img src={rightWingBannerUrl} alt="Right Wing Banner" className="w-full h-full object-cover" />
                            </div>
                          )}

                          <div className="space-y-1.5">
                            <label className="font-bold text-text-secondary select-none">Click Destination URL (Optional)</label>
                            <Input
                              value={rightWingBannerLink}
                              onChange={(e) => setRightWingBannerLink(e.target.value)}
                              placeholder="e.g. /pages/terms or https://..."
                            />
                          </div>
                        </div>
                      )}

                      {/* Type 2: Custom HTML */}
                      {rightWingType === 'custom_html' && (
                        <div className="space-y-2.5 p-3.5 rounded-xl bg-surface-elevated/40 border border-border">
                          <div className="p-2 rounded-lg bg-surface border border-border text-[10px] text-text-tertiary font-mono">
                            📐 Responsive Container: Width 280-320px • Supports HTML5 tags, CSS styles, & Festive Mubarak Banners
                          </div>

                          <div className="flex flex-wrap justify-between items-center gap-1.5">
                            <label className="font-bold text-text-secondary select-none">Custom HTML / Form Code</label>
                            <div className="flex flex-wrap items-center gap-2 text-[10px]">
                              <button
                                type="button"
                                onClick={() => setRightWingCustomHtml('<div style="text-align:center; padding:10px; background:linear-gradient(135deg, #059669, #0d9488); border-radius:12px; color:#fff; font-weight:bold;">🎉 Mubarak & Greetings! 🎉<p style="font-size:11px; margin-top:4px; font-weight:normal; opacity:0.9;">All Kendra digital services are active and fast.</p></div>')}
                                className="text-accent hover:underline cursor-pointer font-medium"
                              >
                                + Greeting
                              </button>
                              <span className="text-border">|</span>
                              <button
                                type="button"
                                onClick={() => setRightWingCustomHtml('<form onsubmit="alert(\'Request received!\'); return false;" style="padding:10px; background:#18181b; border:1px solid #3f3f46; border-radius:10px;"><h4 style="font-size:12px; font-weight:bold; margin-bottom:8px; color:#f97316;">⚡ Quick Help Desk</h4><input type="text" placeholder="Your Name" required style="width:100%; padding:6px; margin-bottom:6px; background:#27272a; border:1px solid #52525b; border-radius:6px; color:#fff; font-size:11px;"/><input type="tel" placeholder="Mobile No." required style="width:100%; padding:6px; margin-bottom:6px; background:#27272a; border:1px solid #52525b; border-radius:6px; color:#fff; font-size:11px;"/><button type="submit" style="width:100%; padding:7px; background:#ea580c; color:#fff; border:none; border-radius:6px; font-weight:bold; font-size:11px; cursor:pointer;">Submit Request</button></form>')}
                                className="text-accent hover:underline cursor-pointer font-medium"
                              >
                                + Inquiry Form
                              </button>
                              <span className="text-border">|</span>
                              <button
                                type="button"
                                onClick={handleCopyAiPrompt}
                                className="inline-flex items-center gap-1 text-emerald-400 hover:text-emerald-300 font-bold hover:underline cursor-pointer bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/30"
                              >
                                {copiedPrompt ? <Check size={11} /> : <Copy size={11} />}
                                {copiedPrompt ? 'Copied Prompt!' : '📋 Copy AI Prompt'}
                              </button>
                            </div>
                          </div>
                          <Textarea
                            value={rightWingCustomHtml}
                            onChange={(e) => setRightWingCustomHtml(e.target.value)}
                            rows={4}
                            placeholder="<form>... or <div style='...'>...</form>"
                          />
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </Card>
          </div>

          {/* Save Action Footer */}
          <div className="flex items-center justify-between border-t border-border pt-4">
            <div className="text-xs text-text-tertiary">
              Changes apply live to your Citizen Portal immediately upon saving.
            </div>
            <Button
              type="button"
              onClick={() => handleSaveSettings()}
              disabled={saveSettingsMutation.isPending}
              className={`gap-2 shadow-lg transition-all ${
                saveSettingsMutation.isSuccess
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-500/20'
                  : 'shadow-accent/20'
              }`}
            >
              {saveSettingsMutation.isPending ? (
                <Sparkles size={14} className="animate-spin" />
              ) : saveSettingsMutation.isSuccess ? (
                <Check size={14} />
              ) : (
                <Sparkles size={14} />
              )}
              {saveSettingsMutation.isPending
                ? 'Saving Displays...'
                : saveSettingsMutation.isSuccess
                ? '✓ Saved Successfully!'
                : 'Save Side Displays Configuration'}
            </Button>
          </div>
        </div>
      )}

      {/* Reusable Media Selector Popup Modal */}
      <MediaPickerModal
        isOpen={isMediaPickerOpen}
        onClose={() => setIsMediaPickerOpen(false)}
        onSelect={handleMediaSelect}
      />

      {/* Menu Item Dialog */}
      <Dialog isOpen={isMenuModalOpen} onClose={() => setIsMenuModalOpen(false)}>
        <DialogContent className="max-w-sm p-6">
          <DialogHeader>
            <DialogTitle>Configure Link Item</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleMenuSubmit} className="space-y-4 pt-4 text-left text-xs">
            <div className="space-y-1.5">
              <label className="font-bold text-text-secondary select-none">Display Label</label>
              <Input value={menuLabel} onChange={(e) => setMenuLabel(e.target.value)} required />
            </div>
            <div className="space-y-1.5">
              <label className="font-bold text-text-secondary select-none">Target URL Path</label>
              <Input value={menuUrl} onChange={(e) => setMenuUrl(e.target.value)} placeholder="e.g. /track or /categories" required />
            </div>
            <div className="pt-2 select-none">
              <Checkbox
                id="menuNewTab"
                label="Open link in New Tab"
                checked={menuOpenInNewTab}
                onChange={(e) => setMenuOpenInNewTab(e.target.checked)}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsMenuModalOpen(false)}>Cancel</Button>
              <Button type="submit">Save Link</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Save FAQ Dialog */}
      <Dialog isOpen={isFaqModalOpen} onClose={() => setIsFaqModalOpen(false)}>
        <DialogContent className="max-w-md p-6">
          <DialogHeader>
            <DialogTitle>Configure FAQ Row</DialogTitle>
          </DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); saveFaqMutation.mutate({ question: faqQuestion, answer: faqAnswer }); }} className="space-y-4 pt-4 text-left text-xs">
            <div className="space-y-1.5">
              <label className="font-bold text-text-secondary select-none">Question</label>
              <Input value={faqQuestion} onChange={(e) => setFaqQuestion(e.target.value)} required />
            </div>
            <div className="space-y-1.5">
              <label className="font-bold text-text-secondary select-none">Answer details</label>
              <Textarea value={faqAnswer} onChange={(e) => setFaqAnswer(e.target.value)} required />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsFaqModalOpen(false)}>Cancel</Button>
              <Button type="submit">Save FAQ</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Save Announcement Dialog */}
      <Dialog isOpen={isAnnModalOpen} onClose={() => setIsAnnModalOpen(false)}>
        <DialogContent className="max-w-md p-6">
          <DialogHeader>
            <DialogTitle>Configure Alert Notification</DialogTitle>
          </DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); saveAnnMutation.mutate({ title: annTitle, content: annContent, type: annType, isPinned: annIsPinned, isActive: annIsActive, startDate: new Date().toISOString() }); }} className="space-y-4 pt-4 text-left text-xs">
            <div className="space-y-1.5">
              <label className="font-bold text-text-secondary select-none">Alert Title</label>
              <Input value={annTitle} onChange={(e) => setAnnTitle(e.target.value)} required />
            </div>
            <div className="space-y-1.5">
              <label className="font-bold text-text-secondary select-none">Detailed Content</label>
              <Textarea value={annContent} onChange={(e) => setAnnContent(e.target.value)} required />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="font-bold text-text-secondary select-none">Alert Type</label>
                <Select value={annType} onChange={(e: any) => setAnnType(e.target.value)}>
                  <option value="notice">Notice Alert</option>
                  <option value="holiday">Holiday Closing</option>
                  <option value="new_scheme">Scheme release</option>
                  <option value="portal_down">Maintenance warning</option>
                </Select>
              </div>
            </div>
            <div className="flex gap-4 pt-2 select-none">
              <Checkbox id="annPinned" label="Pin alert to topbar" checked={annIsPinned} onChange={(e) => setAnnIsPinned(e.target.checked)} />
              <Checkbox id="annActive" label="Active alert status" checked={annIsActive} onChange={(e) => setAnnIsActive(e.target.checked)} />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsAnnModalOpen(false)}>Cancel</Button>
              <Button type="submit">Save Alert</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Custom Pages Dialog */}
      <Dialog isOpen={isPageModalOpen} onClose={() => setIsPageModalOpen(false)}>
        <DialogContent className="max-w-2xl p-6">
          <DialogHeader>
            <DialogTitle>Configure Custom Page</DialogTitle>
          </DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); savePageMutation.mutate({ title: pageTitle, slug: pageSlug, content: pageContent, status: pageStatus }); }} className="space-y-4 pt-4 text-left text-xs">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="font-bold text-text-secondary select-none">Page Title</label>
                <Input value={pageTitle} onChange={(e) => setPageTitle(e.target.value)} required />
              </div>
              <div className="space-y-1.5">
                <label className="font-bold text-text-secondary select-none">Slug URL Override</label>
                <Input value={pageSlug} onChange={(e) => setPageSlug(e.target.value)} required />
              </div>
            </div>
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <label className="font-bold text-text-secondary select-none">Rich Text Content (HTML Format)</label>
                <button
                  type="button"
                  onClick={() => {
                    setMediaPickerTarget('page');
                    setIsMediaPickerOpen(true);
                  }}
                  className="text-accent font-semibold flex items-center gap-1 cursor-pointer select-none"
                >
                  <FolderOpen size={12} /> Inject Media Link
                </button>
              </div>
              <Textarea value={pageContent} onChange={(e) => setPageContent(e.target.value)} rows={10} placeholder="<h1>Title</h1><p>Body...</p>" required />
            </div>
            <div className="space-y-1.5">
              <label className="font-bold text-text-secondary select-none">Status</label>
              <Select value={pageStatus} onChange={(e: any) => setPageStatus(e.target.value)}>
                <option value="draft">Draft Mode</option>
                <option value="published">Publish live</option>
              </Select>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsPageModalOpen(false)}>Cancel</Button>
              <Button type="submit">Save Page</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Save Banner Dialog */}
      <Dialog isOpen={isBannerModalOpen} onClose={() => setIsBannerModalOpen(false)}>
        <DialogContent className="max-w-md p-6">
          <DialogHeader>
            <DialogTitle>Configure Banner Slide</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleBannerSubmit} className="space-y-4 pt-4 text-left text-xs">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="font-bold text-text-secondary select-none">Heading</label>
                <Input value={bannerTitle} onChange={(e) => setBannerTitle(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <label className="font-bold text-text-secondary select-none">Sub-heading</label>
                <Input value={bannerSubtitle} onChange={(e) => setBannerSubtitle(e.target.value)} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="font-bold text-text-secondary select-none">CTA Label</label>
                <Input value={bannerCtaText} onChange={(e) => setBannerCtaText(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <label className="font-bold text-text-secondary select-none">CTA Link</label>
                <Input value={bannerCtaLink} onChange={(e) => setBannerCtaLink(e.target.value)} />
              </div>
            </div>

            <div className="p-2.5 rounded-lg bg-surface-elevated/60 border border-border text-[10px] text-text-tertiary font-mono">
              📐 Recommended Dimensions: Desktop: 1920x600 px (3:1 Aspect) | Mobile: 600x400 px (3:2 Aspect) • PNG, JPG, JPEG • Max 3MB
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="font-bold text-text-secondary select-none">Device targeting</label>
                <Select value={bannerDevice} onChange={(e: any) => setBannerDevice(e.target.value)}>
                  <option value="both">All Devices (Auto-Responsive)</option>
                  <option value="desktop">Desktop Only</option>
                  <option value="mobile">Mobile Screen Only</option>
                </Select>
              </div>
              <div className="space-y-1.5">
                <label className="font-bold text-text-secondary select-none">Banner Image Link</label>
                <div className="flex gap-2">
                  <Input value={bannerImageUrl} onChange={(e) => setBannerImageUrl(e.target.value)} placeholder="https://..." />
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => {
                      setMediaPickerTarget('banner');
                      setIsMediaPickerOpen(true);
                    }}
                  >
                    <FolderOpen size={14} />
                  </Button>
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="font-bold text-text-secondary select-none">Alternatively upload file</label>
              <input type="file" accept="image/*" onChange={(e) => setBannerFile(e.target.files?.[0] || null)} className="w-full text-xs text-text-secondary" />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsBannerModalOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={saveBannerMutation.isPending}>
                {saveBannerMutation.isPending ? 'Saving Banner...' : 'Save Banner'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Save Announcement Dialog */}
      <Dialog isOpen={isAnnModalOpen} onClose={() => setIsAnnModalOpen(false)}>
        <DialogContent className="max-w-md p-6">
          <DialogHeader>
            <DialogTitle>{editingAnn ? 'Edit Announcement Alert' : 'Create New Announcement Alert'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAnnSubmit} className="space-y-4 pt-4 text-left text-xs">
            <div className="space-y-1.5">
              <label className="font-bold text-text-secondary select-none">Alert Title / Heading</label>
              <Input
                value={annTitle}
                onChange={(e) => setAnnTitle(e.target.value)}
                placeholder="e.g. Server Maintenance or New Scheme Available"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="font-bold text-text-secondary select-none">Alert Message / Content</label>
              <Textarea
                value={annContent}
                onChange={(e) => setAnnContent(e.target.value)}
                rows={3}
                placeholder="Provide details about the notice or update..."
                required
              />
            </div>

            {/* Expiry & Scheduling Section */}
            <div className="p-3.5 rounded-xl border border-border bg-surface-elevated/40 space-y-3">
              <div className="flex items-center justify-between">
                <label className="font-bold text-text-primary select-none text-xs">
                  Alert Duration & Auto-Expiry
                </label>
                <span className="text-[10px] text-text-tertiary">
                  {annHasExpiry ? 'Auto-expires on date' : 'Stays active indefinitely'}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setAnnHasExpiry(false);
                    setAnnEndDate('');
                  }}
                  className={`p-2.5 rounded-lg border text-left cursor-pointer transition-colors ${
                    !annHasExpiry
                      ? 'border-accent bg-accent/10 text-accent font-bold shadow-sm'
                      : 'border-border bg-surface hover:bg-surface-elevated text-text-secondary'
                  }`}
                >
                  <div className="font-semibold text-xs">♾️ Keep Indefinitely</div>
                  <div className="text-[10px] opacity-75 mt-0.5">Until manually deleted or switched off</div>
                </button>

                <button
                  type="button"
                  onClick={() => setAnnHasExpiry(true)}
                  className={`p-2.5 rounded-lg border text-left cursor-pointer transition-colors ${
                    annHasExpiry
                      ? 'border-accent bg-accent/10 text-accent font-bold shadow-sm'
                      : 'border-border bg-surface hover:bg-surface-elevated text-text-secondary'
                  }`}
                >
                  <div className="font-semibold text-xs">⏰ Set Auto-Expiry</div>
                  <div className="text-[10px] opacity-75 mt-0.5">Auto-hide after specific date & time</div>
                </button>
              </div>

              {annHasExpiry && (
                <div className="space-y-1.5 pt-1 border-t border-border/40">
                  <label className="font-bold text-text-secondary select-none text-[11px] block">
                    Auto-Expire Date & Time
                  </label>
                  <input
                    type="datetime-local"
                    value={annEndDate}
                    onChange={(e) => setAnnEndDate(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg bg-surface border border-border text-text-primary focus:outline-none focus:border-accent"
                    required={annHasExpiry}
                  />
                  <p className="text-[10px] text-text-tertiary">
                    After this exact date and time, the announcement will automatically stop showing on the Citizen Portal.
                  </p>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="font-bold text-text-secondary select-none">Alert Category / Type</label>
                <Select value={annType} onChange={(e: any) => setAnnType(e.target.value)}>
                  <option value="notice">General Notice</option>
                  <option value="holiday">Holiday Notice</option>
                  <option value="new_scheme">New Scheme Launched</option>
                  <option value="portal_down">Portal Downtime Alert</option>
                </Select>
              </div>

              <div className="space-y-2 pt-5">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={annIsPinned}
                    onChange={(e) => setAnnIsPinned(e.target.checked)}
                    className="rounded border-border text-accent focus:ring-accent w-4 h-4 cursor-pointer"
                  />
                  <span className="text-xs font-semibold text-text-primary">Pin to Top of Homepage</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={annIsActive}
                    onChange={(e) => setAnnIsActive(e.target.checked)}
                    className="rounded border-border text-accent focus:ring-accent w-4 h-4 cursor-pointer"
                  />
                  <span className="text-xs font-semibold text-text-primary">Active Now</span>
                </label>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsAnnModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={saveAnnMutation.isPending}>
                {saveAnnMutation.isPending ? 'Saving...' : editingAnn ? 'Update Alert' : 'Publish Alert'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
