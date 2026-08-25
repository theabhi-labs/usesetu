import { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { userApi } from '../../services/user.api';
import { CustomerCard } from '../../components/common/CustomerCard';
import { requestApi } from '../../services/request.api';
import { lockerApi } from '../../services/locker.api';
import { Card } from '../../components/ui/Card';
import { Skeleton } from '../../components/ui/Skeleton';
import { Button } from '../../components/ui/Button';
import { Table, THead, TBody, TR, TH, TD } from '../../components/ui/Table';
import { StatusPill } from '../../components/ui/StatusPill';
import { ArrowLeft, User, Phone, Mail, Calendar, Info, Folder, Eye, Download } from 'lucide-react';

export function CustomerProfile() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'applications' | 'locker'>('applications');

  // Query Customer Details
  const customerQuery = useQuery({
    queryKey: ['adminCustomerDetail', id],
    queryFn: () => userApi.getById(id || ''),
    enabled: !!id,
  });

  // Query Customer's Requests History
  const requestsQuery = useQuery({
    queryKey: ['adminCustomerRequests', id],
    queryFn: () => requestApi.getAll(1, 100, { customer: id }),
    enabled: !!id,
  });

  // Query Customer's Locker Documents
  const lockerDocsQuery = useQuery({
    queryKey: ['adminCustomerLockerDocs', id],
    queryFn: () => lockerApi.getAll(id),
    enabled: !!id,
  });

  const customer = customerQuery.data;
  const requests = requestsQuery.data?.requests || [];
  const lockerDocs = lockerDocsQuery.data || [];

  if (customerQuery.isLoading) {
    return (
      <div className="p-8 max-w-5xl mx-auto space-y-6 text-left">
        <Skeleton className="h-6 w-32 animate-pulse" />
        <Skeleton className="h-[250px] w-full animate-pulse" />
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="p-16 text-center space-y-4">
        <h2 className="text-xl font-bold text-text-primary">Customer Not Found</h2>
        <Link to="/admin/customers">
          <Button size="sm">Back to Customer Directory</Button>
        </Link>
      </div>
    );
  }

  const getCustomerId = (id: string) => {
    return 'CUST-' + id.substring(18).toUpperCase();
  };

  // Filter currently active applications
  const activeApplications = requests.filter(
    (r: any) => !['completed', 'rejected', 'cancelled'].includes(r.status)
  );

  const getDocTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      aadhaar: 'Aadhaar Card',
      pan: 'PAN Card',
      photo: 'Photograph',
      signature: 'Signature Specimen',
      ration_card: 'Ration Card',
      voter_id: 'Voter ID Card',
      passport: 'Passport',
      driving_licence: 'Driving Licence',
      other: 'Other Supporting Document',
    };
    return labels[type] || type;
  };

  return (
    <div className="p-6 text-left space-y-6 max-w-5xl mx-auto">
      {/* Back link */}
      <div>
        <Link to="/admin/customers" className="flex items-center text-xs font-bold text-accent hover:underline gap-1 select-none">
          <ArrowLeft size={12} /> Back to Customer Directory
        </Link>
      </div>

      {/* Main Profile Info Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left Side: Summary Card */}
        <Card className="p-6 flex flex-col items-center text-center space-y-4 justify-center md:col-span-1">
          <div className="h-20 w-20 rounded-full bg-border-strong flex items-center justify-center font-bold text-text-primary text-2xl uppercase border border-border">
            {customer.name.substring(0, 2)}
          </div>
          <div>
            <h2 className="text-lg font-bold text-text-primary">{customer.name}</h2>
            <span className="font-mono text-xs font-bold text-accent block mt-1">{getCustomerId(customer._id)}</span>
            <span className={`inline-block mt-2 px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${
              customer.isActive ? 'bg-success/15 text-success' : 'bg-text-tertiary/15 text-text-tertiary'
            }`}>
              {customer.isActive ? 'Active Member' : 'Deactivated'}
            </span>
          </div>
        </Card>

        {/* Right Side: Quick Details Card */}
        <Card className="p-6 md:col-span-2 space-y-4 flex flex-col justify-between">
          <h3 className="text-sm font-bold text-text-primary uppercase tracking-wider select-none border-b border-border pb-2">
            Basic Information
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="flex items-center gap-2">
              <Phone size={14} className="text-text-tertiary" />
              <div>
                <span className="text-text-tertiary block font-bold uppercase text-[9px]">Mobile</span>
                <span className="font-mono font-medium text-text-primary">{customer.mobile}</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Mail size={14} className="text-text-tertiary" />
              <div>
                <span className="text-text-tertiary block font-bold uppercase text-[9px]">Email</span>
                <span className="font-medium text-text-primary">{customer.email || '—'}</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Calendar size={14} className="text-text-tertiary" />
              <div>
                <span className="text-text-tertiary block font-bold uppercase text-[9px]">Registered On</span>
                <span className="font-medium text-text-primary">{new Date(customer.createdAt).toLocaleDateString()}</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Info size={14} className="text-text-tertiary" />
              <div>
                <span className="text-text-tertiary block font-bold uppercase text-[9px]">Scope Roles</span>
                <span className="font-semibold text-text-primary uppercase">{customer.role}</span>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Customer ID Card Section */}
      <div className="flex justify-start">
        <CustomerCard customer={customer} />
      </div>

      {/* Currently Applied Active Services Section */}
      <div className="space-y-3">
        <h3 className="text-xs font-bold text-text-secondary uppercase tracking-wider select-none">Currently Applied</h3>
        {activeApplications.length === 0 ? (
          <Card className="p-6 text-center text-xs text-text-secondary">No currently active applications.</Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {activeApplications.map((app: any) => (
              <Card key={app._id} className="p-4 flex flex-col justify-between gap-3 text-left">
                <div className="space-y-0.5">
                  <span className="font-bold text-xs text-text-primary block truncate">
                    {app.service?.name || 'Service Application'}
                  </span>
                  <span className="text-[10px] text-text-tertiary block font-mono select-all">
                    {app.applicationNumber}
                  </span>
                </div>
                <div className="flex justify-between items-center pt-2 border-t border-border select-none">
                  <StatusPill status={app.status} />
                  <Link to={`/admin/requests/${app._id}`} className="text-xs text-accent font-bold hover:underline">
                    Process
                  </Link>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Tab Switcher */}
      <div className="flex border-b border-border text-xs select-none">
        <button
          onClick={() => setActiveTab('applications')}
          className={`px-4 py-2 border-b-2 font-bold cursor-pointer ${
            activeTab === 'applications' ? 'border-accent text-accent' : 'border-transparent text-text-secondary'
          }`}
        >
          Service / Application History ({requests.length})
        </button>
        <button
          onClick={() => setActiveTab('locker')}
          className={`px-4 py-2 border-b-2 font-bold cursor-pointer ${
            activeTab === 'locker' ? 'border-accent text-accent' : 'border-transparent text-text-secondary'
          }`}
        >
          Document Locker ({lockerDocs.length})
        </button>
      </div>

      {/* Tab Contents */}
      {activeTab === 'applications' ? (
        <Card className="overflow-hidden">
          {requestsQuery.isLoading ? (
            <div className="p-6 space-y-3">
              <Skeleton className="h-6 w-full animate-pulse" />
              <Skeleton className="h-12 w-full animate-pulse" />
            </div>
          ) : requests.length === 0 ? (
            <div className="p-12 text-center text-sm text-text-secondary select-none">
              No application history exists for this customer.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <THead>
                  <TR>
                    <TH>Service</TH>
                    <TH>Application Number</TH>
                    <TH>Applied Date</TH>
                    <TH>Status</TH>
                    <TH className="text-right">Action</TH>
                  </TR>
                </THead>
                <TBody>
                  {requests.map((r: any) => (
                    <TR key={r._id}>
                      <TD className="font-bold text-text-primary">{r.service?.name || 'Service'}</TD>
                      <TD className="font-mono text-xs select-all">{r.applicationNumber}</TD>
                      <TD className="text-xs text-text-secondary">{new Date(r.createdAt).toLocaleDateString()}</TD>
                      <TD><StatusPill status={r.status} /></TD>
                      <TD className="text-right select-none">
                        <Link to={`/admin/requests/${r._id}`}>
                          <Button size="sm" variant="secondary">
                            Process
                          </Button>
                        </Link>
                      </TD>
                    </TR>
                  ))}
                </TBody>
              </Table>
            </div>
          )}
        </Card>
      ) : (
        <Card className="p-6">
          {lockerDocsQuery.isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-6 w-full animate-pulse" />
              <Skeleton className="h-16 w-full animate-pulse" />
            </div>
          ) : lockerDocs.length === 0 ? (
            <div className="text-center p-6 text-xs text-text-tertiary select-none">
              <Folder className="mx-auto text-text-tertiary mb-2" size={24} />
              No locker assets uploaded by this customer.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {lockerDocs.map((doc) => (
                <div key={doc._id} className="p-4 border border-border bg-surface-elevated rounded-md flex flex-col justify-between items-stretch gap-3">
                  <div className="text-left space-y-1">
                    <span className="font-bold text-xs text-text-primary block truncate" title={doc.originalName}>
                      {doc.originalName}
                    </span>
                    <span className="text-[9px] text-accent font-bold uppercase tracking-wider block">
                      {getDocTypeLabel(doc.type)}
                    </span>
                    <span className="text-[8px] text-text-tertiary block font-mono">
                      SIZE: {(doc.size / 1024).toFixed(1)} KB • UPLOADED: {new Date(doc.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="flex gap-3 border-t border-border pt-2 select-none text-[11px] font-bold">
                    <a
                      href={doc.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-text-secondary hover:text-accent flex items-center gap-1"
                    >
                      <Eye size={12} /> View
                    </a>
                    <a
                      href={doc.url}
                      download
                      className="text-text-secondary hover:text-accent flex items-center gap-1"
                    >
                      <Download size={12} /> Download
                    </a>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
