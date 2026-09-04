import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { compareSync } from 'bcryptjs';
import { TenantService } from '../tenant/tenant.service';
import type { AuthUser } from '../tenant/tenant.types';

@Injectable()
export class AuthService {
  constructor(
    private readonly tenant: TenantService,
    private readonly jwt: JwtService,
  ) {}

  login(email: string, password: string) {
    const user = this.tenant.findUserByEmail(email);
    if (!user || !compareSync(password, user.passwordHash)) {
      throw new UnauthorizedException('Invalid email or password');
    }
    const profile = this.tenant.toAuthUser(user);
    const accessToken = this.jwt.sign({
      sub: profile.id,
      email: profile.email,
      role: profile.role,
    });
    return this.session(accessToken, profile);
  }

  me(user: AuthUser) {
    const fresh = this.tenant.findUserById(user.id);
    const profile = fresh ? this.tenant.toAuthUser(fresh) : user;
    return this.session(undefined, profile);
  }

  private session(accessToken: string | undefined, profile: AuthUser) {
    const plants = this.tenant
      .listFacilities()
      .filter((plant) => this.tenant.canAccess(profile, plant.id));
    return {
      ...(accessToken ? { accessToken } : {}),
      user: profile,
      plants,
    };
  }
}
