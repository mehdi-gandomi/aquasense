import type { Facility, FacilityId, FacilityKind } from '@aquasense/shared';

export type UserRole = 'ADMIN' | 'CLIENT';

export interface ClientDto {
  id: string;
  name: string;
  contact: string | null;
  phone: string | null;
  notes: string | null;
}

export interface PlantDto extends Facility {
  clientId: string;
  address?: string;
  lat?: number;
  lng?: number;
  templateKind?: FacilityKind;
}

export interface UserDto {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  clientId: string | null;
  plantIds: FacilityId[];
}

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  clientId: string | null;
  plantIds: FacilityId[];
}
