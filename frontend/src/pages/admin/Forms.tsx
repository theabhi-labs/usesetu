import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { formApi } from '../../services/form.api';
import { serviceApi } from '../../services/service.api';
import type { Form } from '../../types/form.types';
import type { Service } from '../../types/service.types';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Skeleton } from '../../components/ui/Skeleton';
import { Table, THead, TBody, TR, TH, TD } from '../../components/ui/Table';
import { Badge } from '../../components/ui/Badge';
import { Plus, Edit2, Play, Copy, ListCollapse, Trash2 } from 'lucide-react';

export function Forms() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const location = useLocation();
  const [page, setPage] = useState(1);
  const [limit] = useState(10);

  // Queries
  const servicesQuery = useQuery({
    queryKey: ['adminServicesList'],
    queryFn: () => serviceApi.getAll(1, 100),
  });

  const formsQuery = useQuery({
    queryKey: ['adminFormsList', page, limit],
    queryFn: () => formApi.getAll(page, limit),
  });

  const services: Service[] = servicesQuery.data?.services || [];
  const forms: Form[] = formsQuery.data?.forms || [];
  const pagination = formsQuery.data?.pagination || { page: 1, limit: 10, total: 0, totalPages: 1 };

  // Mutations
  const publishMutation = useMutation({
    mutationFn: (id: string) => formApi.publish(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminFormsList'] });
    },
  });

  const cloneMutation = useMutation({
    mutationFn: (id: string) => formApi.clone(id),
    onSuccess: (newForm) => {
      queryClient.invalidateQueries({ queryKey: ['adminFormsList'] });
      navigate(location.search ? `/admin/forms/build/${newForm._id}${location.search}` : `/admin/forms/build/${newForm._id}`);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => formApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminFormsList'] });
    },
  });

  const newFormUrl = location.search ? `/admin/forms/build/new${location.search}` : '/admin/forms/build/new';

  return (
    <div className="p-6 text-left space-y-6 max-w-6xl mx-auto">
      <div className="flex justify-between items-center border-b border-border pb-4">
        <div>
          <h1 className="text-2xl font-bold font-sans text-text-primary">Forms Manager</h1>
          <p className="text-xs text-text-secondary mt-0.5 select-none">Design dynamic layout fields, validation schema rules, and versioning.</p>
        </div>
        <Link to={newFormUrl}>
          <Button size="sm">
            <Plus size={14} className="mr-1.5" /> New Form Canvas
          </Button>
        </Link>
      </div>

      {formsQuery.isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full animate-pulse" />
          ))}
        </div>
      ) : forms.length === 0 ? (
        <Card className="text-center p-12 border border-dashed border-border bg-surface">
          <ListCollapse className="mx-auto text-text-tertiary mb-3" size={32} />
          <p className="text-sm text-text-secondary mb-4 select-none">No custom form schemas configured.</p>
          <Link to={newFormUrl}>
            <Button size="sm">Create First Form</Button>
          </Link>
        </Card>
      ) : (
        <div className="overflow-x-auto">
          <Table>
            <THead>
              <TR>
                <TH>Form Title</TH>
                <TH>Attached Service</TH>
                <TH className="text-center">Version</TH>
                <TH className="text-center">Status</TH>
                <TH className="text-center">Sections / Fields</TH>
                <th className="text-right py-3 px-4 font-medium uppercase tracking-wider select-none text-[10px]">Actions</th>
              </TR>
            </THead>
            <TBody>
              {forms.map((form) => {
                const srvObj = services.find((s) => s._id === form.service);
                const editUrl = location.search ? `/admin/forms/build/${form._id}${location.search}` : `/admin/forms/build/${form._id}`;
                return (
                  <TR key={form._id}>
                    <TD className="font-semibold text-text-primary">{form.title}</TD>
                    <TD className="text-text-secondary">{srvObj?.name || 'Unassigned Service'}</TD>
                    <TD className="text-center font-mono font-bold text-text-primary">v{form.version}</TD>
                    <TD className="text-center">
                      <Badge
                        variant={
                          form.status === 'published'
                            ? 'success'
                            : form.status === 'draft'
                            ? 'warning'
                            : 'secondary'
                        }
                      >
                        {form.status}
                      </Badge>
                    </TD>
                    <TD className="text-center text-xs text-text-secondary">
                      {form.sections?.length || 0} Sec / {form.fields?.length || 0} Fld
                    </TD>
                    <td className="py-3 px-4 text-right flex justify-end gap-1.5 items-center select-none">
                      {form.status === 'draft' && (
                        <button
                          onClick={() => publishMutation.mutate(form._id)}
                          className="p-1.5 text-text-secondary hover:text-success hover:bg-surface-elevated rounded cursor-pointer"
                          title="Publish"
                        >
                          <Play size={13} />
                        </button>
                      )}
                      <Link to={editUrl}>
                        <button
                          className="p-1.5 text-text-secondary hover:text-accent hover:bg-surface-elevated rounded cursor-pointer"
                          title="Edit Builder"
                        >
                          <Edit2 size={13} />
                        </button>
                      </Link>
                      <button
                        onClick={() => cloneMutation.mutate(form._id)}
                        className="p-1.5 text-text-secondary hover:text-accent hover:bg-surface-elevated rounded cursor-pointer"
                        title="Clone Version"
                      >
                        <Copy size={13} />
                      </button>
                      <button
                        onClick={() => {
                          if (window.confirm('Are you sure you want to archive/delete this form? Existing submissions will not be affected.')) {
                            deleteMutation.mutate(form._id);
                          }
                        }}
                        className="p-1.5 text-text-secondary hover:text-error hover:bg-surface-elevated rounded cursor-pointer"
                        title="Delete Form"
                      >
                        <Trash2 size={13} />
                      </button>
                    </td>
                  </TR>
                );
              })}
            </TBody>
          </Table>

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="flex justify-between items-center pt-4 select-none">
              <span className="text-xs text-text-secondary">
                Showing {forms.length} of {pagination.total} records
              </span>
              <div className="flex gap-2">
                <Button size="sm" variant="secondary" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>
                  Prev
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={page === pagination.totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
