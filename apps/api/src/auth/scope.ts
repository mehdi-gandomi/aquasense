import { ForbiddenException } from '@nestjs/common';
import type { AuthUser } from '../tenant/tenant.types';
import type { TenantService } from '../tenant/tenant.service';

export function scopedFacility(
  tenant: TenantService,
  user: AuthUser | undefined,
  requested?: string,
): string {
  if (!user) return requested && tenant.knownPlant(requested) ? requested : tenant.listFacilities()[0]?.id;
  const allowed = tenant.allowedPlants(user);
  if (requested && tenant.canAccess(user, requested)) return requested;
  if (requested && !tenant.canAccess(user, requested)) {
    throw new ForbiddenException('Plant is not assigned to this account');
  }
  return allowed[0];
}
