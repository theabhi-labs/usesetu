import * as React from 'react';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Textarea } from '../../components/ui/Textarea';
import { Select } from '../../components/ui/Select';
import { Checkbox } from '../../components/ui/Checkbox';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Skeleton } from '../../components/ui/Skeleton';
import { StatusPill } from '../../components/ui/StatusPill';
import { Dialog } from '../../components/ui/Dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/Table';
import { useToastStore } from '../../store/toastStore';

export function KitchenSink() {
  const [isDialogOpen, setIsDialogOpen] = React.useState(false);
  const addToast = useToastStore((state) => state.addToast);

  return (
    <div className="container mx-auto p-8 space-y-12 max-w-5xl">
      <div className="border-b border-border pb-4 text-left">
        <h1 className="text-3xl font-bold tracking-tight text-text-primary">Design System Kitchen Sink</h1>
        <p className="text-text-secondary mt-1">Verify theme configuration, typography, focus indicators, and UI primitives.</p>
      </div>

      {/* Buttons */}
      <section className="space-y-4 text-left">
        <h2 className="text-xl font-semibold border-b border-border pb-2">Buttons</h2>
        <div className="flex flex-wrap gap-4 items-center">
          <Button variant="primary">Primary Button</Button>
          <Button variant="secondary">Secondary Button</Button>
          <Button variant="outline">Outline Button</Button>
          <Button variant="ghost">Ghost Button</Button>
          <Button variant="danger">Danger Button</Button>
        </div>
        <div className="flex flex-wrap gap-4 items-center">
          <Button variant="primary" size="sm">Small</Button>
          <Button variant="primary" size="md">Medium</Button>
          <Button variant="primary" size="lg">Large</Button>
        </div>
        <div className="flex flex-wrap gap-4 items-center">
          <Button variant="primary" isLoading>Loading State</Button>
          <Button variant="secondary" disabled>Disabled State</Button>
        </div>
      </section>

      {/* Badges & Status Pills */}
      <section className="space-y-4 text-left">
        <h2 className="text-xl font-semibold border-b border-border pb-2">Badges & Status Pills</h2>
        <div className="flex flex-wrap gap-4">
          <Badge>Default Badge</Badge>
          <Badge variant="accent">Accent Badge</Badge>
          <Badge variant="success">Success Badge</Badge>
          <Badge variant="warning">Warning Badge</Badge>
          <Badge variant="danger">Danger Badge</Badge>
          <Badge variant="secondary">Secondary Badge</Badge>
        </div>
        <div className="flex flex-wrap gap-4">
          <StatusPill status="draft" />
          <StatusPill status="submitted" />
          <StatusPill status="in_progress" />
          <StatusPill status="pending_payment" />
          <StatusPill status="approved" />
          <StatusPill status="rejected" />
          <StatusPill status="completed" />
          <StatusPill status="cancelled" />
        </div>
      </section>

      {/* Forms & Inputs */}
      <section className="space-y-4 text-left">
        <h2 className="text-xl font-semibold border-b border-border pb-2">Form Elements</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Input label="Email address" placeholder="Enter your email" type="email" />
          <Input label="Username (Error)" placeholder="Enter username" error="Username is already taken" />
          <Input label="Aadhaar Number (Disabled)" value="1234 5678 9012" disabled />
          <Select
            label="Service Mode"
            options={[
              { value: 'form', label: 'Online Application' },
              { value: 'queue', label: 'Walk-in Queue' },
              { value: 'appointment', label: 'Appointment Booking' },
            ]}
          />
          <Textarea label="Remarks" placeholder="Enter internal operator comments..." />
          <div className="flex flex-col gap-3 justify-center">
            <Checkbox label="Agree to Terms & Conditions" />
            <Checkbox label="Require document verification (Error)" error="You must accept this requirement" />
          </div>
        </div>
      </section>

      {/* Card & Skeletons */}
      <section className="space-y-4 text-left">
        <h2 className="text-xl font-semibold border-b border-border pb-2">Cards & Skeletons</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <h3 className="text-lg font-bold">Standard Card</h3>
            <p className="text-text-secondary text-sm mt-1">This is a card widget containing some description text.</p>
            <div className="mt-4 flex justify-end gap-2">
              <Button variant="secondary" size="sm">Cancel</Button>
              <Button size="sm">Confirm</Button>
            </div>
          </Card>
          <Card className="space-y-3">
            <Skeleton className="h-6 w-1/3" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
            <Skeleton className="h-8 w-24 mt-2" />
          </Card>
        </div>
      </section>

      {/* Table */}
      <section className="space-y-4 text-left">
        <h2 className="text-xl font-semibold border-b border-border pb-2">Tables</h2>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Application #</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Service</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell className="font-mono text-accent">CSC-2026-0001</TableCell>
              <TableCell>Abhishek Yadav</TableCell>
              <TableCell>Aadhaar Enrolment</TableCell>
              <TableCell><StatusPill status="approved" /></TableCell>
            </TableRow>
            <TableRow>
              <TableCell className="font-mono text-accent">CSC-2026-0002</TableCell>
              <TableCell>John Doe</TableCell>
              <TableCell>PAN Card Correction</TableCell>
              <TableCell><StatusPill status="in_progress" /></TableCell>
            </TableRow>
            <TableRow>
              <TableCell className="font-mono text-accent">CSC-2026-0003</TableCell>
              <TableCell>Jane Smith</TableCell>
              <TableCell>Income Certificate</TableCell>
              <TableCell><StatusPill status="pending_payment" /></TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </section>

      {/* Modal & Dialog */}
      <section className="space-y-4 text-left">
        <h2 className="text-xl font-semibold border-b border-border pb-2">Dialogs & Alerts</h2>
        <div className="flex gap-4">
          <Button variant="outline" onClick={() => setIsDialogOpen(true)}>Open Modal</Button>
          <Button variant="secondary" onClick={() => addToast('Success toast triggered!', 'success')}>Trigger Success Toast</Button>
          <Button variant="danger" onClick={() => addToast('Failed action occurred.', 'error')}>Trigger Error Toast</Button>
        </div>

        <Dialog isOpen={isDialogOpen} onClose={() => setIsDialogOpen(false)} title="Sample Form Modal">
          <div className="space-y-4">
            <p className="text-sm text-text-secondary">Please provide the details below to complete your submission.</p>
            <Input label="Full Name" placeholder="Enter name" />
            <div className="flex justify-end gap-2 mt-6">
              <Button variant="secondary" onClick={() => setIsDialogOpen(false)}>Close</Button>
              <Button onClick={() => {
                addToast('Modal action submitted successfully', 'success');
                setIsDialogOpen(false);
              }}>Submit</Button>
            </div>
          </div>
        </Dialog>
      </section>
    </div>
  );
}
