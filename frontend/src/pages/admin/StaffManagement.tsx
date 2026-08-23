import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { userApi, type UserDetail } from '../../services/user.api';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Skeleton } from '../../components/ui/Skeleton';
import { Table, THead, TBody, TR, TH, TD } from '../../components/ui/Table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/Dialog';
import { Plus, Edit2, Trash2, Search } from 'lucide-react';

export function StaffManagement() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [filterRole, setFilterRole] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  // Delete modal state
  const [userToDelete, setUserToDelete] = useState<UserDetail | null>(null);
  const [deleteError, setDeleteError] = useState('');

  // Debounce search input
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 400);
    return () => clearTimeout(handler);
  }, [search]);

  // Queries
  const usersQuery = useQuery({
    queryKey: ['adminUsers', page, limit, debouncedSearch, filterRole, filterStatus],
    queryFn: () =>
      userApi.getAll(page, limit, debouncedSearch, filterRole, filterStatus),
  });

  const users: UserDetail[] = usersQuery.data?.users || [];
  const pagination = usersQuery.data?.pagination || { page: 1, limit: 10, total: 0, pages: 1 };

  // Mutations
  const deleteMutation = useMutation({
    mutationFn: (id: string) => userApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminUsers'] });
      setUserToDelete(null);
      setDeleteError('');
    },
    onError: (err: any) => {
      setDeleteError(err?.response?.data?.message || 'Failed to delete staff user.');
    },
  });

  const handleDelete = () => {
    if (userToDelete) {
      deleteMutation.mutate(userToDelete._id);
    }
  };

  return (
    <div className="p-6 text-left space-y-6 max-w-6xl mx-auto">
      {/* Page Header */}
      <div className="flex justify-between items-center select-none border-b border-border pb-4">
        <div>
          <h1 className="text-xl font-bold font-sans text-text-primary">Staff Management</h1>
          <p className="text-xs text-text-secondary mt-0.5">Add, edit, or deactivate system staff members and operations credentials.</p>
        </div>
        <Link to="/admin/staff/new">
          <Button size="sm">
            <Plus size={14} className="mr-1.5" /> Add Staff
          </Button>
        </Link>
      </div>

      {/* Filters Card */}
      <Card className="p-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-3.5 text-text-tertiary" />
          <Input
            placeholder="Search name, email, or mobile..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-10"
          />
        </div>

        <Select value={filterRole} onChange={(e) => { setFilterRole(e.target.value); setPage(1); }} className="h-10">
          <option value="">All Roles</option>
          <option value="staff">Staff</option>
          <option value="admin">Admin</option>
        </Select>

        <Select value={filterStatus} onChange={(e) => { setFilterStatus(e.target.value); setPage(1); }} className="h-10">
          <option value="">All Statuses</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </Select>
      </Card>

      {/* Directory Table */}
      <Card className="overflow-hidden">
        {usersQuery.isLoading ? (
          <div className="p-6 space-y-3">
            <Skeleton className="h-8 w-full animate-pulse" />
            <Skeleton className="h-20 w-full animate-pulse" />
          </div>
        ) : users.length === 0 ? (
          <div className="p-12 text-center text-sm text-text-secondary select-none">
            No staff members found matching the active filters.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <THead>
                <TR>
                  <TH>Name</TH>
                  <TH>Email</TH>
                  <TH>Mobile</TH>
                  <TH>Role</TH>
                  <TH>Status</TH>
                  <TH>Created On</TH>
                  <TH className="text-right">Actions</TH>
                </TR>
              </THead>
              <TBody>
                {users.map((u) => (
                  <TR key={u._id}>
                    <TD className="font-bold text-text-primary">{u.name}</TD>
                    <TD>{u.email}</TD>
                    <TD className="font-mono text-xs">{u.mobile}</TD>
                    <TD>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                        u.role === 'admin' ? 'bg-error/10 text-error' : 'bg-accent/10 text-accent'
                      }`}>
                        {u.role}
                      </span>
                    </TD>
                    <TD>
                      <span className={`h-2 w-2 rounded-full inline-block mr-1.5 ${
                        u.isActive ? 'bg-success' : 'bg-text-tertiary'
                      }`} />
                      <span className={`text-xs font-semibold ${u.isActive ? 'text-success' : 'text-text-tertiary'}`}>
                        {u.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </TD>
                    <TD className="text-xs text-text-secondary">{new Date(u.createdAt).toLocaleDateString()}</TD>
                    <TD className="text-right">
                      <div className="flex justify-end gap-1.5">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => navigate(`/admin/staff/edit/${u._id}`)}
                          title="Edit staff details"
                          className="h-8 w-8 p-0"
                        >
                          <Edit2 size={12} />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setUserToDelete(u)}
                          title="Delete staff account"
                          className="h-8 w-8 p-0 text-error hover:bg-error/10"
                        >
                          <Trash2 size={12} />
                        </Button>
                      </div>
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          </div>
        )}

        {/* Pagination footer */}
        {pagination.pages > 1 && (
          <div className="p-4 border-t border-border flex justify-between items-center select-none text-xs">
            <span className="text-text-secondary">
              Showing Page {page} of {pagination.pages} ({pagination.total} staff users)
            </span>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" disabled={page === 1} onClick={() => setPage(page - 1)}>
                Previous
              </Button>
              <Button size="sm" variant="outline" disabled={page === pagination.pages} onClick={() => setPage(page + 1)}>
                Next
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Delete Confirmation Dialog */}
      <Dialog isOpen={!!userToDelete} onClose={() => setUserToDelete(null)}>
        <DialogContent className="max-w-md p-6">
          <DialogHeader>
            <DialogTitle>Delete Staff Member?</DialogTitle>
          </DialogHeader>
          <div className="py-4 text-sm text-text-secondary space-y-2">
            <p>
              Are you sure you want to delete staff account for{' '}
              <strong className="text-text-primary">{userToDelete?.name}</strong>?
            </p>
            <p className="text-xs text-error font-medium">This action will remove the user permanently.</p>
            {deleteError && (
              <div className="p-3 bg-error/10 border border-error/20 text-error text-xs rounded-md">
                {deleteError}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setUserToDelete(null)} disabled={deleteMutation.isPending}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleDelete} disabled={deleteMutation.isPending} className="bg-error hover:bg-error-hover text-white">
              {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
