'use client';

import { create } from 'zustand';

export type Theme = 'dark' | 'light';
export type ViewMode = '2d' | '3d';
export type UiStyle = 'brutal' | 'hydraulic' | 'atlas';
/** Soft = colorful Tailwind-admin inspired shell. Brutal = classic SCADA chrome. */
export type AdminLook = 'soft' | 'brutal';

export const UI_STYLES: Array<{ id: UiStyle; label: string }> = [
  { id: 'brutal', label: 'Brutal' },
  { id: 'hydraulic', label: 'Hydraulic' },
  { id: 'atlas', label: 'Atlas' },
];

export const ADMIN_LOOKS: Array<{ id: AdminLook; label: string }> = [
  { id: 'soft', label: 'Soft' },
  { id: 'brutal', label: 'Brutal' },
];

const THEME_KEY = 'aquasense.theme';
const VIEW_KEY = 'aquasense.view';
const STYLE_KEY = 'aquasense.style';
const ADMIN_LOOK_KEY = 'aquasense.adminLook';

function envAdminLook(): AdminLook {
  const raw = process.env.NEXT_PUBLIC_ADMIN_LOOK;
  return raw === 'brutal' ? 'brutal' : 'soft';
}

function readStored<T extends string>(key: string, fallback: T, allowed?: readonly T[]): T {
  if (typeof window === 'undefined') return fallback;
  const raw = localStorage.getItem(key) as T | null;
  if (!raw) return fallback;
  if (allowed && !allowed.includes(raw)) return fallback;
  return raw;
}

function applyTheme(theme: Theme) {
  if (typeof document === 'undefined') return;
  document.documentElement.classList.remove('light', 'dark');
  document.documentElement.classList.add(theme);
}

function applyStyle(style: UiStyle) {
  if (typeof document === 'undefined') return;
  document.documentElement.dataset.style = style;
}

function applyAdminLook(look: AdminLook) {
  if (typeof document === 'undefined') return;
  document.documentElement.dataset.adminLook = look;
}

interface AppearanceState {
  theme: Theme;
  viewMode: ViewMode;
  style: UiStyle;
  adminLook: AdminLook;
  hydrated: boolean;
  hydrate: () => void;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
  setViewMode: (mode: ViewMode) => void;
  setStyle: (style: UiStyle) => void;
  setAdminLook: (look: AdminLook) => void;
}

export const useTheme = create<AppearanceState>((set, get) => ({
  theme: 'dark',
  viewMode: '2d',
  style: 'brutal',
  adminLook: envAdminLook(),
  hydrated: false,

  hydrate: () => {
    const theme = readStored<Theme>(THEME_KEY, 'dark', ['dark', 'light']);
    const viewMode = readStored<ViewMode>(VIEW_KEY, '2d', ['2d', '3d']);
    const style = readStored<UiStyle>(STYLE_KEY, 'brutal', ['brutal', 'hydraulic', 'atlas']);
    const adminLook = readStored<AdminLook>(ADMIN_LOOK_KEY, envAdminLook(), ['soft', 'brutal']);
    applyTheme(theme);
    applyStyle(style);
    applyAdminLook(adminLook);
    set({ theme, viewMode, style, adminLook, hydrated: true });
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

  setStyle: (style) => {
    localStorage.setItem(STYLE_KEY, style);
    applyStyle(style);
    set({ style });
  },

  setAdminLook: (adminLook) => {
    localStorage.setItem(ADMIN_LOOK_KEY, adminLook);
    applyAdminLook(adminLook);
    set({ adminLook });
  },
}));
