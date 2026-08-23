import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { requestApi } from '../../services/request.api';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Skeleton } from '../../components/ui/Skeleton';
import { StatusPill } from '../../components/ui/StatusPill';
import { ArrowLeft, Search, Calendar } from 'lucide-react';

export function TrackApplication() {
  const { applicationNumber } = useParams<{ applicationNumber: string }>();
  const navigate = useNavigate();
  const [searchVal, setSearchVal] = useState(applicationNumber || '');

  const trackQuery = useQuery({
    queryKey: ['trackApplication', applicationNumber],
    queryFn: () => requestApi.trackPublic(applicationNumber || ''),
    enabled: !!applicationNumber,
    retry: false,
  });

  const request = trackQuery.data;

  useEffect(() => {
    if (applicationNumber) {
      setSearchVal(applicationNumber);
    }
  }, [applicationNumber]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchVal.trim()) {
      navigate(`/track/${encodeURIComponent(searchVal.trim())}`);
    }
  };

  return (
    <div className="container mx-auto p-8 max-w-3xl space-y-8 text-left">
      <Link to="/" className="inline-flex items-center gap-2 text-xs text-text-secondary hover:text-text-primary select-none">
        <ArrowLeft size={14} /> Back to Home
      </Link>

      <div className="space-y-3">
        <h1 className="text-3xl font-extrabold tracking-tight text-text-primary">Track Application</h1>
        <p className="text-sm text-text-secondary">Enter your application reference code to track processing milestones.</p>
      </div>

      <form onSubmit={handleSearch} className="flex gap-2 items-end">
        <div className="flex-grow">
          <Input
            placeholder="e.g. CSC-2026-000391"
            value={searchVal}
            onChange={(e) => setSearchVal(e.target.value)}
            className="font-mono"
          />
        </div>
        <Button type="submit" className="h-10">
          <Search size={16} className="mr-2" /> Track
        </Button>
      </form>

      {trackQuery.isLoading && (
        <Card className="space-y-4">
          <Skeleton className="h-6 w-1/3 animate-pulse" />
          <Skeleton className="h-4 w-full animate-pulse" />
          <Skeleton className="h-12 w-full animate-pulse" />
        </Card>
      )}

      {trackQuery.isError && (
        <Card className="border-error/20 bg-error/5 text-center p-8 space-y-2">
          <h3 className="text-lg font-bold text-text-primary select-none">Application Not Found</h3>
          <p className="text-sm text-text-secondary max-w-sm mx-auto select-none">
            We couldn't find an application matching <code className="font-mono text-text-primary bg-surface px-1.5 py-0.5 rounded">{applicationNumber}</code>. Please verify the code and try again.
          </p>
        </Card>
      )}

      {trackQuery.isSuccess && request && (
        <Card className="space-y-6">
          {/* Header summary */}
          <div className="border-b border-border pb-4 flex flex-col sm:flex-row justify-between sm:items-center gap-2">
            <div>
              <span className="text-[10px] text-text-tertiary font-mono select-none">APPLICATION NUMBER</span>
              <h2 className="text-lg font-bold font-mono text-accent">{request.applicationNumber}</h2>
            </div>
            <div className="flex items-center gap-4">
              <div>
                <span className="text-[10px] text-text-tertiary block text-right select-none">STATUS</span>
                <StatusPill status={request.status} />
              </div>
            </div>
          </div>

          {/* Details summary */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <div className="space-y-1">
              <span className="text-xs text-text-secondary block select-none">Service Applied For</span>
              <span className="font-semibold text-text-primary">{request.serviceName || 'Service Application'}</span>
            </div>
            <div className="space-y-1">
              <span className="text-xs text-text-secondary block select-none">Applied On</span>
              <span className="font-semibold text-text-primary flex items-center gap-1.5">
                <Calendar size={14} className="text-text-tertiary" />
                {new Date(request.appliedOn || request.createdAt).toLocaleDateString(undefined, {
                  dateStyle: 'medium',
                })}
              </span>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex justify-between items-center text-xs select-none">
              <span className="text-text-secondary font-medium">Processing Milestones</span>
              <span className="text-accent font-bold font-mono">{request.completionPercentage || 0}% Complete</span>
            </div>
            <div className="h-2 w-full bg-border-strong rounded-full overflow-hidden">
              <div
                className="h-full bg-accent rounded-full transition-all duration-500"
                style={{ width: `${request.completionPercentage || 0}%` }}
              />
            </div>
          </div>

          {/* Timeline Logs */}
          <div className="space-y-4 pt-4 border-t border-border">
            <h3 className="text-sm font-bold text-text-primary select-none">Timeline Logs</h3>
            {request.timeline && request.timeline.length > 0 ? (
              <div className="relative border-l border-border pl-6 space-y-6">
                {request.timeline.map((log: any, index: number) => {
                  const isLast = index === request.timeline.length - 1;
                  return (
                    <div key={index} className="relative">
                      {/* Timeline Node Icon */}
                      <span className="absolute -left-[31px] top-0 h-4 w-4 rounded-full border border-bg bg-surface flex items-center justify-center">
                        <span className={`h-2 w-2 rounded-full ${isLast ? 'bg-accent animate-ping' : 'bg-text-secondary'}`} />
                      </span>
                      <div className="space-y-1">
                        <div className="flex justify-between items-baseline gap-2">
                          <h4 className="text-sm font-semibold text-text-primary">{log.title || log.stageName}</h4>
                          <span className="text-[10px] font-mono text-text-tertiary">
                            {new Date(log.timestamp || log.createdAt).toLocaleDateString(undefined, {
                              dateStyle: 'short',
                            })}{' '}
                            {new Date(log.timestamp || log.createdAt).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>
                        {log.remark && <p className="text-xs text-text-secondary">{log.remark}</p>}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center text-xs text-text-secondary p-4 select-none">
                No logs recorded yet.
              </div>
            )}
          </div>
        </Card>
      )}
    </div>
  );
}
