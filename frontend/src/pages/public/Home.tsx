import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Skeleton } from '../../components/ui/Skeleton';
import { cmsApi } from '../../services/cms.api';
import { categoryApi } from '../../services/category.api';
import { serviceApi } from '../../services/service.api';
import { ChevronDown, ChevronUp, ArrowRight, HelpCircle } from 'lucide-react';

export function Home() {
  const [activeFaq, setActiveFaq] = useState<string | null>(null);
  const [showAnnouncement, setShowAnnouncement] = useState(true);

  // Queries
  const settingsQuery = useQuery({
    queryKey: ['cmsSettings'],
    queryFn: cmsApi.getSettings,
  });

  const bannersQuery = useQuery({
    queryKey: ['publicBanners'],
    queryFn: cmsApi.getPublicBanners,
  });

  const announcementsQuery = useQuery({
    queryKey: ['publicAnnouncements'],
    queryFn: cmsApi.getPublicAnnouncements,
  });

  const categoriesQuery = useQuery({
    queryKey: ['publicCategories'],
    queryFn: categoryApi.getPublic,
  });

  const featuredServicesQuery = useQuery({
    queryKey: ['featuredServices'],
    queryFn: serviceApi.getFeatured,
  });

  const faqsQuery = useQuery({
    queryKey: ['publicFaqs'],
    queryFn: () => cmsApi.getPublicFaqs(),
  });

  const settings = settingsQuery.data;
  const banners = bannersQuery.data || [];
  const announcements = announcementsQuery.data || [];
  const categories = categoriesQuery.data || [];
  const services = featuredServicesQuery.data || [];
  const faqs = faqsQuery.data || [];

  // Pinned announcement
  const pinnedAnnouncement = announcements.find((a) => a.isPinned && a.isActive);

  return (
    <div className="space-y-12 pb-16">
      {/* Announcement Bar */}
      {showAnnouncement && pinnedAnnouncement && (
        <div className="bg-warning/10 border-b border-warning/20 text-warning px-6 py-2.5 text-sm flex items-center justify-between gap-4 font-sans select-none text-left">
          <div className="flex items-center gap-2">
            <span className="font-bold uppercase tracking-wider text-[10px] bg-warning text-bg px-1.5 py-0.5 rounded font-mono">
              {pinnedAnnouncement.type}
            </span>
            <span>{pinnedAnnouncement.content}</span>
          </div>
          <button
            onClick={() => setShowAnnouncement(false)}
            className="text-warning/80 hover:text-warning focus:outline-none cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* Hero Banner Section */}
      <section className="px-6 max-w-6xl mx-auto">
        {bannersQuery.isLoading ? (
          <Skeleton className="h-[360px] w-full rounded-lg" />
        ) : banners.length > 0 ? (
          <div className="relative h-[360px] rounded-lg overflow-hidden border border-border bg-surface flex items-center p-8 md:p-12 text-left">
            <div className="z-10 max-w-lg space-y-4">
              {banners[0].subtitle && (
                <p className="text-accent text-xs font-mono font-bold uppercase tracking-wider">{banners[0].subtitle}</p>
              )}
              <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-text-primary">
                {banners[0].title || settings?.cscName || 'Your Digital Service Gateway'}
              </h1>
              <div className="pt-2 flex gap-4">
                {banners[0].ctaLink && banners[0].ctaText && (
                  <Link to={banners[0].ctaLink}>
                    <Button>{banners[0].ctaText}</Button>
                  </Link>
                )}
              </div>
            </div>
            {banners[0].image?.url && (
              <div className="absolute inset-0 bg-gradient-to-r from-surface via-surface/80 to-transparent z-0">
                <img
                  src={banners[0].image.url}
                  alt="banner"
                  className="absolute right-0 h-full w-1/2 object-cover opacity-30 select-none pointer-events-none"
                />
              </div>
            )}
          </div>
        ) : (
          // Default Hero Fallback
          <div className="rounded-lg border border-border bg-surface p-12 md:p-16 text-center space-y-6 max-w-4xl mx-auto">
            <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl font-sans text-text-primary">
              {settings?.cscName || 'Common Service Center OS'}
            </h1>
            <p className="text-lg text-text-secondary max-w-xl mx-auto select-none">
              {settings?.tagline || 'Simplifying access to Government, Financial, and Digital services securely.'}
            </p>
            <div className="flex justify-center gap-4 pt-4">
              <Link to="/login">
                <Button variant="primary" size="lg">Sign In</Button>
              </Link>
              <Link to="/register">
                <Button variant="outline" size="lg">Register Account</Button>
              </Link>
            </div>
          </div>
        )}
      </section>

      {/* Category Grid Section */}
      <section className="px-6 max-w-6xl mx-auto text-left space-y-6">
        <div className="border-b border-border pb-4 flex justify-between items-end">
          <div>
            <h2 className="text-xl font-bold tracking-tight text-text-primary">Service Categories</h2>
            <p className="text-xs text-text-secondary mt-1">Browse and apply for digital services by category.</p>
          </div>
        </div>

        {categoriesQuery.isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-28 w-full" />
            ))}
          </div>
        ) : categories.length === 0 ? (
          <div className="text-center p-8 border border-dashed border-border rounded-lg bg-surface">
            <p className="text-sm text-text-secondary">No categories published yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {categories
              .filter((c) => c.isActive && !c.parent)
              .map((category) => (
                <Link key={category._id} to={`/categories/${category.slug}`}>
                  <Card className="hover:border-accent transition-colors cursor-pointer h-full flex flex-col justify-between p-5">
                    <div className="space-y-2">
                      <div className="text-xl" style={{ color: category.themeColor || 'var(--color-accent)' }}>
                        {category.icon ? <span className="mr-1">{category.icon}</span> : '📁'}
                      </div>
                      <h3 className="font-bold text-text-primary text-base">{category.name}</h3>
                      {category.description && (
                        <p className="text-xs text-text-secondary line-clamp-2">{category.description}</p>
                      )}
                    </div>
                    <div className="pt-4 flex items-center text-xs font-semibold text-accent gap-1">
                      Explore Services <ArrowRight size={12} />
                    </div>
                  </Card>
                </Link>
              ))}
          </div>
        )}
      </section>

      {/* Featured Services Section */}
      <section className="px-6 max-w-6xl mx-auto text-left space-y-6">
        <div className="border-b border-border pb-4">
          <h2 className="text-xl font-bold tracking-tight text-text-primary">Featured Services</h2>
          <p className="text-xs text-text-secondary mt-1">Quick-access routes for frequently accessed applications.</p>
        </div>

        {featuredServicesQuery.isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-40 w-full" />
            ))}
          </div>
        ) : services.length === 0 ? (
          <div className="text-center p-8 border border-dashed border-border rounded-lg bg-surface">
            <p className="text-sm text-text-secondary">No featured services listed.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {services.map((service) => (
              <Card key={service.id} className="flex flex-col justify-between p-5 h-full space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between items-start gap-2">
                    <span className="text-lg">{service.icon || '⚡'}</span>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-accent bg-accent/10 border border-accent/20 px-2 py-0.5 rounded-full font-mono">
                      {service.serviceMode}
                    </span>
                  </div>
                  <h3 className="font-bold text-text-primary text-sm line-clamp-1">{service.name}</h3>
                  <p className="text-xs text-text-secondary line-clamp-2">{service.description}</p>
                </div>

                <div className="pt-2 border-t border-border flex justify-between items-center text-xs">
                  <div className="font-mono text-text-secondary">
                    Total Fee: <span className="text-text-primary font-bold">₹{service.fees.total}</span>
                  </div>
                  <Link to={`/services/${service.slug}`}>
                    <Button size="sm" variant="outline">Details</Button>
                  </Link>
                </div>
              </Card>
            ))}
          </div>
        )}
      </section>

      {/* FAQ Accordion Section */}
      <section className="px-6 max-w-3xl mx-auto text-left space-y-6">
        <div className="text-center">
          <h2 className="text-xl font-bold tracking-tight text-text-primary flex items-center justify-center gap-2">
            <HelpCircle size={20} className="text-accent" /> Frequently Asked Questions
          </h2>
          <p className="text-xs text-text-secondary mt-1">Got questions? Find direct answers here.</p>
        </div>

        {faqsQuery.isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : faqs.length === 0 ? (
          <div className="text-center p-8 border border-dashed border-border rounded-lg bg-surface">
            <p className="text-sm text-text-secondary">No FAQs available.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {faqs.map((faq) => (
              <div key={faq._id} className="border border-border rounded-md bg-surface overflow-hidden">
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
