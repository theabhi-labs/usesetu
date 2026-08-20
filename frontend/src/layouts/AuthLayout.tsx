import * as React from 'react';
import { Outlet } from 'react-router-dom';

const simulatedEvents = [
  'Application CSC-2026-000391 → Approved',
  'Token AAD-042 called at Counter 2',
  'User superadmin@cscos.local logged in',
  'Webhook sent: Payment completed for CSC-2026-000388',
  'New service "Income Certificate v2" published by Admin',
  'Workflow transition: Stage changed to "Verification Pending" for CSC-2026-000395',
  'Token PMJAY-104 printed at Kiosk 1',
  'OTP sent successfully to 987654XXXX',
  'Document Aadhaar_Card.pdf verified by Staff',
  'Queue configuration "Category A" modified',
  'Appointment booked: Slot 10:30 AM for Service "Aadhaar Card Update"',
  'Refund request processed: txn_948271038103',
  'Daily snapshot job executed: 45 pending requests aggregated',
  'Notification email dispatched: "Aadhaar Enrolment Complete"',
];

export function AuthLayout() {
  const [logs, setLogs] = React.useState<string[]>([]);
  const scrollRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    // Populate some initial logs
    const initialLogs = Array.from({ length: 6 }, () => {
      const idx = Math.floor(Math.random() * simulatedEvents.length);
      const timestamp = new Date(Date.now() - Math.random() * 10000000)
        .toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      return `[${timestamp}] ${simulatedEvents[idx]}`;
    });
    setLogs(initialLogs);

    const interval = setInterval(() => {
      const idx = Math.floor(Math.random() * simulatedEvents.length);
      const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      const newLog = `[${timestamp}] ${simulatedEvents[idx]}`;
      setLogs((prev) => [...prev.slice(-15), newLog]);
    }, 2500);

    return () => clearInterval(interval);
  }, []);

  React.useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);

  return (
    <div className="min-h-screen flex bg-bg">
      {/* Left panel: Form */}
      <div className="flex-1 flex flex-col justify-center px-4 sm:px-6 lg:px-20 xl:px-24">
        <div className="mx-auto w-full max-w-md">
          {/* Logo and Name */}
          <div className="flex items-center gap-2 mb-8 justify-center lg:justify-start">
            <span className="h-8 w-8 rounded-md bg-accent flex items-center justify-center font-bold text-white select-none">C</span>
            <span className="text-xl font-bold tracking-tight text-text-primary select-none">CSC Operating System</span>
          </div>
          <Outlet />
        </div>
      </div>

      {/* Right panel: Activity ticker */}
      <div className="hidden lg:flex lg:w-1/2 bg-surface border-l border-border relative overflow-hidden flex-col justify-between p-12">
        <div className="space-y-4 text-left">
          <div className="inline-flex items-center rounded-full bg-accent/15 px-3 py-1 text-xs font-semibold text-accent border border-accent/20 select-none">
            System Live Logs
          </div>
          <h2 className="text-3xl font-extrabold tracking-tight text-text-primary">Fundamentally tracking transactions in real-time.</h2>
          <p className="text-text-secondary text-sm leading-relaxed max-w-md">
            CSC OS manages Aadhaar enrolments, digital token queues, appointment slots, and invoices, rendering codes in JetBrains Mono.
          </p>
        </div>

        {/* Live log ticker */}
        <div className="flex-1 flex flex-col justify-end mt-8">
          <div
            ref={scrollRef}
            className="h-64 border border-border bg-bg/50 rounded-lg p-4 overflow-y-auto font-mono text-xs text-text-tertiary space-y-2 scrollbar-none select-none"
          >
            {logs.map((log, index) => {
              const isApproved = log.includes('Approved') || log.includes('verified');
              return (
                <div key={index} className="transition-all duration-300 text-left">
                  <span className="text-text-tertiary"># </span>
                  <span className={isApproved ? 'text-success' : log.includes('Token') ? 'text-accent font-semibold' : 'text-text-secondary'}>
                    {log}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="pt-8 border-t border-border flex justify-between text-xs text-text-tertiary font-mono select-none">
          <span>STATUS: OPERATIONAL</span>
          <span>BUILD: v1.0.0</span>
        </div>
      </div>
    </div>
  );
}
