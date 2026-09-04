'use client';

import { create } from 'zustand';

export type Theme = 'dark' | 'light';
export type ViewMode = '2d' | '3d';

const THEME_KEY = 'aquasense.theme';
const VIEW_KEY = 'aquasense.view';

function readStored<T extends string>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  const raw = localStorage.getItem(key);
  return (raw as T) || fallback;
}

function applyTheme(theme: Theme) {
  if (typeof document === 'undefined') return;
  document.documentElement.classList.remove('light', 'dark');
  document.documentElement.classList.add(theme);
}

interface AppearanceState {
  theme: Theme;
  viewMode: ViewMode;
  hydrated: boolean;
  hydrate: () => void;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
  setViewMode: (mode: ViewMode) => void;
}

export const useTheme = create<AppearanceState>((set, get) => ({
  theme: 'dark',
  viewMode: '2d',
  hydrated: false,

  hydrate: () => {
    const theme = readStored<Theme>(THEME_KEY, 'dark');
    const viewMode = readStored<ViewMode>(VIEW_KEY, '2d');
    applyTheme(theme);
    set({ theme, viewMode, hydrated: true });
  },

  setTheme: (theme) => {
    localStorage.setItem(THEME_KEY, theme);
    applyTheme(theme);
    set({ theme });
  },

  toggleTheme: () => {
    get().setTheme(get().theme === 'dark' ? 'light' : 'dark');
  },

  setViewMode: (viewMode) => {
    localStorage.setItem(VIEW_KEY, viewMode);
    set({ viewMode });
  },
}));
