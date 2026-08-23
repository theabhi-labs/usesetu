import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { cmsApi } from '../../services/cms.api';
import { Button } from '../../components/ui/Button';
import { Skeleton } from '../../components/ui/Skeleton';
import { ArrowLeft } from 'lucide-react';

export function DynamicPage() {
  const { slug } = useParams<{ slug: string }>();

  const pageQuery = useQuery({
    queryKey: ['publicPage', slug],
    queryFn: () => cmsApi.getPublicPage(slug || ''),
    enabled: !!slug,
  });

  const page = pageQuery.data;

  if (pageQuery.isLoading) {
    return (
      <div className="container mx-auto p-8 max-w-4xl space-y-6">
        <Skeleton className="h-10 w-2/3 animate-pulse" />
        <div className="space-y-3 pt-6">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
        </div>
      </div>
    );
  }

  if (!page || page.status !== 'published') {
    return (
      <div className="container mx-auto p-16 text-center space-y-4">
        <h2 className="text-xl font-bold text-text-primary select-none">Page Not Found</h2>
        <p className="text-sm text-text-secondary select-none">The page you are looking for does not exist or has been archived.</p>
        <Link to="/">
          <Button variant="secondary">Go Back Home</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-8 max-w-4xl space-y-6 text-left">
      <Link to="/" className="inline-flex items-center gap-2 text-xs text-text-secondary hover:text-text-primary select-none">
        <ArrowLeft size={14} /> Back to Home
      </Link>

      <article className="max-w-none space-y-4">
        <h1 className="text-3xl font-extrabold tracking-tight text-text-primary border-b border-border pb-4">
          {page.title}
        </h1>
        {/* Render dynamic content */}
        <div
          className="text-text-secondary text-sm leading-relaxed space-y-4 pt-4"
          dangerouslySetInnerHTML={{ __html: page.content }}
        />
      </article>
    </div>
  );
}
