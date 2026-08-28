import { create } from 'zustand';

export type Theme = 'dark' | 'light' | 'system';
export type ResolvedTheme = 'dark' | 'light';

interface ThemeState {
  theme: Theme;
  resolvedTheme: ResolvedTheme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
  initTheme: () => void;
}

const STORAGE_KEY = 'usesetu-theme';

function getSystemTheme(): ResolvedTheme {
  if (typeof window === 'undefined') return 'dark';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function applyThemeToDocument(resolved: ResolvedTheme, theme: Theme) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  
  // Remove existing theme classes
  root.classList.remove('dark', 'light');
  
  // Add active resolved class and data attributes
  root.classList.add(resolved);
  root.setAttribute('data-theme', resolved);
  root.setAttribute('data-color-mode', theme);
  root.style.colorScheme = resolved;
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  theme: 'dark',
  resolvedTheme: 'dark',

  setTheme: (newTheme: Theme) => {
    try {
      localStorage.setItem(STORAGE_KEY, newTheme);
    } catch {
      // Ignore storage errors
    }

    const resolved = newTheme === 'system' ? getSystemTheme() : newTheme;
    applyThemeToDocument(resolved, newTheme);

    set({ theme: newTheme, resolvedTheme: resolved });
  },

  toggleTheme: () => {
    const current = get().resolvedTheme;
    const nextTheme: Theme = current === 'dark' ? 'light' : 'dark';
    get().setTheme(nextTheme);
  },

  initTheme: () => {
    let savedTheme: Theme = 'dark';
    try {
      const stored = localStorage.getItem(STORAGE_KEY) as Theme | null;
      if (stored === 'dark' || stored === 'light' || stored === 'system') {
        savedTheme = stored;
      }
    } catch {
      // Ignore storage errors
    }

    const resolved = savedTheme === 'system' ? getSystemTheme() : savedTheme;
    applyThemeToDocument(resolved, savedTheme);

    set({ theme: savedTheme, resolvedTheme: resolved });

    // Listen for OS system theme changes
    if (typeof window !== 'undefined' && window.matchMedia) {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const listener = (e: MediaQueryListEvent) => {
        if (get().theme === 'system') {
          const sysResolved: ResolvedTheme = e.matches ? 'dark' : 'light';
          applyThemeToDocument(sysResolved, 'system');
          set({ resolvedTheme: sysResolved });
        }
      };

      // Modern API
      if (mediaQuery.addEventListener) {
        mediaQuery.addEventListener('change', listener);
      } else {
        // Fallback for older browsers
        mediaQuery.addListener(listener);
      }
    }
  },
}));
