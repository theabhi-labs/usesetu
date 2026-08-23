import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { appointmentApi } from '../../services/appointment.api';
import { serviceApi } from '../../services/service.api';
import type { Service } from '../../types/service.types';
import type { Appointment } from '../../types/appointment.types';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Checkbox } from '../../components/ui/Checkbox';
import { Skeleton } from '../../components/ui/Skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/Dialog';
import { Calendar, Clock, Edit2, Play, CheckCircle, Ban, AlertTriangle } from 'lucide-react';

export function Appointments() {
  const queryClient = useQueryClient();
  const [selectedServiceId, setSelectedServiceId] = useState('');
  const [filterDate, setFilterDate] = useState(new Date().toISOString().split('T')[0]);
  const [filterStatus, setFilterStatus] = useState('');

  // Config modal settings
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  const [slotDurationMinutes, setSlotDurationMinutes] = useState(30);
  const [bufferMinutes, setBufferMinutes] = useState(5);
  const [maxBookingsPerSlot, setMaxBookingsPerSlot] = useState(1);
  const [bookingWindowDays, setBookingWindowDays] = useState(30);
  const [cutOffHours, setCutOffHours] = useState(2);

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

  const appointmentsQuery = useQuery({
    queryKey: ['adminAppointments', selectedServiceId, filterDate, filterStatus],
    queryFn: () =>
      appointmentApi.getAll(1, 100, {
        service: selectedServiceId,
        date: filterDate,
        status: filterStatus,
      }),
    enabled: !!selectedServiceId,
  });

  const appointments: Appointment[] = appointmentsQuery.data?.appointments || [];

  // Load config parameters when config modal opens
  const configQuery = useQuery({
    queryKey: ['appointmentConfig', selectedServiceId],
    queryFn: () => appointmentApi.getSettings(selectedServiceId),
    enabled: isConfigModalOpen && !!selectedServiceId,
  });

  useEffect(() => {
    if (configQuery.data) {
      const cfg = configQuery.data;
      setSlotDurationMinutes(cfg.slotDurationMinutes || 30);
      setBufferMinutes(cfg.bufferMinutes || 5);
      setMaxBookingsPerSlot(cfg.maxBookingsPerSlot || 1);
      setBookingWindowDays(cfg.bookingWindowDays || 30);
      setCutOffHours(cfg.cutOffHours || 2);
    }
  }, [configQuery.data]);

  // Mutations
  const updateStatusMutation = useMutation({
    mutationFn: (body: { id: string; status: string }) =>
      appointmentApi.updateStatus(body.id, body.status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminAppointments', selectedServiceId] });
    },
  });

  const saveSettingsMutation = useMutation({
    mutationFn: (body: any) => appointmentApi.saveSettings(selectedServiceId, body),
    onSuccess: () => {
      setIsConfigModalOpen(false);
    },
  });

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    saveSettingsMutation.mutate({
      slotDurationMinutes,
      bufferMinutes,
      maxBookingsPerSlot,
      bookingWindowDays,
      cutOffHours,
    });
  };

  return (
    <div className="p-6 text-left space-y-6 max-w-5xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 border-b border-border pb-4">
        <div>
          <h1 className="text-2xl font-bold font-sans text-text-primary">Appointments Schedule</h1>
          <p className="text-xs text-text-secondary mt-0.5 select-none">Review calendar bookings and configure slots constraints.</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Select
            value={selectedServiceId}
            onChange={(e) => setSelectedServiceId(e.target.value)}
            className="h-9 text-xs"
          >
            {services.map((s) => (
              <option key={s._id} value={s._id}>
                {s.name}
              </option>
            ))}
          </Select>

          <Button size="sm" variant="outline" onClick={() => setIsConfigModalOpen(true)}>
            Slot Configuration
          </Button>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
        <div className="space-y-1">
          <label className="text-[10px] text-text-secondary font-bold uppercase select-none">Target Date</label>
          <Input
            type="date"
            value={filterDate}
            onChange={(e) => setFilterDate(e.target.value)}
            className="h-9 text-xs"
          />
        </div>
        <div className="space-y-1">
          <label className="text-[10px] text-text-secondary font-bold uppercase select-none">Status</label>
          <Select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="h-9 text-xs">
            <option value="">All Bookings</option>
            <option value="scheduled">Scheduled</option>
            <option value="confirmed">Confirmed</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
            <option value="no_show">No Show</option>
          </Select>
        </div>
      </div>

      {/* Main listings */}
      {appointmentsQuery.isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full animate-pulse" />
          ))}
        </div>
      ) : appointments.length === 0 ? (
        <Card className="text-center p-12 border border-dashed border-border bg-surface select-none">
          <Calendar className="mx-auto text-text-tertiary mb-3" size={32} />
          <p className="text-sm text-text-secondary">No appointments booked for this date.</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {appointments.map((app) => (
            <Card key={app._id} className="p-5 flex flex-col justify-between gap-4 text-left">
              <div className="space-y-2">
                <div className="flex justify-between items-start gap-2">
                  <div className="flex items-center gap-1.5 font-mono text-accent text-xs font-bold">
                    <Clock size={12} /> {app.slotStart} - {app.slotEnd}
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-text-secondary bg-border-strong px-2 py-0.5 rounded font-mono">
                    {app.status}
                  </span>
                </div>
                <div>
                  <span className="font-bold text-sm text-text-primary block">{app.customer || 'Customer'}</span>
                  {app.remarks && <p className="text-xs text-text-secondary leading-relaxed mt-1">"{app.remarks}"</p>}
                </div>
              </div>

              {/* Status Update Options */}
              <div className="flex gap-1.5 justify-end border-t border-border pt-3 select-none">
                {app.status === 'scheduled' && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => updateStatusMutation.mutate({ id: app._id, status: 'confirmed' })}
                  >
                    Confirm
                  </Button>
                )}
                {app.status === 'confirmed' && (
                  <Button
                    size="sm"
                    onClick={() => updateStatusMutation.mutate({ id: app._id, status: 'in_progress' })}
                  >
                    Start
                  </Button>
                )}
                {app.status === 'in_progress' && (
                  <Button
                    size="sm"
                    className="bg-success text-white hover:bg-success/85"
                    onClick={() => updateStatusMutation.mutate({ id: app._id, status: 'completed' })}
                  >
                    Complete
                  </Button>
                )}
                {['scheduled', 'confirmed'].includes(app.status) && (
                  <>
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-error/20 text-error hover:bg-error/5"
                      onClick={() => updateStatusMutation.mutate({ id: app._id, status: 'cancelled' })}
                    >
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-warning/20 text-warning hover:bg-warning/5"
                      onClick={() => updateStatusMutation.mutate({ id: app._id, status: 'no_show' })}
                    >
                      No Show
                    </Button>
                  </>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Config Settings Dialog */}
      <Dialog isOpen={isConfigModalOpen} onClose={() => setIsConfigModalOpen(false)}>
        <DialogContent className="max-w-md p-6">
          <DialogHeader>
            <DialogTitle>Slot Boundaries Configuration</DialogTitle>
          </DialogHeader>
          {configQuery.isLoading ? (
            <Skeleton className="h-40 w-full animate-pulse mt-4" />
          ) : (
            <form onSubmit={handleSaveSettings} className="space-y-4 pt-4 text-left text-xs">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="font-bold text-text-secondary select-none">Slot Duration (min)</label>
                  <Input
                    type="number"
                    value={slotDurationMinutes}
                    onChange={(e) => setSlotDurationMinutes(Number(e.target.value))}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="font-bold text-text-secondary select-none">Buffer Interval (min)</label>
                  <Input
                    type="number"
                    value={bufferMinutes}
                    onChange={(e) => setBufferMinutes(Number(e.target.value))}
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <label className="font-bold text-text-secondary select-none">Cap bookings per slot</label>
                  <Input
                    type="number"
                    value={maxBookingsPerSlot}
                    onChange={(e) => setMaxBookingsPerSlot(Number(e.target.value))}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="font-bold text-text-secondary select-none">Booking Window (days)</label>
                  <Input
                    type="number"
                    value={bookingWindowDays}
                    onChange={(e) => setBookingWindowDays(Number(e.target.value))}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="font-bold text-text-secondary select-none">Cut-off window (hours)</label>
                  <Input
                    type="number"
                    value={cutOffHours}
                    onChange={(e) => setCutOffHours(Number(e.target.value))}
                  />
                </div>
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsConfigModalOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={saveSettingsMutation.isPending}>
                  {saveSettingsMutation.isPending ? 'Saving...' : 'Save Settings'}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
