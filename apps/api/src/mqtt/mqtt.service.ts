import { Injectable, Logger, type OnModuleDestroy, type OnModuleInit } from '@nestjs/common';
import { connect, type MqttClient } from 'mqtt';
import { getSensor, isFacilityId, mqttTopics, type FacilityId } from '@aquasense/shared';
import { env } from '../config/env';
import { TelemetryService } from '../telemetry/telemetry.service';
import { PlantService } from '../plant/plant.service';

interface MqttPayload {
  value?: number;
  unit?: string;
  ts?: string | number;
}

const RETRY_MS = 60_000;

@Injectable()
export class MqttService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(MqttService.name);
  private client?: MqttClient;
  private retryTimer?: NodeJS.Timeout;
  private connecting = false;
  private warnedOffline = false;
  connected = false;
  source: 'broker' | 'simulated' | 'disabled' = 'disabled';

  constructor(
    private readonly telemetry: TelemetryService,
    private readonly plant: PlantService,
  ) {}

  onModuleInit() {
    this.plant.commands.subscribe(({ facilityId, equipmentId, body }) => {
      this.publishCommand(facilityId, equipmentId, body);
    });

    if (!env.mqttEnabled) {
      this.source = 'disabled';
      this.logger.log('MQTT off — plant telemetry is the in-process simulator');
      return;
    }
    this.connect();
  }

  onModuleDestroy() {
    if (this.retryTimer) clearTimeout(this.retryTimer);
    this.disposeClient();
  }

  publishCommand(facilityId: FacilityId, equipmentId: string, body: unknown) {
    if (!this.connected || !this.client) return;
    this.client.publish(
      mqttTopics.command(facilityId, equipmentId),
      JSON.stringify(body),
      { qos: 0 },
    );
  }

  private connect() {
    if (this.connecting || this.connected) return;
    this.connecting = true;
    this.disposeClient();

    let client: MqttClient;
    try {
      client = connect(env.mqttUrl, {
        username: env.mqttUsername,
        password: env.mqttPassword,
        reconnectPeriod: 0,
        connectTimeout: 2000,
        keepalive: 0,
        resubscribe: false,
        clientId: `aquasense-scada-${process.pid}`,
      });
    } catch (error) {
      this.connecting = false;
      this.fallback((error as Error).message);
      return;
    }

    // Must be first: mqtt.js throws if 'error' has no listener (connack timeout).
    client.on('error', (error) => {
      this.connecting = false;
      this.connected = false;
      this.fallback(error?.message || 'broker unreachable');
    });

    client.on('connect', () => {
      this.connecting = false;
      this.connected = true;
      this.source = 'broker';
      this.warnedOffline = false;
      this.logger.log(`MQTT connected ${env.mqttUrl}`);
      client.subscribe(mqttTopics.telemetryWildcard(), (err) => {
        if (err) this.logger.error(`MQTT subscribe failed: ${err.message}`);
      });
    });

    client.on('close', () => {
      const wasLive = this.connected;
      this.connecting = false;
      this.connected = false;
      if (wasLive) this.fallback('connection closed');
    });

    client.on('message', (topic, payload) => {
      this.onMessage(topic, payload.toString());
    });

    this.client = client;
  }

  private fallback(reason: string) {
    this.source = 'simulated';
    this.disposeClient();
    if (!this.warnedOffline) {
      this.warnedOffline = true;
      this.logger.warn(
        `MQTT unavailable (${reason || env.mqttUrl}) — using in-process simulation. Will retry every ${RETRY_MS / 1000}s.`,
      );
    }
    if (this.retryTimer) return;
    this.retryTimer = setTimeout(() => {
      this.retryTimer = undefined;
      this.connect();
    }, RETRY_MS);
  }

  private disposeClient() {
    const client = this.client;
    this.client = undefined;
    if (!client) return;
    client.removeAllListeners('connect');
    client.removeAllListeners('close');
    client.removeAllListeners('offline');
    client.removeAllListeners('message');
    client.removeAllListeners('reconnect');
    // Keep a no-op error listener so a late "connack timeout" cannot crash Node.
    client.removeAllListeners('error');
    client.on('error', () => undefined);
    try {
      client.end(true);
    } catch {
      /* already closed */
    }
  }

  private onMessage(topic: string, raw: string) {
    const parts = topic.split('/');
    if (parts.length < 5 || parts[0] !== 'aquasense' || parts[4] !== 'telemetry') return;
    const facilityId = parts[1];
    const sensorId = parts[3];
    if (!isFacilityId(facilityId)) return;

    const sensor = getSensor(sensorId);
    if (!sensor || sensor.facilityId !== facilityId) return;

    let parsed: MqttPayload;
    try {
      parsed = JSON.parse(raw) as MqttPayload;
    } catch {
      return;
    }

    const value = Number(parsed.value);
    if (!Number.isFinite(value)) return;

    const recordedAt =
      typeof parsed.ts === 'number'
        ? parsed.ts
        : parsed.ts
          ? Date.parse(parsed.ts)
          : Date.now();

    this.telemetry.ingestLive({
      facilityId,
      sensorId: sensor.id,
      nodeId: sensor.nodeId,
      value,
      unit: parsed.unit ?? sensor.unit,
      recordedAt: Number.isFinite(recordedAt) ? recordedAt : Date.now(),
    });
  }
}
