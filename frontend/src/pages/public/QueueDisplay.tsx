import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { serviceApi } from '../../services/service.api';
import { queueApi } from '../../services/queue.api';
import { Card } from '../../components/ui/Card';
import { Skeleton } from '../../components/ui/Skeleton';
import { Button } from '../../components/ui/Button';
import { ArrowLeft, Users, Monitor, Clock } from 'lucide-react';

export function QueueDisplay() {
  const { serviceSlug } = useParams<{ serviceSlug: string }>();
  const [time, setTime] = useState(new Date());

  // Clock ticks
  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch featured/public services to resolve ID
  const servicesQuery = useQuery({
    queryKey: ['publicServices'],
    queryFn: () => serviceApi.getPublic(),
  });

  const services = servicesQuery.data || [];
  const currentService = services.find((s) => s.slug === serviceSlug);

  // Poll queue current status every 5 seconds
  const queueQuery = useQuery({
    queryKey: ['liveQueue', currentService?.id],
    queryFn: () => queueApi.getCurrent(currentService?.id || ''),
    enabled: !!currentService?.id,
    refetchInterval: 5000,
  });

  const queue = queueQuery.data;

  if (servicesQuery.isLoading) {
    return (
      <div className="min-h-screen bg-bg flex flex-col items-center justify-center p-8">
        <Skeleton className="h-12 w-64 animate-pulse" />
        <Skeleton className="h-[300px] w-full max-w-4xl mt-6 animate-pulse" />
      </div>
    );
  }

  if (!currentService) {
    return (
      <div className="min-h-screen bg-bg flex flex-col items-center justify-center p-8 text-center space-y-4">
        <h1 className="text-2xl font-bold text-text-primary select-none">Service Queue Display Not Found</h1>
        <p className="text-sm text-text-secondary select-none">The service you specified does not support queuing or does not exist.</p>
        <Link to="/">
          <Button variant="secondary">Back to Home</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg text-text-primary p-6 md:p-10 flex flex-col justify-between">
      {/* Header */}
      <header className="flex flex-col sm:flex-row justify-between items-center border-b border-border pb-4 gap-4 text-left">
        <div className="flex items-center gap-4">
          <Link to="/" className="text-text-secondary hover:text-text-primary select-none">
            <ArrowLeft size={20} />
          </Link>
          <div>
            <h1 className="text-xl md:text-2xl font-bold font-sans tracking-tight">{currentService.name}</h1>
            <p className="text-[10px] text-text-secondary font-mono tracking-wider mt-1 select-none">LIVE COUNTER DISPENSARY DISPLAY</p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs font-semibold text-accent bg-accent/10 border border-accent/20 px-3 py-1.5 rounded-full select-none font-mono">
          <Monitor size={14} /> LOBBY TV FEED ACTIVE
        </div>
      </header>

      {/* Main Grid */}
      <main className="flex-grow grid grid-cols-1 lg:grid-cols-3 gap-6 my-6 items-stretch">
        {/* Left 2 Cols: Now Serving */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          <div className="flex-grow border border-border bg-surface rounded-lg p-8 flex flex-col justify-center items-center text-center space-y-6 min-h-[360px]">
            <h2 className="text-lg font-bold tracking-wider text-text-secondary uppercase select-none">NOW SERVING</h2>

            {queueQuery.isLoading ? (
              <Skeleton className="h-32 w-64 animate-pulse" />
            ) : queue?.nowServing && queue.nowServing.length > 0 ? (
              <div className="space-y-4 w-full">
                {queue.nowServing.map((item, index) => (
                  <div key={index} className="flex flex-col items-center">
                    <div className="text-8xl font-extrabold font-mono text-accent tracking-tighter select-all">
                      {item.tokenNumber}
                    </div>
                    {item.counter && (
                      <div className="text-2xl font-bold text-success mt-2 uppercase tracking-wide select-none">
                        Proceed to Counter {item.counter}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-4xl font-extrabold text-text-tertiary select-none">
                NO ACTIVE TOKEN
              </div>
            )}
          </div>
        </div>

        {/* Right 1 Col: Waiting & Next Up */}
        <div className="flex flex-col gap-6 justify-between">
          {/* Waiting Count Card */}
          <Card className="p-6 flex flex-col justify-center items-center text-center space-y-2">
            <Users size={32} className="text-accent" />
            <span className="text-xs font-medium text-text-secondary select-none">WAITING CUSTOMERS</span>
            <div className="text-4xl font-extrabold font-mono text-text-primary">
              {queueQuery.isLoading ? '...' : queue?.waitingCount || 0}
            </div>
          </Card>

          {/* Next Up Card */}
          <div className="flex-grow border border-border bg-surface rounded-lg p-6 flex flex-col space-y-4 text-left">
            <h3 className="text-sm font-bold text-text-secondary uppercase tracking-wider select-none">NEXT UP</h3>

            {queueQuery.isLoading ? (
              <div className="space-y-2 flex-grow">
                <Skeleton className="h-10 w-full animate-pulse" />
                <Skeleton className="h-10 w-full animate-pulse" />
              </div>
            ) : queue?.nextUp && queue.nextUp.length > 0 ? (
              <div className="space-y-2 flex-grow overflow-y-auto max-h-[220px]">
                {queue.nextUp.map((item, idx) => (
                  <div key={idx} className="flex justify-between items-center bg-bg/50 border border-border p-3 rounded-md">
                    <span className="font-mono font-bold text-text-primary text-base">{item.tokenNumber}</span>
                    <span className="text-[10px] uppercase font-bold text-text-tertiary bg-border-strong px-2 py-0.5 rounded font-mono select-none">
                      {item.priority}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-xs text-text-tertiary py-6 select-none">
                No tickets in waiting queue.
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Footer Info */}
      <footer className="border-t border-border pt-4 flex flex-col sm:flex-row justify-between items-center text-xs text-text-tertiary font-mono select-none">
        <div className="flex items-center gap-1"><Clock size={12} /> EST WAIT TIME: {queueQuery.isLoading ? '...' : `${queue?.estimatedWaitMinutes || 0} min`}</div>
        <div>TIME: {time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</div>
      </footer>
    </div>
  );
}
