import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { env } from '../config/env';
import { TenantService } from '../tenant/tenant.service';
import type { AuthUser } from '../tenant/tenant.types';

export interface JwtPayload {
  sub: string;
  email: string;
  role: 'ADMIN' | 'CLIENT';
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly tenant: TenantService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: env.jwtSecret,
    });
  }

  validate(payload: JwtPayload): AuthUser {
    const user = this.tenant.findUserById(payload.sub);
    if (!user) throw new UnauthorizedException();
    return this.tenant.toAuthUser(user);
  }
}
