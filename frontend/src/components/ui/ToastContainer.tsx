import { useToastStore } from '../../store/toastStore';
import { cn } from '../../lib/cn';

export function ToastContainer() {
  const toasts = useToastStore((state) => state.toasts);
  const removeToast = useToastStore((state) => state.removeToast);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={cn(
            'flex items-center justify-between p-4 rounded-lg shadow-lg border text-sm transition-all duration-300 animate-in slide-in-from-bottom-5',
            toast.type === 'success' && 'bg-success/15 border-success/30 text-success',
            toast.type === 'error' && 'bg-error/15 border-error/30 text-error',
            toast.type === 'info' && 'bg-surface-elevated border-border text-text-primary'
          )}
        >
          <span>{toast.message}</span>
          <button
            onClick={() => removeToast(toast.id)}
            className="ml-4 text-xs hover:opacity-75 focus:outline-none cursor-pointer"
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  );
}
