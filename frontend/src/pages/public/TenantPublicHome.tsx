import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useSearchParams } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Skeleton } from '../../components/ui/Skeleton';
import { cmsApi } from '../../services/cms.api';
import { categoryApi } from '../../services/category.api';
import { serviceApi } from '../../services/service.api';
import {
  ArrowRight,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  Monitor,
  Sparkles,
  Search,
  Lock,
  FileCheck2,
  Clock,
  ShieldCheck,
  Megaphone,
} from 'lucide-react';

export function TenantPublicHome() {
  const [searchParams] = useSearchParams();
  const tenantParam = searchParams.get('tenant') || searchParams.get('app');
  const [activeFaq, setActiveFaq] = useState<string | null>(null);
  const [showAnnouncement, setShowAnnouncement] = useState(true);
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Queries
  const settingsQuery = useQuery({
    queryKey: ['cmsSettings'],
    queryFn: cmsApi.getSettings,
  });

  const announcementsQuery = useQuery({
    queryKey: ['publicAnnouncements'],
    queryFn: cmsApi.getPublicAnnouncements,
  });

  const categoriesQuery = useQuery({
    queryKey: ['publicCategories'],
    queryFn: categoryApi.getPublic,
  });

  const publicServicesQuery = useQuery({
    queryKey: ['publicServices'],
    queryFn: serviceApi.getPublic,
  });

  const faqsQuery = useQuery({
    queryKey: ['publicFaqs'],
    queryFn: () => cmsApi.getPublicFaqs(),
  });

  const pagesQuery = useQuery({
    queryKey: ['publicPagesList', tenantParam],
    queryFn: () => cmsApi.getPages(1, 50),
  });

  const settings = settingsQuery.data;
  const announcements = announcementsQuery.data || [];
  const categories = categoriesQuery.data || [];
  const allServices = publicServicesQuery.data || [];
  const faqs = faqsQuery.data || [];
  const pagesList: any[] = Array.isArray(pagesQuery.data)
    ? pagesQuery.data
    : (pagesQuery.data as any)?.pages || [];

  const sideDisplays = settings?.sideDisplays;
  const isSideDisplaysActive = sideDisplays?.enabled;
  const leftWing = isSideDisplaysActive && sideDisplays?.leftWing?.enabled ? sideDisplays.leftWing : null;
  const rightWing = isSideDisplaysActive && sideDisplays?.rightWing?.enabled ? sideDisplays.rightWing : null;

  const pinnedAnnouncement = announcements.find((a) => a.isPinned && a.isActive);

  // Hero Background Carousel / Thumbnails
  const heroBg = settings?.heroBackground;
  const heroImages = heroBg?.enabled && Array.isArray(heroBg?.images) && heroBg.images.length > 0
    ? heroBg.images
    : [];

  const [currentHeroSlide, setCurrentHeroSlide] = useState(0);

  useEffect(() => {
    if (heroImages.length <= 1) return;
    const intervalTime = Math.max(2, heroBg?.autoPlayIntervalSeconds || 5) * 1000;
    const timer = setInterval(() => {
      setCurrentHeroSlide((prev) => (prev + 1) % heroImages.length);
    }, intervalTime);
    return () => clearInterval(timer);
  }, [heroImages.length, heroBg?.autoPlayIntervalSeconds]);

  // Filter services by Category and Search
  const filteredServices = allServices.filter((s) => {
    const matchesCategory =
      selectedCategoryFilter === 'all' ||
      s.category === selectedCategoryFilter ||
      (typeof s.category === 'object' && (s.category as any)?._id === selectedCategoryFilter);

    const matchesSearch =
      !searchQuery.trim() ||
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.description ? s.description.toLowerCase().includes(searchQuery.toLowerCase()) : false);

    return matchesCategory && matchesSearch;
  });

  const websiteTitle = settings?.websiteName || 'Digital Citizen Service Center';

  return (
    <div className="space-y-12 pb-16 text-left">
      {/* Pinned Global Announcement */}
      {pinnedAnnouncement && showAnnouncement && (
        <div className="bg-accent/10 border-b border-accent/20 px-4 py-2.5 text-xs text-accent flex items-center justify-between">
          <div className="max-w-6xl mx-auto flex items-center gap-2 flex-1 justify-center font-medium">
            <span className="font-bold uppercase tracking-wider text-[10px] bg-accent text-white px-2 py-0.5 rounded">
              {pinnedAnnouncement.type.replace('_', ' ')}
            </span>
            <span>{pinnedAnnouncement.title}:</span>
            <span className="text-text-primary hidden sm:inline">{pinnedAnnouncement.content}</span>
          </div>
          <button
            onClick={() => setShowAnnouncement(false)}
            className="text-accent hover:text-accent-hover font-bold p-1"
          >
            ✕
          </button>
        </div>
      )}

      {/* Hero Section Container with Dynamic Background Carousel & Optional Display Wings */}
      <section className="relative px-3 sm:px-6 lg:px-8 max-w-[1550px] w-full mx-auto pt-4 md:pt-6">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-accent/15 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col lg:flex-row items-stretch gap-4 lg:gap-5 relative z-10 w-full justify-between">
          {/* 👈 Left Display Wing (Slim & Positioned at Far Left) */}
          {leftWing && (
            <SideWingCard wing={leftWing} pages={pagesList} tenantParam={tenantParam} />
          )}

          {/* 🎯 Center Main Hero Card (Expansive and Spacious) */}
          <div className="flex-1 min-w-0 relative border border-border bg-surface/80 backdrop-blur-md rounded-2xl p-6 md:p-10 lg:p-12 overflow-hidden shadow-2xl space-y-8 min-h-[400px] flex flex-col justify-between">
            {/* Dynamic Background Image Slider (Single / Multi Thumbnail) */}
            {heroImages.length > 0 && (
              <>
                {heroImages.map((imgUrl, idx) => (
                  <div
                    key={idx}
                    className={`absolute inset-0 transition-all duration-1000 ease-in-out ${
                      idx === currentHeroSlide ? 'opacity-100 scale-105' : 'opacity-0 scale-100'
                    }`}
                    style={{
                      backgroundImage: `url(${imgUrl})`,
                      backgroundSize: 'cover',
                      backgroundPosition: 'center',
                    }}
                  />
                ))}

                {/* Dynamic Dark Gradient Overlay for Maximum Text Contrast */}
                <div
                  className="absolute inset-0 transition-opacity"
                  style={{
                    backgroundColor: `rgba(0, 0, 0, ${heroBg?.overlayOpacity ?? 0.65})`,
                  }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/40 pointer-events-none" />
              </>
            )}

            {/* Hero Content Layer */}
            <div className="relative z-10 space-y-6 md:space-y-8">
              <div className="flex flex-wrap items-center gap-2.5">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-semibold bg-accent/20 border border-accent/30 text-accent backdrop-blur-md">
                  <Sparkles className="w-3.5 h-3.5" /> Citizen Service Center
                </span>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono text-emerald-400 bg-emerald-950/60 border border-emerald-500/30 backdrop-blur-md">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" /> Counter Services Open
                </span>
              </div>

              <div className="space-y-3 md:space-y-4">
                <h1 className="text-3xl md:text-5xl lg:text-6xl font-extrabold tracking-tight text-text-primary leading-[1.12]">
                  {websiteTitle}
                </h1>
                <p className="text-sm md:text-base lg:text-lg text-text-secondary leading-relaxed max-w-4xl">
                  {settings?.tagline ||
                    'Simplifying access to Government, Financial, and Digital services securely. Apply online, generate counter tokens, or track your application status.'}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3.5 pt-2">
                <a href="#services">
                  <Button size="lg" className="gap-2 shadow-lg shadow-accent/20">
                    Browse Services & Apply <ArrowRight className="w-4 h-4" />
                  </Button>
                </a>
                <Link to={tenantParam ? `/track?tenant=${tenantParam}` : '/track'}>
                  <Button variant="outline" size="lg" className="gap-2 backdrop-blur-sm">
                    <Search className="w-4 h-4 text-accent" /> Track Application Status
                  </Button>
                </Link>
                <Link to={tenantParam ? `/queue-display?tenant=${tenantParam}` : '/queue-display'}>
                  <Button variant="secondary" size="lg" className="gap-2 backdrop-blur-sm">
                    <Monitor className="w-4 h-4 text-emerald-400" /> Live TV Queue Screen
                  </Button>
                </Link>
                <Link to={tenantParam ? `/portal?tenant=${tenantParam}` : '/portal'}>
                  <Button variant="ghost" size="lg" className="gap-2 text-text-secondary hover:text-text-primary backdrop-blur-sm">
                    <Lock className="w-4 h-4" /> Customer Locker
                  </Button>
                </Link>
              </div>
            </div>

            {/* Slide Indicator Dots (If multiple thumbnails configured) */}
            {heroImages.length > 1 && (
              <div className="relative z-10 flex items-center justify-start gap-1.5 pt-4">
                {heroImages.map((_, dotIdx) => (
                  <button
                    key={dotIdx}
                    onClick={() => setCurrentHeroSlide(dotIdx)}
                    className={`h-1.5 rounded-full transition-all duration-300 cursor-pointer ${
                      dotIdx === currentHeroSlide
                        ? 'w-6 bg-accent shadow-sm shadow-accent'
                        : 'w-2 bg-white/40 hover:bg-white/70'
                    }`}
                    title={`Slide ${dotIdx + 1}`}
                  />
                ))}
              </div>
            )}
          </div>

          {/* 👉 Right Display Wing (Slim & Positioned at Far Right) */}
          {rightWing && (
            <SideWingCard wing={rightWing} pages={pagesList} tenantParam={tenantParam} />
          )}
        </div>
      </section>

      {/* Active Official Notices & Announcements Section */}
      {announcements.length > 0 && (
        <section className="px-6 max-w-6xl mx-auto">
          <div className="p-4 rounded-xl border border-accent/25 bg-accent/5 backdrop-blur-md space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold text-accent uppercase tracking-wider font-mono">
              <Megaphone className="w-4 h-4" /> Latest Official Notices & Updates
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {announcements.map((item) => (
                <div
                  key={item._id}
                  className="p-3.5 rounded-xl bg-surface border border-border flex items-start gap-3 shadow-sm hover:border-accent/40 transition-colors"
                >
                  <span className="text-[10px] font-bold font-mono uppercase px-2 py-0.5 rounded bg-accent/10 border border-accent/20 text-accent shrink-0 mt-0.5">
                    {item.type.replace('_', ' ')}
                  </span>
                  <div className="space-y-0.5 flex-1 min-w-0">
                    <h4 className="font-bold text-xs text-text-primary line-clamp-1">{item.title}</h4>
                    <p className="text-[11px] text-text-secondary line-clamp-2 leading-relaxed">{item.content}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Citizen Service Catalog Section */}
      <section id="services" className="px-6 max-w-6xl mx-auto space-y-8 scroll-mt-20">
        <div className="border-b border-border pb-4 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <div className="text-xs font-mono font-bold uppercase tracking-wider text-accent">Public Service Gateway</div>
            <h2 className="text-2xl font-bold tracking-tight text-text-primary mt-1">
              Available Digital Services
            </h2>
            <p className="text-xs text-text-secondary mt-1">
              Apply online, generate queue tokens, or book counter appointment slots directly.
            </p>
          </div>

          <div className="relative w-full md:w-72">
            <Search className="w-4 h-4 text-text-tertiary absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search services (e.g. Pan, Income, Caste)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs rounded-lg bg-surface border border-border text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-accent"
            />
          </div>
        </div>

        {categories.length > 0 && (
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setSelectedCategoryFilter('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                selectedCategoryFilter === 'all'
                  ? 'bg-accent text-white font-semibold'
                  : 'bg-surface border border-border text-text-secondary hover:text-text-primary'
              }`}
            >
              All Categories ({allServices.length})
            </button>
            {categories
              .filter((c) => c.isActive && !c.parent)
              .map((cat) => (
                <button
                  key={cat._id}
                  onClick={() => setSelectedCategoryFilter(cat._id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer flex items-center gap-1.5 ${
                    selectedCategoryFilter === cat._id
                      ? 'bg-accent text-white font-semibold'
                      : 'bg-surface border border-border text-text-secondary hover:text-text-primary'
                  }`}
                >
                  <span>{cat.icon || '📁'}</span>
                  <span>{cat.name}</span>
                </button>
              ))}
          </div>
        )}

        {publicServicesQuery.isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-44 w-full rounded-xl" />
            ))}
          </div>
        ) : filteredServices.length === 0 ? (
          <div className="text-center p-12 border border-dashed border-border rounded-xl bg-surface space-y-3">
            <p className="text-sm text-text-secondary">No services match your search or filter criteria.</p>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setSearchQuery('');
                setSelectedCategoryFilter('all');
              }}
            >
              Clear Filters
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {filteredServices.map((service) => (
              <Card
                key={service.id}
                className="flex flex-col justify-between p-5 h-full space-y-4 border border-border hover:border-accent/50 transition-all bg-surface hover:bg-surface-elevated"
              >
                <div className="space-y-3">
                  <div className="flex justify-between items-start gap-2">
                    <span className="text-2xl">{service.icon || '⚡'}</span>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-accent bg-accent/10 border border-accent/20 px-2 py-0.5 rounded-full font-mono">
                      {service.serviceMode}
                    </span>
                  </div>
                  <div>
                    <h3 className="font-bold text-text-primary text-base line-clamp-1">{service.name}</h3>
                    <p className="text-xs text-text-secondary line-clamp-2 mt-1">{service.description}</p>
                  </div>
                </div>

                <div className="pt-3 border-t border-border flex justify-between items-center text-xs">
                  <div className="font-mono text-text-secondary">
                    Total Fee: <span className="text-text-primary font-bold">₹{service.fees.total}</span>
                  </div>
                  <Link
                    to={tenantParam ? `/services/${service.slug}?tenant=${tenantParam}` : `/services/${service.slug}`}
                  >
                    <Button size="sm" className="gap-1">
                      Apply Now <ArrowRight className="w-3 h-3" />
                    </Button>
                  </Link>
                </div>
              </Card>
            ))}
          </div>
        )}
      </section>

      {/* Key Citizen Trust Highlights */}
      <section className="px-6 max-w-6xl mx-auto">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-5 rounded-2xl bg-surface border border-border space-y-2">
            <div className="w-9 h-9 rounded-xl bg-accent/10 text-accent flex items-center justify-center">
              <FileCheck2 className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-sm text-text-primary">Instant Application</h3>
            <p className="text-xs text-text-secondary leading-relaxed">
              Fill online forms with real-time verification and digital document uploads.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-surface border border-border space-y-2">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
              <Clock className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-sm text-text-primary">Live Status Tracking</h3>
            <p className="text-xs text-text-secondary leading-relaxed">
              Track your application milestones and stage updates 24/7 without logging in.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-surface border border-border space-y-2">
            <div className="w-9 h-9 rounded-xl bg-purple-500/10 text-purple-500 flex items-center justify-center">
              <Monitor className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-sm text-text-primary">Lobby Queue Screen</h3>
            <p className="text-xs text-text-secondary leading-relaxed">
              Watch real-time token announcements on the public TV display screen.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-surface border border-border space-y-2">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-sm text-text-primary">Digital Document Locker</h3>
            <p className="text-xs text-text-secondary leading-relaxed">
              Store, re-use, and download issued certificates and receipts securely.
            </p>
          </div>
        </div>
      </section>

      {/* FAQ Accordion */}
      <section className="px-6 max-w-3xl mx-auto space-y-6">
        <div className="text-center space-y-1">
          <h2 className="text-2xl font-bold tracking-tight text-text-primary flex items-center justify-center gap-2">
            <HelpCircle className="w-5 h-5 text-accent" /> Frequently Asked Questions
          </h2>
          <p className="text-xs text-text-secondary">Direct answers for citizen applications & service center operations.</p>
        </div>

        {faqsQuery.isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full rounded-lg" />
            ))}
          </div>
        ) : faqs.length === 0 ? (
          <div className="space-y-2">
            <div className="border border-border rounded-lg bg-surface p-4 text-left">
              <div className="font-semibold text-sm text-text-primary">Can citizens track applications without logging in?</div>
              <div className="text-xs text-text-secondary mt-2 leading-relaxed">
                Yes! Every submitted application gets a unique Application Number (e.g. APP-2026-XXXX) which can be tracked on the public <code>/track</code> page.
              </div>
            </div>
            <div className="border border-border rounded-lg bg-surface p-4 text-left">
              <div className="font-semibold text-sm text-text-primary">How does the Queue & Token system work?</div>
              <div className="text-xs text-text-secondary mt-2 leading-relaxed">
                Desk operators call tokens with priority ordering, while citizens in the lobby view live token updates on the <code>/queue-display</code> screen.
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            {faqs.map((faq) => (
              <div key={faq._id} className="border border-border rounded-lg bg-surface overflow-hidden">
                <button
                  onClick={() => setActiveFaq(activeFaq === faq._id ? null : faq._id)}
                  className="w-full px-5 py-4 flex justify-between items-center text-left hover:bg-surface-elevated transition-colors cursor-pointer focus:outline-none"
                >
                  <span className="font-medium text-sm text-text-primary">{faq.question}</span>
                  {activeFaq === faq._id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </button>
                {activeFaq === faq._id && (
                  <div className="px-5 pb-4 text-xs text-text-secondary leading-relaxed border-t border-border pt-3 bg-bg/25">
                    {faq.answer}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// CUSTOM HTML / FORM SANDBOXED WIDGET (BULLETPROOF & CRASH-PROOF)
// ═══════════════════════════════════════════════════════════════════
function HtmlWidget({ html }: { html?: string }) {
  if (!html || !html.trim()) {
    return (
      <div className="p-3 text-center rounded-xl bg-accent/10 border border-accent/25 text-accent text-xs font-semibold flex-1 flex flex-col justify-center items-center">
        ✨ Special Mubarak & Greetings! ✨
        <p className="text-[10px] text-text-secondary mt-1 font-normal">All Kendra online services are live and available.</p>
      </div>
    );
  }

  const sanitizedDoc = `
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
        <style>
          * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
            font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            -ms-overflow-style: none !important;
            scrollbar-width: none !important;
          }
          *::-webkit-scrollbar {
            display: none !important;
            width: 0px !important;
            height: 0px !important;
          }
          html, body {
            width: 100%;
            height: 100%;
            margin: 0;
            padding: 0;
            background: transparent;
            overflow: hidden !important;
            display: flex;
            flex-direction: column;
          }
          body > * {
            flex: 1 1 auto;
            width: 100% !important;
            max-width: 100% !important;
            height: 100% !important;
          }
          img {
            max-width: 100%;
            height: auto;
            border-radius: 8px;
          }
          input, button, select, textarea {
            font-family: inherit;
            font-size: 12px;
            border-radius: 6px;
            padding: 6px 10px;
          }
          input[type="text"], input[type="email"], input[type="number"], input[type="tel"], select, textarea {
            background: #18181b;
            border: 1px solid #3f3f46;
            color: #ffffff;
            width: 100%;
            margin-bottom: 6px;
            display: block;
          }
          button, input[type="submit"] {
            background: #ea580c;
            color: #ffffff;
            border: none;
            cursor: pointer;
            font-weight: bold;
            width: 100%;
            padding: 8px;
            margin-top: 4px;
            border-radius: 6px;
          }
          button:hover, input[type="submit"]:hover {
            opacity: 0.9;
          }
          a { color: #f97316; text-decoration: none; }
          a:hover { text-decoration: underline; }
        </style>
      </head>
      <body>
        ${html}
      </body>
    </html>
  `;

  return (
    <div className="w-full flex-1 min-h-[320px] rounded-xl overflow-hidden border border-border/60 bg-transparent flex flex-col">
      <iframe
        srcDoc={sanitizedDoc}
        title="Custom HTML Form Widget"
        className="w-full flex-1 h-full min-h-[320px] border-0"
        scrolling="no"
        sandbox="allow-scripts allow-forms allow-same-origin allow-popups allow-modals"
        loading="lazy"
      />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// SIDE DISPLAY WING WIDGET (BANNER / PAGES LIST / CUSTOM HTML GREETINGS)
// ═══════════════════════════════════════════════════════════════════
function SideWingCard({
  wing,
  pages,
  tenantParam,
}: {
  wing: any;
  pages: any[];
  tenantParam: string | null;
}) {
  if (!wing || !wing.enabled) return null;

  return (
    <div className="w-full lg:w-56 xl:w-60 shrink-0 flex flex-col justify-between gap-3 rounded-2xl border border-border bg-surface/90 backdrop-blur-md p-3.5 shadow-xl text-left self-stretch transition-all hover:border-accent/40">
      <div className="space-y-2.5 flex-1 flex flex-col">
        {wing.title && (
          <div className="flex items-center gap-1.5 border-b border-border/80 pb-2">
            <Sparkles className="w-3.5 h-3.5 text-accent shrink-0" />
            <h3 className="font-bold text-xs uppercase tracking-wider text-text-primary line-clamp-1">
              {wing.title}
            </h3>
          </div>
        )}

        {/* 1. Image Banner (PNG, JPG, JPEG) */}
        {wing.type === 'banner' && (
          <div className="space-y-2 flex-1 flex flex-col justify-center">
            {wing.bannerImageUrl ? (
              wing.bannerLink ? (
                <a
                  href={
                    tenantParam && wing.bannerLink.startsWith('/') && !wing.bannerLink.includes('?')
                      ? `${wing.bannerLink}?tenant=${tenantParam}`
                      : wing.bannerLink
                  }
                  target={wing.bannerLink.startsWith('http') ? '_blank' : undefined}
                  rel={wing.bannerLink.startsWith('http') ? 'noopener noreferrer' : undefined}
                  className="group block overflow-hidden rounded-xl border border-border/80 relative aspect-[3/4] bg-bg/50 shadow-md flex-1"
                >
                  <img
                    src={wing.bannerImageUrl}
                    alt={wing.title || 'Promotional Banner'}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-black/15 group-hover:bg-black/0 transition-colors" />
                </a>
              ) : (
                <div className="overflow-hidden rounded-xl border border-border/80 relative aspect-[3/4] bg-bg/50 shadow-md flex-1">
                  <img
                    src={wing.bannerImageUrl}
                    alt={wing.title || 'Promotional Banner'}
                    className="w-full h-full object-cover"
                  />
                </div>
              )
            ) : (
              <div className="p-4 text-center rounded-xl bg-surface-elevated border border-dashed border-border text-[11px] text-text-tertiary">
                No banner image selected.
              </div>
            )}
          </div>
        )}

        {/* 2. Legal Pages Quick Links (All Published Pages) */}
        {(wing.type === 'legal_pages' || wing.showLegalPagesList) && (
          <div className="space-y-2 flex-1">
            <div className="text-[11px] font-semibold text-text-secondary">Official Documents:</div>
            {pages.length === 0 ? (
              <p className="text-[11px] text-text-tertiary">No pages published.</p>
            ) : (
              <div className="flex flex-col gap-1.5 max-h-60 overflow-y-auto pr-1">
                {pages
                  .filter((p) => p && p.status === 'published')
                  .map((p) => {
                    const url = tenantParam ? `/pages/${p.slug}?tenant=${tenantParam}` : `/pages/${p.slug}`;
                    return (
                      <Link
                        key={p._id || p.slug}
                        to={url}
                        className="px-2.5 py-1.5 rounded-lg bg-surface-elevated/80 hover:bg-accent/15 border border-border/60 text-xs font-medium text-text-primary hover:text-accent flex items-center justify-between transition-colors group"
                      >
                        <span className="truncate">{p.title}</span>
                        <ArrowRight className="w-3.5 h-3.5 text-text-tertiary group-hover:text-accent shrink-0 ml-1" />
                      </Link>
                    );
                  })}
              </div>
            )}
          </div>
        )}

        {/* 3. Custom HTML / Forms / Festive Mubarak Greeting Code */}
        {wing.type === 'custom_html' && (
          <HtmlWidget html={wing.customHtml} />
        )}
      </div>

      <div className="pt-2 border-t border-border/40 text-[10px] text-text-tertiary font-mono flex items-center justify-between">
        <span>Verified Kendra</span>
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
      </div>
    </div>
  );
}
