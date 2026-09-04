'use client';

import { create } from 'zustand';
import type { Facility, FacilityId } from '@aquasense/shared';
import { api } from '@/lib/api';

export type UserRole = 'ADMIN' | 'CLIENT';

export interface AuthProfile {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  clientId: string | null;
  plantIds: FacilityId[];
}

interface AuthPayload {
  user: AuthProfile & { buildingIds?: FacilityId[] };
  plants?: Facility[];
  buildings?: Facility[];
}

interface LoginPayload extends AuthPayload {
  accessToken: string;
}

function normalizeProfile(user: AuthProfile & { buildingIds?: FacilityId[] }): AuthProfile {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    clientId: user.clientId,
    plantIds: user.plantIds ?? user.buildingIds ?? [],
  };
}

function normalizePlants(data: AuthPayload): Facility[] {
  return data.plants ?? data.buildings ?? [];
}

interface AuthState {
  token: string | null;
  user: AuthProfile | null;
  plants: Facility[];
  hydrated: boolean;
  error: string | null;
  hydrate: () => Promise<void>;
  refresh: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

export const useAuth = create<AuthState>((set, get) => ({
  token: null,
  user: null,
  plants: [],
  hydrated: false,
  error: null,

  hydrate: async () => {
    const token = localStorage.getItem('aquasense.token');
    if (!token) {
      set({ hydrated: true, token: null, user: null, plants: [] });
      return;
    }
    try {
      const data = await api<AuthPayload>('/auth/me');
      let plants = normalizePlants(data);
      if (data.user.role === 'ADMIN' && plants.length === 0) {
        plants = await api<Facility[]>('/facilities');
      }
      set({ token, user: normalizeProfile(data.user), plants, hydrated: true, error: null });
    } catch {
      localStorage.removeItem('aquasense.token');
      set({ token: null, user: null, plants: [], hydrated: true });
    }
  },

  refresh: async () => {
    if (!get().token) return;
    const data = await api<AuthPayload>('/auth/me');
    let plants = normalizePlants(data);
    if (data.user.role === 'ADMIN' && plants.length === 0) {
      plants = await api<Facility[]>('/facilities');
    }
    set({ user: normalizeProfile(data.user), plants });
  },

  login: async (email, password) => {
    set({ error: null });
    const data = await api<LoginPayload>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    let plants = normalizePlants(data);
    if (data.user.role === 'ADMIN' && plants.length === 0) {
      localStorage.setItem('aquasense.token', data.accessToken);
      plants = await api<Facility[]>('/facilities');
    }
    localStorage.setItem('aquasense.token', data.accessToken);
    set({
      token: data.accessToken,
      user: normalizeProfile(data.user),
      plants,
      hydrated: true,
    });
  },

  logout: () => {
    localStorage.removeItem('aquasense.token');
    set({ token: null, user: null, plants: [], hydrated: true });
  },
}));

export function visiblePlants(): Facility[] {
  return useAuth.getState().plants;
}
