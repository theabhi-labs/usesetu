import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queueApi } from '../../services/queue.api';
import { serviceApi } from '../../services/service.api';
import type { Service } from '../../types/service.types';
import type { QueueToken, TokenPriority } from '../../types/queue.types';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Checkbox } from '../../components/ui/Checkbox';
import { Skeleton } from '../../components/ui/Skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/Dialog';
import { Users, Monitor, Play, RefreshCw, XOctagon, CheckSquare, Plus, Settings } from 'lucide-react';

export function QueueDesk() {
  const queryClient = useQueryClient();
  const [selectedServiceId, setSelectedServiceId] = useState('');
  const [operatorCounter, setOperatorCounter] = useState('Counter 1');
  const [activeToken, setActiveToken] = useState<QueueToken | null>(null);

  // New ticket modal
  const [isTicketModalOpen, setIsTicketModalOpen] = useState(false);
  const [ticketPriority, setTicketPriority] = useState<TokenPriority>('normal');

  // Config modal
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  const [dailyLimit, setDailyLimit] = useState(100);
  const [tokenPrefix, setTokenPrefix] = useState('CSC');
  const [priorityEnabled, setPriorityEnabled] = useState(true);
  const [counterList, setCounterList] = useState('Counter 1, Counter 2, Counter 3');

  // Queries
  const servicesQuery = useQuery({
    queryKey: ['adminServicesList'],
    queryFn: () => serviceApi.getAll(1, 100),
  });

  const services: Service[] = servicesQuery.data?.services || [];

  // Auto-select first service
  useEffect(() => {
    if (services.length > 0 && !selectedServiceId) {
      setSelectedServiceId(services[0]._id);
    }
  }, [services, selectedServiceId]);

  const liveQueueQuery = useQuery({
    queryKey: ['adminLiveQueue', selectedServiceId],
    queryFn: () => queueApi.getCurrent(selectedServiceId),
    enabled: !!selectedServiceId,
    refetchInterval: 10000, // 10 seconds polling
  });

  const liveQueue = liveQueueQuery.data;

  // Load config parameters when config modal opens
  const configQuery = useQuery({
    queryKey: ['queueConfig', selectedServiceId],
    queryFn: () => queueApi.getConfig(selectedServiceId),
    enabled: isConfigModalOpen && !!selectedServiceId,
  });

  useEffect(() => {
    if (configQuery.data) {
      const cfg = configQuery.data;
      setDailyLimit(cfg.dailyLimit || 100);
      setTokenPrefix(cfg.tokenPrefix || 'CSC');
      setPriorityEnabled(cfg.priorityEnabled ?? true);
      setCounterList(cfg.counters?.join(', ') || 'Counter 1, Counter 2, Counter 3');
    }
  }, [configQuery.data]);

  // Mutations
  const callNextMutation = useMutation({
    mutationFn: () => queueApi.callNext(selectedServiceId, operatorCounter),
    onSuccess: (token) => {
      setActiveToken(token);
      queryClient.invalidateQueries({ queryKey: ['adminLiveQueue', selectedServiceId] });
    },
    onError: () => {
      setActiveToken(null);
    },
  });

  const updateTokenStatusMutation = useMutation({
    mutationFn: (body: { tokenId: string; status: string }) =>
      queueApi.updateTokenStatus(body.tokenId, body.status),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['adminLiveQueue', selectedServiceId] });
      if (activeToken?._id === variables.tokenId) {
        if (variables.status === 'completed' || variables.status === 'skipped') {
          setActiveToken(null);
        } else {
          setActiveToken((prev: any) => (prev ? { ...prev, status: variables.status } : null));
        }
      }
    },
  });

  const generateTokenMutation = useMutation({
    mutationFn: (body: { service: string; priority: TokenPriority }) => queueApi.generateToken(body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminLiveQueue', selectedServiceId] });
      setIsTicketModalOpen(false);
    },
  });

  const saveConfigMutation = useMutation({
    mutationFn: (body: any) => queueApi.saveConfig(selectedServiceId, body),
    onSuccess: () => {
      setIsConfigModalOpen(false);
    },
  });

  const handleSaveConfig = (e: React.FormEvent) => {
    e.preventDefault();
    const counters = counterList.split(',').map((c) => c.trim()).filter(Boolean);
    saveConfigMutation.mutate({
      dailyLimit,
      tokenPrefix,
      priorityEnabled,
      counters,
    });
  };

  const handleGenerateTicket = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedServiceId) {
      generateTokenMutation.mutate({
        service: selectedServiceId,
        priority: ticketPriority,
      });
    }
  };

  return (
    <div className="p-6 text-left space-y-6 w-full">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 border-b border-border pb-4">
        <div>
          <h1 className="text-2xl font-bold font-sans text-text-primary">Queue Desk Console</h1>
          <p className="text-xs text-text-secondary mt-0.5 select-none">Dispense queue tickets, manage waiting lists, and call counter queues.</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Select
            value={selectedServiceId}
            onChange={(e) => {
              setSelectedServiceId(e.target.value);
              setActiveToken(null);
            }}
            className="h-9 text-xs"
          >
            {services.map((s) => (
              <option key={s._id} value={s._id}>
                {s.name}
              </option>
            ))}
          </Select>

          <Button size="sm" variant="outline" onClick={() => setIsConfigModalOpen(true)}>
            <Settings size={13} className="mr-1" /> Config Settings
          </Button>

          <Button size="sm" onClick={() => setIsTicketModalOpen(true)}>
            <Plus size={13} className="mr-1" /> Dispense Ticket
          </Button>
        </div>
      </div>

      {/* Main Workspace grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
        {/* Left 2 Cols: Counter Serving Controls */}
        <div className="md:col-span-2 space-y-6">
          <Card className="p-6 flex flex-col justify-center items-center text-center space-y-6 min-h-[300px]">
            <div className="w-full flex justify-between items-center border-b border-border pb-3 select-none text-left">
              <div>
                <span className="text-[10px] text-text-secondary uppercase font-bold tracking-wider">Serving Counter</span>
                <div className="flex gap-2 items-center mt-1">
                  <Input
                    value={operatorCounter}
                    onChange={(e) => setOperatorCounter(e.target.value)}
                    className="h-7 text-xs font-bold max-w-[120px]"
                  />
                </div>
              </div>
              <span className="text-xs font-semibold text-accent flex items-center gap-1">
                <Monitor size={14} /> ACTIVE TERMINAL
              </span>
            </div>

            {activeToken ? (
              <div className="space-y-4">
                <span className="text-[10px] text-text-secondary uppercase font-bold tracking-wider select-none">CURRENTLY SERVING</span>
                <div className="text-7xl font-extrabold font-mono text-accent select-all">
                  {activeToken.tokenNumber}
                </div>
                <div className="text-xs text-text-secondary select-none">
                  Priority: <span className="font-bold uppercase text-text-primary">{activeToken.priority}</span>
                </div>

                <div className="flex gap-2 pt-4 justify-center select-none">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      updateTokenStatusMutation.mutate({ tokenId: activeToken._id, status: 'called' })
                    }
                  >
                    <RefreshCw size={13} className="mr-1" /> Recall Ticket
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-warning/20 text-warning hover:bg-warning/5"
                    onClick={() =>
                      updateTokenStatusMutation.mutate({ tokenId: activeToken._id, status: 'skipped' })
                    }
                  >
                    <XOctagon size={13} className="mr-1" /> Skip Ticket
                  </Button>
                  <Button
                    size="sm"
                    onClick={() =>
                      updateTokenStatusMutation.mutate({ tokenId: activeToken._id, status: 'completed' })
                    }
                  >
                    <CheckSquare size={13} className="mr-1" /> Complete
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-sm text-text-secondary select-none">Ready to call waiting queue tickets.</p>
                <Button
                  size="lg"
                  onClick={() => callNextMutation.mutate()}
                  disabled={callNextMutation.isPending}
                >
                  <Play size={16} className="mr-2" /> {callNextMutation.isPending ? 'Calling...' : 'Call Next Ticket'}
                </Button>
              </div>
            )}
          </Card>
        </div>

        {/* Right 1 Col: Live Waitlist */}
        <div className="flex flex-col gap-6">
          {/* Stats card */}
          <Card className="p-4 flex items-center justify-between gap-4">
            <div className="text-left select-none">
              <span className="text-[10px] text-text-secondary uppercase font-bold tracking-wider">WAITING TICKETS</span>
              <div className="text-2xl font-extrabold font-mono text-text-primary mt-0.5">
                {liveQueueQuery.isLoading ? '...' : liveQueue?.waitingCount || 0}
              </div>
            </div>
            <Users size={28} className="text-accent" />
          </Card>

          {/* List panel */}
          <div className="flex-grow border border-border bg-surface rounded-lg p-5 flex flex-col space-y-4 text-left">
            <h3 className="text-xs font-bold text-text-secondary uppercase tracking-wider select-none">NEXT UP IN LINE</h3>

            {liveQueueQuery.isLoading ? (
              <div className="space-y-2 flex-grow">
                <Skeleton className="h-9 w-full animate-pulse" />
                <Skeleton className="h-9 w-full animate-pulse" />
              </div>
            ) : liveQueue?.nextUp && liveQueue.nextUp.length > 0 ? (
              <div className="space-y-2 flex-grow overflow-y-auto max-h-[220px]">
                {liveQueue.nextUp.map((ticket, index) => (
                  <div key={index} className="flex justify-between items-center bg-bg/40 border border-border p-2.5 rounded text-xs">
                    <span className="font-mono font-bold text-text-primary text-sm">{ticket.tokenNumber}</span>
                    <span className="text-[9px] uppercase font-bold text-text-tertiary bg-border-strong px-2 py-0.5 rounded font-mono select-none">
                      {ticket.priority}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-xs text-text-tertiary py-8 select-none">
                No tickets in waiting queue.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Ticket Dispensing Dialog */}
      <Dialog isOpen={isTicketModalOpen} onClose={() => setIsTicketModalOpen(false)}>
        <DialogContent className="max-w-sm p-6">
          <DialogHeader>
            <DialogTitle>Dispense Queue Ticket</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleGenerateTicket} className="space-y-4 pt-4 text-left">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-text-secondary select-none">Ticket Priority Level</label>
              <Select
                value={ticketPriority}
                onChange={(e) => setTicketPriority(e.target.value as TokenPriority)}
              >
                <option value="normal">Normal Ticket</option>
                <option value="senior_citizen">Senior Citizen Priority</option>
                <option value="pregnant">Pregnant / Maternity Priority</option>
                <option value="disabled">Differently Abled Priority</option>
                <option value="vip">VIP Guest Priority</option>
                <option value="emergency">Emergency Priority</option>
              </Select>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsTicketModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={generateTokenMutation.isPending}>
                {generateTokenMutation.isPending ? 'Dispensing...' : 'Print Ticket'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Config Settings Dialog */}
      <Dialog isOpen={isConfigModalOpen} onClose={() => setIsConfigModalOpen(false)}>
        <DialogContent className="max-w-md p-6">
          <DialogHeader>
            <DialogTitle>Queue Counter Settings</DialogTitle>
          </DialogHeader>
          {configQuery.isLoading ? (
            <Skeleton className="h-40 w-full animate-pulse mt-4" />
          ) : (
            <form onSubmit={handleSaveConfig} className="space-y-4 pt-4 text-left text-xs">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="font-bold text-text-secondary select-none">Daily Limits Capacity</label>
                  <Input
                    type="number"
                    value={dailyLimit}
                    onChange={(e) => setDailyLimit(Number(e.target.value))}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="font-bold text-text-secondary select-none">Ticket Prefix</label>
                  <Input
                    value={tokenPrefix}
                    onChange={(e) => setTokenPrefix(e.target.value)}
                    className="font-mono"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-text-secondary select-none">Counter list (comma separated)</label>
                <Input
                  value={counterList}
                  onChange={(e) => setCounterList(e.target.value)}
                  placeholder="e.g. Counter 1, Counter 2"
                />
              </div>

              <div className="pt-2 select-none">
                <Checkbox
                  id="priorityEnabled"
                  label="Enable Priority Ticket categorization"
                  checked={priorityEnabled}
                  onChange={(e) => setPriorityEnabled(e.target.checked)}
                />
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsConfigModalOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={saveConfigMutation.isPending}>
                  {saveConfigMutation.isPending ? 'Saving...' : 'Save Settings'}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
