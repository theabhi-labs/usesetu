import React from 'react';
import { AlertTriangle, HardDrive } from 'lucide-react';

interface UsageGaugeProps {
  label: string;
  used: number;
  limit?: number | null; // -1 for unlimited, null/undefined for disabled
  unit?: string;
  isStorage?: boolean;
}

export function formatBytes(bytes: number): string {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export const UsageGauge: React.FC<UsageGaugeProps> = ({
  label,
  used,
  limit,
  unit = '',
  isStorage = false,
}) => {
  // Handle unlimited
  const isUnlimited = limit === -1;
  const isDisabled = limit === 0 || limit === undefined;

  let percentage = 0;
  if (!isUnlimited && !isDisabled && limit && limit > 0) {
    percentage = Math.min(100, Math.round((used / limit) * 100));
  }

  const isWarning = percentage >= 80 && percentage < 90;
  const isCritical = percentage >= 90 && percentage < 100;
  const isExceeded = !isUnlimited && !isDisabled && limit && used > limit;

  // Format used & limit text
  const formattedUsed = isStorage ? formatBytes(used) : used.toLocaleString();
  const formattedLimit = isUnlimited
    ? 'Unlimited'
    : isDisabled
    ? 'Disabled'
    : isStorage
    ? formatBytes(limit!)
    : `${limit!.toLocaleString()} ${unit}`.trim();

  return (
    <div className="bg-surface border border-border rounded-3xl p-5 sm:p-6 space-y-4 shadow-xs">
      {/* Title & Limits */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <span className="text-xs font-bold text-text-tertiary uppercase tracking-wider block mb-1">
            {label}
          </span>
          <div className="flex items-baseline space-x-2">
            <span className="text-xl sm:text-2xl font-black text-text-primary">{formattedUsed}</span>
            <span className="text-xs text-text-tertiary font-medium">/ {formattedLimit}</span>
          </div>
        </div>

        {/* State Pill */}
        <div>
          {isExceeded ? (
            <span className="inline-flex items-center space-x-1 text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-error/10 text-error border border-error/20">
              <AlertTriangle className="w-3 h-3" />
              <span>Over Quota</span>
            </span>
          ) : isCritical ? (
            <span className="inline-flex items-center space-x-1 text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-error/10 text-error border border-error/20">
              <AlertTriangle className="w-3 h-3" />
              <span>Critical (90%+)</span>
            </span>
          ) : isWarning ? (
            <span className="inline-flex items-center space-x-1 text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-warning/10 text-warning border border-warning/20">
              <AlertTriangle className="w-3 h-3" />
              <span>Warning (80%+)</span>
            </span>
          ) : isUnlimited ? (
            <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-success/10 text-success border border-success/20">
              Unlimited
            </span>
          ) : (
            <span className="text-[10px] font-bold text-text-tertiary font-mono">
              {percentage}%
            </span>
          )}
        </div>
      </div>

      {/* Progress Bar */}
      {!isUnlimited && !isDisabled && (
        <div className="space-y-1.5">
          <div className="w-full h-2 bg-surface-elevated rounded-full overflow-hidden border border-border">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                isExceeded || isCritical
                  ? 'bg-error'
                  : isWarning
                  ? 'bg-warning'
                  : 'bg-gradient-to-r from-teal-500 to-emerald-400'
              }`}
              style={{ width: `${Math.min(100, Math.max(used > 0 ? 3 : 0, percentage))}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
};
