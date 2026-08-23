import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { serviceApi } from '../../services/service.api';
import { categoryApi } from '../../services/category.api';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Skeleton } from '../../components/ui/Skeleton';
import { ArrowLeft, Clock, FileText } from 'lucide-react';

export function CategoryPage() {
  const { slug } = useParams<{ slug: string }>();

  // Fetch all categories first to resolve category ID from slug
  const categoriesQuery = useQuery({
    queryKey: ['publicCategories'],
    queryFn: categoryApi.getPublic,
  });

  const categories = categoriesQuery.data || [];
  const currentCategory = categories.find((c) => c.slug === slug);

  const servicesQuery = useQuery({
    queryKey: ['publicServices', currentCategory?._id],
    queryFn: () => serviceApi.getPublic({ category: currentCategory?._id }),
    enabled: !!currentCategory?._id,
  });

  const services = servicesQuery.data || [];

  if (categoriesQuery.isLoading) {
    return (
      <div className="container mx-auto p-8 max-w-6xl space-y-6">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-44 w-full" />
          ))}
        </div>
      </div>
    );
  }

  if (!currentCategory) {
    return (
      <div className="container mx-auto p-16 text-center space-y-4">
        <h2 className="text-xl font-bold text-text-primary select-none">Category Not Found</h2>
        <p className="text-sm text-text-secondary select-none">The category you are looking for does not exist.</p>
        <Link to="/">
          <Button variant="secondary">Go Back Home</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-8 max-w-6xl space-y-8 text-left">
      <Link to="/" className="inline-flex items-center gap-2 text-xs text-text-secondary hover:text-text-primary select-none">
        <ArrowLeft size={14} /> Back to Home
      </Link>

      <div className="space-y-2">
        <h1 className="text-3xl font-extrabold tracking-tight text-text-primary flex items-center gap-2">
          <span style={{ color: currentCategory.themeColor || 'var(--color-accent)' }}>
            {currentCategory.icon || '📁'}
          </span>
          {currentCategory.name}
        </h1>
        {currentCategory.description && (
          <p className="text-sm text-text-secondary max-w-2xl select-none">{currentCategory.description}</p>
        )}
      </div>

      {servicesQuery.isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-44 w-full" />
          ))}
        </div>
      ) : services.length === 0 ? (
        <div className="text-center p-12 border border-dashed border-border rounded-lg bg-surface">
          <p className="text-sm text-text-secondary mb-4 select-none">No services available under this category yet.</p>
          <Link to="/">
            <Button variant="outline">Browse Other Categories</Button>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
          {services.map((service) => (
            <Card key={service.id} className="flex flex-col justify-between p-5 h-full space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between items-start gap-2">
                  <span className="text-lg">{service.icon || '⚡'}</span>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-accent bg-accent/10 border border-accent/20 px-2 py-0.5 rounded-full font-mono">
                    {service.serviceMode}
                  </span>
                </div>
                <h3 className="font-bold text-text-primary text-base line-clamp-1">{service.name}</h3>
                <p className="text-xs text-text-secondary line-clamp-2">{service.description}</p>
              </div>

              <div className="space-y-3 pt-2 border-t border-border">
                <div className="flex justify-between items-center text-xs text-text-secondary select-none">
                  <span className="flex items-center gap-1"><Clock size={12} /> {service.estimatedTime.value} {service.estimatedTime.unit}</span>
                  <span className="flex items-center gap-1"><FileText size={12} /> {service.requiredDocuments.length} Documents</span>
                </div>
                <div className="flex justify-between items-center pt-2 text-xs">
                  <div className="font-mono text-text-secondary select-none">
                    Fee: <span className="text-text-primary font-bold">₹{service.fees.total}</span>
                  </div>
                  <Link to={`/services/${service.slug}`}>
                    <Button size="sm" variant="outline">Apply / View</Button>
                  </Link>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
