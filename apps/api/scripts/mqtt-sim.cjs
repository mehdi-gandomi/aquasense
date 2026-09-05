/**
 * Publishes deterministic plant telemetry to Mosquitto so the SCADA core
 * flips from SIMULATED to LIVE. Used by the `mqtt-sim` Compose service.
 */
const { connect } = require('mqtt');
const {
  SENSORS,
  mqttTopics,
  roundTo,
  simulateValue,
} = require('@aquasense/shared');

const url = process.env.MQTT_URL ?? 'mqtt://localhost:1883';
const client = connect(url, {
  clientId: `aquasense-mqtt-sim-${process.pid}`,
  reconnectPeriod: 2000,
  connectTimeout: 10_000,
});

client.on('connect', () => {
  console.log(`MQTT simulator publishing to ${url}`);
});

client.on('error', (err) => {
  console.error(`MQTT sim error: ${err.message}`);
});

setInterval(() => {
  if (!client.connected) return;
  const now = Date.now();
  for (const sensor of SENSORS) {
    const value = roundTo(simulateValue(sensor, now), sensor.decimals);
    client.publish(
      mqttTopics.telemetry(sensor.facilityId, sensor.nodeId, sensor.id),
      JSON.stringify({ value, unit: sensor.unit, ts: now }),
      { qos: 0 },
    );
  }
}, Number(process.env.MQTT_SIM_INTERVAL_MS ?? 1000));
