import React, { useEffect, useState } from 'react';
import {
  CreditCard,
  Plus,
  Edit2,
  Check,
  X,
  RefreshCw,
  Sparkles,
  Layers,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import { superAdminApi } from '../../../services/superAdmin.api';
import type { SuperAdminPlanItem } from '../../../types/superAdmin.types';

export const SuperAdminPlans: React.FC = () => {
  const [plans, setPlans] = useState<SuperAdminPlanItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingPlan, setEditingPlan] = useState<SuperAdminPlanItem | null>(null);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const fetchPlans = async () => {
    try {
      setLoading(true);
      const res = await superAdminApi.getPlans();
      setPlans(res);
      setError(null);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to fetch plans');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlans();
  }, []);

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPlan) return;

    try {
      setSaving(true);
      await superAdminApi.updatePlan(editingPlan._id, {
        name: editingPlan.name,
        description: editingPlan.description,
        status: editingPlan.status,
        pricing: {
          monthly: editingPlan.pricing.monthly,
          yearly: editingPlan.pricing.yearly,
        },
        entitlements: editingPlan.entitlements,
      });
      setFeedback('Plan updated successfully!');
      setEditingPlan(null);
      fetchPlans();
      setTimeout(() => setFeedback(null), 3000);
    } catch (err: any) {
      setFeedback(err?.response?.data?.message || 'Failed to update plan');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-2xl bg-surface border border-border">
        <div>
          <div className="flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-accent" />
            <h1 className="text-xl font-extrabold text-text-primary">Master Plans & Pricing Manager</h1>
          </div>
          <p className="text-xs text-text-secondary mt-1">
            Configure subscription tiers, monthly and yearly pricing, cloud storage quotas, and feature entitlements.
          </p>
        </div>
        <button
          onClick={fetchPlans}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-surface-elevated border border-border hover:bg-border text-xs font-semibold text-text-secondary transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {feedback && (
        <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-lg text-xs font-bold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" />
          <span>{feedback}</span>
        </div>
      )}

      {/* Plans Matrix Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {plans.map((p) => (
          <div
            key={p._id}
            className={`p-5 rounded-xl border ${
              p.status === 'active' ? 'bg-surface border-border' : 'bg-surface-elevated/40 border-border opacity-70'
            } flex flex-col justify-between space-y-4`}
          >
            <div>
              <div className="flex items-center justify-between">
                <span className="font-extrabold text-sm text-text-primary">{p.name}</span>
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                    p.status === 'active'
                      ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20'
                      : 'bg-gray-500/10 text-gray-500'
                  }`}
                >
                  {p.status}
                </span>
              </div>
              <p className="text-[11px] text-text-secondary mt-1 min-h-[32px]">{p.description || 'Standard plan tier'}</p>

              <div className="mt-4 pt-3 border-t border-border">
                <div className="text-2xl font-black text-text-primary">
                  ₹{p.pricing.monthly}
                  <span className="text-xs font-normal text-text-tertiary"> / month</span>
                </div>
                <div className="text-xs text-text-secondary font-medium mt-0.5">
                  ₹{p.pricing.yearly} / year
                </div>
              </div>

              {/* Entitlements preview */}
              <div className="mt-4 space-y-1.5 text-xs text-text-secondary">
                <div className="flex justify-between">
                  <span className="text-text-tertiary">Staff Seats:</span>
                  <span className="font-bold text-text-primary">{p.entitlements?.activeUsers?.limit || 5}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-tertiary">Storage:</span>
                  <span className="font-bold text-text-primary">
                    {Math.round((p.entitlements?.storage?.limit || 0) / (1024 * 1024))} MB
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-tertiary">Monthly Requests:</span>
                  <span className="font-bold text-text-primary">
                    {p.entitlements?.monthlyRequests?.limit || 1000}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-tertiary">Custom Domain:</span>
                  <span className="font-bold text-text-primary">
                    {p.entitlements?.customDomain?.enabled ? 'Enabled' : 'Disabled'}
                  </span>
                </div>
              </div>
            </div>

            <button
              onClick={() => setEditingPlan({ ...p })}
              className="w-full flex items-center justify-center gap-1.5 py-2 px-3 bg-surface-elevated border border-border hover:bg-border rounded-lg text-xs font-bold text-text-primary transition-colors"
            >
              <Edit2 className="w-3.5 h-3.5 text-accent" />
              <span>Edit Plan & Pricing</span>
            </button>
          </div>
        ))}
      </div>

      {/* Edit Plan Modal */}
      {editingPlan && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-surface border border-border rounded-2xl p-6 max-w-lg w-full shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h2 className="text-base font-extrabold text-text-primary">Edit Plan: {editingPlan.name}</h2>
              <button
                onClick={() => setEditingPlan(null)}
                className="p-1 rounded-lg text-text-tertiary hover:text-text-primary"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-text-secondary mb-1">Plan Display Name</label>
                <input
                  type="text"
                  value={editingPlan.name}
                  onChange={(e) => setEditingPlan({ ...editingPlan, name: e.target.value })}
                  className="w-full p-2.5 bg-surface-elevated border border-border rounded-lg text-text-primary focus:outline-none focus:border-accent font-semibold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-text-secondary mb-1">Monthly Price (INR)</label>
                  <input
                    type="number"
                    value={editingPlan.pricing.monthly}
                    onChange={(e) =>
                      setEditingPlan({
                        ...editingPlan,
                        pricing: { ...editingPlan.pricing, monthly: Number(e.target.value) },
                      })
                    }
                    className="w-full p-2.5 bg-surface-elevated border border-border rounded-lg text-text-primary focus:outline-none focus:border-accent font-semibold"
                  />
                </div>
                <div>
                  <label className="block font-bold text-text-secondary mb-1">Yearly Price (INR)</label>
                  <input
                    type="number"
                    value={editingPlan.pricing.yearly}
                    onChange={(e) =>
                      setEditingPlan({
                        ...editingPlan,
                        pricing: { ...editingPlan.pricing, yearly: Number(e.target.value) },
                      })
                    }
                    className="w-full p-2.5 bg-surface-elevated border border-border rounded-lg text-text-primary focus:outline-none focus:border-accent font-semibold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-text-secondary mb-1">Staff Seats Limit</label>
                  <input
                    type="number"
                    value={editingPlan.entitlements.activeUsers.limit}
                    onChange={(e) =>
                      setEditingPlan({
                        ...editingPlan,
                        entitlements: {
                          ...editingPlan.entitlements,
                          activeUsers: { limit: Number(e.target.value) },
                        },
                      })
                    }
                    className="w-full p-2.5 bg-surface-elevated border border-border rounded-lg text-text-primary focus:outline-none focus:border-accent font-semibold"
                  />
                </div>
                <div>
                  <label className="block font-bold text-text-secondary mb-1">Monthly Requests Limit</label>
                  <input
                    type="number"
                    value={editingPlan.entitlements.monthlyRequests.limit}
                    onChange={(e) =>
                      setEditingPlan({
                        ...editingPlan,
                        entitlements: {
                          ...editingPlan.entitlements,
                          monthlyRequests: { limit: Number(e.target.value) },
                        },
                      })
                    }
                    className="w-full p-2.5 bg-surface-elevated border border-border rounded-lg text-text-primary focus:outline-none focus:border-accent font-semibold"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => setEditingPlan(null)}
                  className="px-4 py-2 bg-surface-elevated border border-border hover:bg-border rounded-lg font-semibold text-text-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 bg-accent text-white hover:bg-accent-hover rounded-lg font-bold shadow-md shadow-accent/20"
                >
                  {saving ? 'Saving Changes...' : 'Save Plan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
