import { Logger, type OnModuleDestroy } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import {
  ConnectedSocket,
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  type OnGatewayConnection,
  type OnGatewayInit,
} from '@nestjs/websockets';
import type { Server, Socket } from 'socket.io';
import { Subscription } from 'rxjs';
import { bufferTime, filter } from 'rxjs/operators';
import {
  facilityRoom,
  WS_NAMESPACE,
  type FacilityId,
  type TelemetryBatch,
} from '@aquasense/shared';
import { TelemetryService } from '../telemetry/telemetry.service';
import { PlantService } from '../plant/plant.service';
import { AlertsService } from '../alerts/alerts.service';
import { TenantService } from '../tenant/tenant.service';
import type { AuthUser } from '../tenant/tenant.types';
import type { JwtPayload } from '../auth/jwt.strategy';
import { env } from '../config/env';

@WebSocketGateway({
  namespace: WS_NAMESPACE,
  cors: { origin: env.corsOrigin },
})
export class LiveGateway implements OnGatewayInit, OnGatewayConnection, OnModuleDestroy {
  private readonly logger = new Logger(LiveGateway.name);
  private readonly subscriptions: Subscription[] = [];

  @WebSocketServer()
  server: Server;

  constructor(
    private readonly telemetry: TelemetryService,
    private readonly plant: PlantService,
    private readonly alerts: AlertsService,
    private readonly tenant: TenantService,
    private readonly jwt: JwtService,
  ) {}

  afterInit() {
    const batchMs = env.telemetryBatchMs;

    this.subscriptions.push(
      this.telemetry.telemetry
        .pipe(
          bufferTime(batchMs),
          filter((batches) => batches.length > 0),
        )
        .subscribe((batches) => {
          const merged = new Map<FacilityId, TelemetryBatch>();
          for (const batch of batches) {
            const current = merged.get(batch.facilityId);
            if (current) {
              current.readings.push(...batch.readings);
              current.sentAt = batch.sentAt;
            } else {
              merged.set(batch.facilityId, { ...batch, readings: [...batch.readings] });
            }
          }
          for (const [facilityId, batch] of merged) {
            this.server?.to(facilityRoom(facilityId)).emit('telemetry:batch', batch);
          }
        }),
    );

    this.subscriptions.push(
      this.alerts.raised.subscribe((alert) => {
        this.server?.to(facilityRoom(alert.facilityId)).emit('alert:new', alert);
      }),
    );

    this.subscriptions.push(
      this.alerts.updated.subscribe((alert) => {
        this.server?.to(facilityRoom(alert.facilityId)).emit('alert:updated', alert);
      }),
    );

    this.subscriptions.push(
      this.telemetry.streamMode.subscribe((payload) => {
        this.server?.to(facilityRoom(payload.facilityId)).emit('stream:mode', payload);
      }),
    );

    this.subscriptions.push(
      this.plant.stateChanged.subscribe((snapshot) => {
        this.server?.to(facilityRoom(snapshot.facilityId)).emit('plant:state', snapshot);
      }),
    );

    this.subscriptions.push(
      this.plant.events.subscribe((entry) => {
        this.server?.to(facilityRoom(entry.facilityId)).emit('event:log', entry);
      }),
    );

    this.logger.log(`Live gateway ready on ${WS_NAMESPACE} (batching ${batchMs}ms)`);
  }

  onModuleDestroy() {
    this.subscriptions.forEach((s) => s.unsubscribe());
  }

  handleConnection(client: Socket) {
    const user = this.userFromHandshake(client);
    if (!user) {
      client.emit('stream:mode', { facilityId: '', mode: 'SIMULATED', since: Date.now() });
      client.disconnect();
      return;
    }
    client.data.user = user;
    void this.join(client, this.tenant.firstAllowed(user));
  }

  @SubscribeMessage('subscribe')
  onSubscribe(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { facilityId: string },
  ) {
    const user = (client.data.user as AuthUser | undefined) ?? this.userFromHandshake(client);
    if (!user) {
      client.disconnect();
      return;
    }
    let facilityId = body?.facilityId;
    if (!this.tenant.canAccess(user, facilityId)) {
      facilityId = this.tenant.firstAllowed(user);
    }
    for (const room of client.rooms) {
      if (room.startsWith('facility:')) client.leave(room);
    }
    void this.join(client, facilityId);
  }

  private userFromHandshake(client: Socket): AuthUser | null {
    const raw =
      (client.handshake.auth?.token as string | undefined) ||
      (typeof client.handshake.headers.authorization === 'string'
        ? client.handshake.headers.authorization.replace(/^Bearer\s+/i, '')
        : '');
    if (!raw) return null;
    try {
      const payload = this.jwt.verify<JwtPayload>(raw);
      const row = this.tenant.findUserById(payload.sub);
      return row ? this.tenant.toAuthUser(row) : null;
    } catch {
      return null;
    }
  }

  private async join(client: Socket, facilityId: FacilityId) {
    await client.join(facilityRoom(facilityId));

    client.emit('stream:mode', {
      facilityId,
      mode: this.telemetry.modes()[facilityId] ?? 'SIMULATED',
      since: Date.now(),
    });
    client.emit('plant:state', this.plant.snapshot(facilityId));
    for (const alert of this.alerts.list(facilityId)) {
      client.emit(alert.state === 'ACTIVE' ? 'alert:new' : 'alert:updated', alert);
    }

    const readings = this.telemetry.latestFor(facilityId);
    if (readings.length) {
      client.emit('telemetry:batch', { facilityId, sentAt: Date.now(), readings });
    }
  }
}
