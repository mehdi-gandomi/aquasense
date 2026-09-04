import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HistoryModule } from './history/history.module';
import { TenantModule } from './tenant/tenant.module';
import { AuthModule } from './auth/auth.module';
import { PlantModule } from './plant/plant.module';
import { AlertsModule } from './alerts/alerts.module';
import { TelemetryModule } from './telemetry/telemetry.module';
import { MqttModule } from './mqtt/mqtt.module';
import { GatewayModule } from './gateway/gateway.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { ReportsModule } from './reports/reports.module';
import { HealthController } from './health/health.controller';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: ['../../.env', '.env'] }),
    HistoryModule,
    TenantModule,
    AuthModule,
    PlantModule,
    AlertsModule,
    TelemetryModule,
    MqttModule,
    GatewayModule,
    AnalyticsModule,
    ReportsModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
