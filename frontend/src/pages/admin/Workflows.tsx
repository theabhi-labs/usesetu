import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { workflowApi } from '../../services/workflow.api';
import { serviceApi } from '../../services/service.api';
import type { Workflow } from '../../types/workflow.types';
import type { Service } from '../../types/service.types';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Skeleton } from '../../components/ui/Skeleton';
import { Table, THead, TBody, TR, TH, TD } from '../../components/ui/Table';
import { Badge } from '../../components/ui/Badge';
import { Plus, Edit2, Play, Copy, GitBranch, Layers } from 'lucide-react';

export function Workflows() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [limit] = useState(10);

  // Queries
  const servicesQuery = useQuery({
    queryKey: ['adminServicesList'],
    queryFn: () => serviceApi.getAll(1, 100),
  });

  const workflowsQuery = useQuery({
    queryKey: ['adminWorkflowsList', page, limit],
    queryFn: () => workflowApi.getAll(page, limit),
  });

  const templatesQuery = useQuery({
    queryKey: ['adminWorkflowTemplates'],
    queryFn: workflowApi.getTemplates,
  });

  const services: Service[] = servicesQuery.data?.services || [];
  const workflows: Workflow[] = workflowsQuery.data?.workflows || [];
  const templates = templatesQuery.data || [];
  const pagination = workflowsQuery.data?.pagination || { page: 1, limit: 10, total: 0, totalPages: 1 };

  // Mutations
  const publishMutation = useMutation({
    mutationFn: (id: string) => workflowApi.publish(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminWorkflowsList'] });
    },
  });

  const duplicateMutation = useMutation({
    mutationFn: (id: string) => workflowApi.duplicate(id),
    onSuccess: (newWf) => {
      queryClient.invalidateQueries({ queryKey: ['adminWorkflowsList'] });
      navigate(`/admin/workflows/build/${newWf._id}`);
    },
  });

  return (
    <div className="p-6 text-left space-y-8 max-w-6xl mx-auto">
      <div className="flex justify-between items-center border-b border-border pb-4">
        <div>
          <h1 className="text-2xl font-bold font-sans text-text-primary">Workflows Manager</h1>
          <p className="text-xs text-text-secondary mt-0.5 select-none">Design stage milestones, requirements verification gates, and transition rules.</p>
        </div>
        <Link to="/admin/workflows/build/new">
          <Button size="sm">
            <Plus size={14} className="mr-1.5" /> New Workflow Builder
          </Button>
        </Link>
      </div>

      {workflowsQuery.isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full animate-pulse" />
          ))}
        </div>
      ) : workflows.length === 0 ? (
        <Card className="text-center p-12 border border-dashed border-border bg-surface">
          <GitBranch className="mx-auto text-text-tertiary mb-3" size={32} />
          <p className="text-sm text-text-secondary mb-4 select-none">No custom workflow paths configured.</p>
          <Link to="/admin/workflows/build/new">
            <Button size="sm">Create First Workflow</Button>
          </Link>
        </Card>
      ) : (
        <div className="overflow-x-auto">
          <Table>
            <THead>
              <TR>
                <TH>Workflow Name</TH>
                <TH>Attached Service</TH>
                <TH className="text-center">Status</TH>
                <TH className="text-center">Default Path</TH>
                <TH className="text-center">Total Stages</TH>
                <th className="text-right py-3 px-4 font-medium uppercase tracking-wider select-none text-[10px]">Actions</th>
              </TR>
            </THead>
            <TBody>
              {workflows.map((wf) => {
                const srvObj = services.find((s) => s._id === wf.service);
                return (
                  <TR key={wf._id}>
                    <TD className="font-semibold text-text-primary">{wf.name}</TD>
                    <TD className="text-text-secondary">{srvObj?.name || 'Global default'}</TD>
                    <TD className="text-center">
                      <Badge
                        variant={
                          wf.status === 'published'
                            ? 'success'
                            : wf.status === 'draft'
                            ? 'warning'
                            : 'secondary'
                        }
                      >
                        {wf.status}
                      </Badge>
                    </TD>
                    <TD className="text-center">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded select-none ${wf.isDefault ? 'bg-accent/15 text-accent' : 'bg-border-strong text-text-tertiary'}`}>
                        {wf.isDefault ? 'DEFAULT' : 'ALT'}
                      </span>
                    </TD>
                    <TD className="text-center text-xs text-text-secondary font-mono select-none">
                      {wf.stages?.length || 0} Stages
                    </TD>
                    <td className="py-3 px-4 text-right flex justify-end gap-1.5 items-center select-none">
                      {wf.status === 'draft' && (
                        <button
                          onClick={() => publishMutation.mutate(wf._id)}
                          className="p-1.5 text-text-secondary hover:text-success hover:bg-surface-elevated rounded cursor-pointer"
                          title="Publish"
                        >
                          <Play size={13} />
                        </button>
                      )}
                      <Link to={`/admin/workflows/build/${wf._id}`}>
                        <button
                          className="p-1.5 text-text-secondary hover:text-accent hover:bg-surface-elevated rounded cursor-pointer"
                          title="Edit Builder"
                        >
                          <Edit2 size={13} />
                        </button>
                      </Link>
                      <button
                        onClick={() => duplicateMutation.mutate(wf._id)}
                        className="p-1.5 text-text-secondary hover:text-accent hover:bg-surface-elevated rounded cursor-pointer"
                        title="Duplicate"
                      >
                        <Copy size={13} />
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
                Showing {workflows.length} of {pagination.total} records
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

      {/* Starter Templates */}
      <div className="border-t border-border pt-8 space-y-4">
        <div>
          <h3 className="font-bold text-text-primary text-sm flex items-center gap-1.5 select-none">
            <Layers size={16} className="text-accent" /> Start from Template
          </h3>
          <p className="text-xs text-text-secondary mt-1 select-none">Kickstart workflows configuration using preset pipeline nodes.</p>
        </div>

        {templatesQuery.isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-28 w-full animate-pulse" />
            ))}
          </div>
        ) : templates.length === 0 ? (
          <p className="text-xs text-text-tertiary select-none">No starter templates published.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {templates.map((tpl: any, idx: number) => (
              <Card key={idx} className="p-4 flex flex-col justify-between items-start gap-4">
                <div className="text-left space-y-1">
                  <span className="font-bold text-xs text-text-primary block">{tpl.name}</span>
                  <span className="text-[10px] text-text-secondary block leading-relaxed select-none">{tpl.description}</span>
                  <span className="text-[9px] font-mono text-accent block uppercase pt-2 select-none">
                    {tpl.stages?.length || 0} Default Stages Included
                  </span>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    navigate('/admin/workflows/build/new', { state: { template: tpl } });
                  }}
                >
                  Use Template
                </Button>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
