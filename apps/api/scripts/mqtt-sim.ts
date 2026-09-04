/**
 * Publishes deterministic plant telemetry to Mosquitto so the SCADA core
 * flips from SIMULATED to LIVE. Run after `docker compose -f infra/docker-compose.yml up -d`.
 *
 *   pnpm --filter @aquasense/api sim:mqtt
 */
import { connect } from 'mqtt';
import {
  SENSORS,
  mqttTopics,
  roundTo,
  simulateValue,
} from '@aquasense/shared';

const url = process.env.MQTT_URL ?? 'mqtt://localhost:1883';
const client = connect(url, { clientId: `aquasense-mqtt-sim-${process.pid}` });

client.on('connect', () => {
  console.log(`MQTT simulator publishing to ${url}`);
  setInterval(() => {
    const now = Date.now();
    for (const sensor of SENSORS) {
      const value = roundTo(simulateValue(sensor, now), sensor.decimals);
      client.publish(
        mqttTopics.telemetry(sensor.facilityId, sensor.nodeId, sensor.id),
        JSON.stringify({ value, unit: sensor.unit, ts: now }),
        { qos: 0 },
      );
    }
  }, 1000);
});

client.on('error', (err) => {
  console.error(err.message);
});
