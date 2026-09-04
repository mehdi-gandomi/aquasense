# AQUASENSE Operational Digital Twin

Operator console for a wastewater catchment: a full-bleed **3D plant twin** and a NestJS SCADA core that simulates the plant, optionally ingests MQTT, and logs history to MySQL.

## Stack

- **Web:** Next.js 16, React 19, Tailwind 4, Three.js / R3F, Zustand
- **API:** NestJS 12, Socket.IO, MQTT, TypeORM / MySQL
- **Shared:** plant layout, sensors, simulation, compliance, bloom model

## Run

Requires Node ≥ 20 and [pnpm](https://pnpm.io).

```bash
pnpm install
pnpm --filter @aquasense/shared build
pnpm dev
```

- Console: http://localhost:3000
- API: http://localhost:3001 — `GET /health`

The console requires login. Seed accounts (created on first API boot):

- Admin: `admin@aquasense.local` / `admin123` — all plants + `/admin` (clients, plant map, users)
- Operator: `northfield@aquasense.local` / `operator123` — Northfield only

Create the MySQL database `aquasense` (user `root`, empty password) so users/plants persist. If MySQL is down the API still boots with the same seed in memory.

```bash
pnpm dev:web
pnpm dev:api
```

### MQTT (optional LIVE stream)

Off by default. Set `MQTT_ENABLED=true` in `.env` to connect to the broker.

```bash
docker compose -f infra/docker-compose.yml up -d
pnpm --filter @aquasense/api sim:mqtt
```

The core flips a facility to **LIVE** when MQTT packets arrive, and back to **SIMULATED** after 10s of silence.

## API

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/auth/login` | JWT |
| GET | `/auth/me` | Profile + allowed plants |
| GET/POST/PATCH/DELETE | `/admin/clients` | Admin client CRUD |
| GET/POST/PATCH/DELETE | `/admin/plants` | Plants + map coords |
| GET/POST/PATCH/DELETE | `/admin/users` | Users + plant assignments |
| GET | `/health` | MQTT + MySQL + stream modes |
| GET | `/facilities` | Facility registry |
| GET | `/sensors?facility=` | Sensor catalog |
| GET | `/plant/state?facility=` | Equipment snapshot |
| POST | `/plant/equipment/:id/command` | start / stop / setpoint / mode |
| GET | `/alerts?facility=&status=` | Alert board |
| POST | `/alerts/:id/ack` | Acknowledge |
| POST | `/alerts/:id/resolve` | Resolve |
| GET | `/history/trend?sensorId=&from=&to=&bucket=` | Downsampled series |
| GET | `/history/replay?from=&to=&step=` | Whole-plant frames |
| GET | `/analytics/wqi?facility=` | Water quality index |
| GET | `/analytics/compliance?facility=` | Consent vs actual (rolling if DB up) |
| GET | `/analytics/bloom` | Highland HAB assessment |
| POST | `/reports/shift` | Shift PDF + snapshot |
| GET | `/reports/shift/:id/pdf` | Download stored PDF |

The operator console also has `/chat` and a floating assistant. Until `LLM_BASE_URL` is set, replies are a local plant brief from live sensors. When your OpenAI-compatible API is ready, set `LLM_BASE_URL`, optional `LLM_API_KEY`, and `LLM_MODEL` on the web app — the Next route `POST /api/chat` proxies to `{LLM_BASE_URL}/v1/chat/completions`.

Socket.IO namespace `/live` — rooms `facility:{id}`. Events: `telemetry:batch`, `plant:state`, `alert:new`, `alert:updated`, `event:log`, `stream:mode`.

## Facilities

| ID | View |
|----|------|
| Northfield WRRF | Interactive isometric twin |
| Eastbank Industrial | Compact process schematic |
| Highland Reservoir | 3D receiving-water bloom surface |

## Workspace

```
apps/web          Operator console
apps/api          SCADA core
packages/shared   Domain contracts
infra/            Mosquitto compose
```
