import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { cmsApi } from '../../services/cms.api';
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
import { ArrowUp, ArrowDown, Edit2, Trash2, Plus, Monitor, AlertOctagon, FolderOpen, Sparkles } from 'lucide-react';

export function CMSConfig() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'settings' | 'menus' | 'pages' | 'banners' | 'faqs' | 'announcements'>('settings');

  // Media Picker Trigger State
  const [isMediaPickerOpen, setIsMediaPickerOpen] = useState(false);
  const [mediaPickerTarget, setMediaPickerTarget] = useState<'settings_logo' | 'banner' | 'page' | 'hero_bg' | null>(null);

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

  const pagesList = pagesQuery.data?.pages || [];

  const bannersQuery = useQuery({
    queryKey: ['adminBannersList'],
    queryFn: () => cmsApi.getBanners(1, 100),
    enabled: activeTab === 'banners',
  });

  const bannersList: Banner[] = bannersQuery.data?.banners || [];

  const faqsQuery = useQuery({
    queryKey: ['adminFaqsList'],
    queryFn: () => cmsApi.getFaqs(1, 100),
    enabled: activeTab === 'faqs',
  });

  const faqsList = faqsQuery.data?.faqs || [];

  const announcementsQuery = useQuery({
    queryKey: ['adminAnnouncementsList'],
    queryFn: () => cmsApi.getAnnouncements(1, 100),
    enabled: activeTab === 'announcements',
  });

  const announcementsList: Announcement[] = announcementsQuery.data?.announcements || [];

  // Mutations
  const saveSettingsMutation = useMutation({
    mutationFn: (body: Partial<WebsiteSetting>) => cmsApi.updateSettings(body),
  });

  const maintenanceMutation = useMutation({
    mutationFn: (body: any) => cmsApi.toggleMaintenanceMode(body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminSettings'] });
    },
  });

  const saveMenuMutation = useMutation({
    mutationFn: (items: MenuItem[]) => cmsApi.saveMenu(menuLocation, items),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminMenus', menuLocation] });
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
    },
  });

  const deletePageMutation = useMutation({
    mutationFn: (id: string) => cmsApi.deletePage(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminPagesList'] });
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
    },
  });

  const deleteBannerMutation = useMutation({
    mutationFn: (id: string) => cmsApi.deleteBanner(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminBannersList'] });
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
    },
  });

  const deleteFaqMutation = useMutation({
    mutationFn: (id: string) => cmsApi.deleteFaq(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminFaqsList'] });
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
    },
  });

  const deleteAnnMutation = useMutation({
    mutationFn: (id: string) => cmsApi.deleteAnnouncement(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminAnnouncementsList'] });
    },
  });

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
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
    setMediaPickerTarget(null);
  };

  return (
    <div className="p-6 text-left space-y-6 max-w-6xl mx-auto">
      {/* Top Header */}
      <div className="border-b border-border pb-4">
        <h1 className="text-2xl font-bold font-sans text-text-primary">CMS Config Console</h1>
        <p className="text-xs text-text-secondary mt-0.5 select-none">Admin settings portal for branding, menus, pages and banners.</p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border text-xs select-none">
        {[
          { key: 'settings', label: 'Site Settings' },
          { key: 'menus', label: 'Menus Editor' },
          { key: 'pages', label: 'Legal Pages' },
          { key: 'banners', label: 'Hero Banners' },
          { key: 'faqs', label: 'FAQs CRUD' },
          { key: 'announcements', label: 'Announcements' },
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
                    <label className="font-bold text-text-secondary select-none">Logo URL / Image Link</label>
                    <div className="flex gap-2">
                      <Input value={logoUrl} onChange={(e) => setLogoUrl(e.target.value)} />
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
                <Button type="submit" disabled={saveSettingsMutation.isPending}>
                  {saveSettingsMutation.isPending ? 'Saving...' : 'Save Site Settings'}
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
              <Skeleton className="h-10 w-full animate-pulse" />
            </div>
          ) : pagesList.length === 0 ? (
            <Card className="text-center p-8 border border-dashed border-border bg-surface select-none">
              <p className="text-xs text-text-tertiary">No custom pages configured.</p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {pagesList.map((p: any) => (
                <Card key={p._id} className="p-4 flex flex-col justify-between items-start gap-4">
                  <div className="text-left space-y-1">
                    <span className="font-bold text-xs text-text-primary block">{p.title}</span>
                    <span className="text-[10px] text-text-tertiary block font-mono">/{p.slug}</span>
                    <Badge variant={p.status === 'published' ? 'success' : 'secondary'}>{p.status}</Badge>
                  </div>
                  <div className="flex gap-2 select-none">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setEditingPage(p);
                        setPageTitle(p.title);
                        setPageSlug(p.slug);
                        setPageContent(p.content);
                        setPageStatus(p.status);
                        setIsPageModalOpen(true);
                      }}
                    >
                      Edit Page
                    </Button>
                    <button
                      onClick={() => deletePageMutation.mutate(p._id)}
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
            <h3 className="text-xs font-bold text-text-secondary uppercase tracking-wider">Dismissible Alerts</h3>
            <Button
              size="sm"
              onClick={() => {
                setEditingAnn(null);
                setAnnTitle('');
                setAnnContent('');
                setAnnType('notice');
                setAnnIsPinned(false);
                setAnnIsActive(true);
                setIsAnnModalOpen(true);
              }}
            >
              + Add Alert
            </Button>
          </div>

          {announcementsQuery.isLoading ? (
            <Skeleton className="h-10 w-full animate-pulse" />
          ) : announcementsList.length === 0 ? (
            <Card className="text-center p-8 border border-dashed border-border bg-surface select-none">
              <p className="text-xs text-text-tertiary">No alerts listed.</p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {announcementsList.map((ann) => (
                <Card key={ann._id} className="p-4 flex flex-col justify-between items-start gap-4">
                  <div className="text-left space-y-1">
                    <span className="font-bold text-xs text-text-primary block">{ann.title}</span>
                    <p className="text-[10px] text-text-secondary line-clamp-2 select-none">{ann.content}</p>
                    <div className="flex gap-1.5 pt-2 select-none">
                      <Badge variant="warning">{ann.type}</Badge>
                      {ann.isPinned && <Badge variant="success">PINNED</Badge>}
                    </div>
                  </div>
                  <div className="flex gap-2 select-none">
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
                        setIsAnnModalOpen(true);
                      }}
                    >
                      Edit
                    </Button>
                    <button
                      onClick={() => deleteAnnMutation.mutate(ann._id)}
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

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="font-bold text-text-secondary select-none">Device targeting</label>
                <Select value={bannerDevice} onChange={(e: any) => setBannerDevice(e.target.value)}>
                  <option value="both">All Devices</option>
                  <option value="desktop">Desktop Only</option>
                  <option value="mobile">Mobile Screen Only</option>
                </Select>
              </div>
              <div className="space-y-1.5">
                <label className="font-bold text-text-secondary select-none">Banner Image Link</label>
                <div className="flex gap-2">
                  <Input value={bannerImageUrl} onChange={(e) => setBannerImageUrl(e.target.value)} />
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
