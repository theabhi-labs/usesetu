import * as React from 'react';
import { Sun, Moon, Laptop, Check } from 'lucide-react';
import { useThemeStore, type Theme } from '../../store/themeStore';
import { cn } from '../../lib/cn';

export interface ThemeToggleProps {
  variant?: 'button' | 'dropdown' | 'segmented';
  className?: string;
  showLabel?: boolean;
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({
  variant = 'button',
  className,
  showLabel = false,
}) => {
  const { theme, resolvedTheme, setTheme, toggleTheme } = useThemeStore();
  const [isOpen, setIsOpen] = React.useState(false);
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  React.useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  // 1. Segmented 3-way Control (Perfect for Settings / Profile / Security pages)
  if (variant === 'segmented') {
    const options: { value: Theme; label: string; icon: typeof Sun }[] = [
      { value: 'light', label: 'Light', icon: Sun },
      { value: 'dark', label: 'Dark', icon: Moon },
      { value: 'system', label: 'System', icon: Laptop },
    ];

    return (
      <div
        className={cn(
          'inline-flex items-center p-1 rounded-xl bg-surface-elevated border border-border text-xs font-medium select-none shadow-xs',
          className
        )}
        role="group"
        aria-label="Theme selection"
      >
        {options.map(({ value, label, icon: Icon }) => {
          const isActive = theme === value;
          return (
            <button
              key={value}
              type="button"
              onClick={() => setTheme(value)}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all duration-200 cursor-pointer font-sans',
                isActive
                  ? 'bg-accent text-white font-semibold shadow-xs'
                  : 'text-text-secondary hover:text-text-primary hover:bg-surface'
              )}
            >
              <Icon size={14} className={isActive ? 'text-white' : 'text-text-tertiary'} />
              <span>{label}</span>
            </button>
          );
        })}
      </div>
    );
  }

  // 2. Dropdown Control (Dark / Light / System options)
  if (variant === 'dropdown') {
    const options: { value: Theme; label: string; icon: typeof Sun }[] = [
      { value: 'light', label: 'Light Theme', icon: Sun },
      { value: 'dark', label: 'Dark Theme', icon: Moon },
      { value: 'system', label: 'System Default', icon: Laptop },
    ];

    return (
      <div className={cn('relative inline-block text-left', className)} ref={dropdownRef}>
        <button
          type="button"
          onClick={() => setIsOpen((prev) => !prev)}
          className="flex items-center gap-2 p-2 rounded-lg border border-border bg-surface hover:bg-surface-elevated text-text-secondary hover:text-text-primary transition-colors cursor-pointer text-xs font-medium focus:outline-none"
          title={`Active theme: ${theme} (Click to change)`}
          aria-haspopup="true"
          aria-expanded={isOpen}
        >
          {resolvedTheme === 'dark' ? (
            <Moon size={16} className="text-accent transition-transform duration-200" />
          ) : (
            <Sun size={16} className="text-accent transition-transform duration-200" />
          )}
          {showLabel && (
            <span className="capitalize font-sans font-medium text-text-primary">
              {theme === 'system' ? 'System' : theme}
            </span>
          )}
        </button>

        {isOpen && (
          <div className="absolute right-0 mt-2 w-44 rounded-xl border border-border bg-surface shadow-xl py-1.5 z-50 animate-in fade-in-50 zoom-in-95 duration-150">
            <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-text-tertiary border-b border-border select-none">
              Theme Mode
            </div>
            {options.map(({ value, label, icon: Icon }) => {
              const isSelected = theme === value;
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => {
                    setTheme(value);
                    setIsOpen(false);
                  }}
                  className={cn(
                    'w-full flex items-center justify-between px-3 py-2 text-xs font-medium transition-colors cursor-pointer text-left',
                    isSelected
                      ? 'bg-accent/10 text-accent font-semibold'
                      : 'text-text-secondary hover:text-text-primary hover:bg-surface-elevated'
                  )}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon size={15} className={isSelected ? 'text-accent' : 'text-text-tertiary'} />
                    <span>{label}</span>
                  </div>
                  {isSelected && <Check size={14} className="text-accent" />}
                </button>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // 3. Compact Fast Toggle Button (Default for Navigation Bars & Headers)
  const isDark = resolvedTheme === 'dark';

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={cn(
        'relative inline-flex items-center justify-center p-2 rounded-xl border border-border bg-surface hover:bg-surface-elevated text-text-secondary hover:text-text-primary transition-all duration-200 cursor-pointer group shadow-xs focus:outline-none',
        className
      )}
      title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
      aria-label={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
    >
      <div className="relative w-4 h-4 flex items-center justify-center overflow-hidden">
        {/* Sun Icon (for Light Mode active or transition) */}
        <Sun
          size={16}
          className={cn(
            'text-accent absolute transition-all duration-300 transform',
            isDark
              ? 'opacity-0 rotate-90 scale-50 pointer-events-none'
              : 'opacity-100 rotate-0 scale-100'
          )}
        />
        {/* Moon Icon (for Dark Mode active or transition) */}
        <Moon
          size={16}
          className={cn(
            'text-accent absolute transition-all duration-300 transform',
            isDark
              ? 'opacity-100 rotate-0 scale-100'
              : 'opacity-0 -rotate-90 scale-50 pointer-events-none'
          )}
        />
      </div>

      {showLabel && (
        <span className="ml-2 text-xs font-medium select-none">
          {isDark ? 'Dark Mode' : 'Light Mode'}
        </span>
      )}
    </button>
  );
};
