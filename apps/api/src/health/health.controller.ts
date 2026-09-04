import { Controller, Get } from '@nestjs/common';
import { TelemetryService } from '../telemetry/telemetry.service';
import { HistoryService } from '../history/history.service';
import { MqttService } from '../mqtt/mqtt.service';
import { env } from '../config/env';

@Controller('health')
export class HealthController {
  constructor(
    private readonly telemetry: TelemetryService,
    private readonly history: HistoryService,
    private readonly mqtt: MqttService,
  ) {}

  @Get()
  health() {
    return {
      ok: true,
      service: 'aquasense-scada-core',
      uptime: Math.round(process.uptime()),
      mqtt: {
        enabled: env.mqttEnabled,
        connected: this.mqtt.connected,
        source: this.mqtt.source,
        url: env.mqttUrl,
        watchdogMs: env.mqttWatchdogMs,
      },
      database: {
        enabled: env.dbEnabled,
        connected: this.history.connected,
        host: env.mysqlHost,
        database: env.mysqlDatabase,
      },
      streams: this.telemetry.modes(),
      at: new Date().toISOString(),
    };
  }
}
