/** Single place the SCADA core reads process env. Missing values fail soft. */

function bool(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined || value === '') return fallback;
  return value === 'true' || value === '1' || value === 'yes';
}

function num(value: string | undefined, fallback: number): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

export const env = {
  apiPort: num(process.env.API_PORT, 3001),
  corsOrigin: process.env.CORS_ORIGIN?.split(',') ?? ['http://localhost:3000'],
  simulationTickMs: num(process.env.SIMULATION_TICK_MS, 1000),
  telemetryBatchMs: num(process.env.TELEMETRY_BATCH_MS, 250),
  historyFlushMs: num(process.env.HISTORY_FLUSH_MS, 5000),

  mqttEnabled: bool(process.env.MQTT_ENABLED, false),
  mqttUrl: process.env.MQTT_URL ?? 'mqtt://localhost:1883',
  mqttUsername: process.env.MQTT_USERNAME || undefined,
  mqttPassword: process.env.MQTT_PASSWORD || undefined,
  mqttWatchdogMs: num(process.env.MQTT_WATCHDOG_MS, 10_000),

  dbEnabled: bool(process.env.DB_ENABLED, true),
  mysqlHost: process.env.MYSQL_HOST ?? 'localhost',
  mysqlPort: num(process.env.MYSQL_PORT, 3306),
  mysqlUser: process.env.MYSQL_USER ?? 'root',
  mysqlPassword: process.env.MYSQL_PASSWORD ?? '',
  mysqlDatabase: process.env.MYSQL_DATABASE ?? 'aquasense',

  jwtSecret: process.env.JWT_SECRET ?? 'aquasense-dev-jwt-change-me',
  jwtExpires: process.env.JWT_EXPIRES ?? '7d',
};
