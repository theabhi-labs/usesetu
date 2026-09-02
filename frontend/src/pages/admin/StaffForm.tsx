import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { userApi } from '../../services/user.api';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Checkbox } from '../../components/ui/Checkbox';
import { ArrowLeft } from 'lucide-react';

export function StaffForm() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEdit = !!id;

  // Form states
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [mobile, setMobile] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('staff');
  const [isActive, setIsActive] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  // Fetch details in Edit mode
  const userQuery = useQuery({
    queryKey: ['adminUserDetail', id],
    queryFn: () => userApi.getById(id || ''),
    enabled: isEdit,
  });

  // Populate form fields on query success
  useEffect(() => {
    if (userQuery.data) {
      const u = userQuery.data;
      setName(u.name);
      setEmail(u.email);
      setMobile(u.mobile);
      setRole(u.role);
      setIsActive(u.isActive);
    }
  }, [userQuery.data]);

  // Mutations
  const saveMutation = useMutation({
    mutationFn: (body: any) => {
      if (isEdit) {
        return userApi.update(id || '', body);
      } else {
        return userApi.create(body);
      }
    },
    onSuccess: () => {
      navigate('/admin/staff');
    },
    onError: (err: any) => {
      if (err?.response?.data?.errors && Array.isArray(err.response.data.errors) && err.response.data.errors.length > 0) {
        const details = err.response.data.errors
          .map((e: any) => `${e.field.replace('body.', '')}: ${e.message}`)
          .join(', ');
        setErrorMsg(`Validation failed: ${details}`);
      } else {
        setErrorMsg(err?.response?.data?.message || 'Failed to save staff account.');
      }
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!name.trim()) return setErrorMsg('Name is required');
    if (!email.trim()) return setErrorMsg('Email is required');
    if (!mobile.trim()) return setErrorMsg('Mobile is required');
    if (!isEdit && !password.trim()) return setErrorMsg('Password is required');

    const body: Record<string, any> = {
      name: name.trim(),
      email: email.trim(),
      mobile: mobile.trim(),
      role,
      isActive,
    };

    if (password.trim()) {
      body.password = password.trim();
    }

    saveMutation.mutate(body);
  };

  if (isEdit && userQuery.isLoading) {
    return (
      <div className="p-8 w-full max-w-3xl space-y-4 text-left">
        <h2 className="h-6 w-32 bg-border-strong animate-pulse rounded" />
        <Card className="h-64 w-full bg-border-strong animate-pulse rounded" />
      </div>
    );
  }

  return (
    <div className="p-6 text-left space-y-6 w-full max-w-3xl">
      {/* Back Link */}
      <div className="select-none">
        <Link to="/admin/staff" className="flex items-center text-xs font-bold text-accent hover:underline gap-1">
          <ArrowLeft size={12} /> Back to Staff List
        </Link>
      </div>

      <div>
        <h1 className="text-xl font-bold font-sans text-text-primary">
          {isEdit ? 'Edit Staff Member' : 'Add New Staff Member'}
        </h1>
        <p className="text-xs text-text-secondary mt-0.5 select-none">
          {isEdit
            ? 'Modify credential permissions and profile details.'
            : 'Register a new operator with admin or staff dashboard rights.'}
        </p>
      </div>

      <Card className="p-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          {errorMsg && (
            <div className="p-3 bg-error/10 border border-error/20 text-error text-xs rounded font-medium select-none">
              {errorMsg}
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-text-secondary select-none">Full Name</label>
            <Input
              type="text"
              placeholder="e.g. Ramesh Kumar"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={saveMutation.isPending}
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-text-secondary select-none">Email Address</label>
              <Input
                type="email"
                placeholder="ramesh@csc.org"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={saveMutation.isPending}
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-text-secondary select-none">Mobile Number</label>
              <Input
                type="tel"
                placeholder="10-digit number"
                value={mobile}
                onChange={(e) => setMobile(e.target.value)}
                disabled={saveMutation.isPending}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-text-secondary select-none">Role Category</label>
              <Select value={role} onChange={(e) => setRole(e.target.value)} disabled={saveMutation.isPending}>
                <option value="staff">Staff (Standard operator)</option>
                <option value="admin">Admin (Full operations control)</option>
              </Select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-text-secondary select-none">
                {isEdit ? 'Update Password (leave empty to keep current)' : 'Password'}
              </label>
              <Input
                type="password"
                placeholder={isEdit ? '••••••••' : 'Password (min 8 chars)'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={saveMutation.isPending}
                required={!isEdit}
              />
            </div>
          </div>

          <div className="border-t border-border pt-4 flex items-center select-none">
            <Checkbox
              id="isActiveStaff"
              label="Account is Active (permitted to log in)"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              disabled={saveMutation.isPending}
            />
          </div>

          <div className="pt-4 border-t border-border flex justify-end gap-3 select-none">
            <Link to="/admin/staff">
              <Button type="button" variant="outline" size="sm" disabled={saveMutation.isPending}>
                Cancel
              </Button>
            </Link>
            <Button type="submit" size="sm" disabled={saveMutation.isPending}>
              {saveMutation.isPending ? 'Saving...' : 'Save Member'}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
