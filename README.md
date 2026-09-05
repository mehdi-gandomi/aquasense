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

Off by default. Locally:

```bash
docker compose -f infra/docker-compose.yml up -d
pnpm --filter @aquasense/api sim:mqtt
```

On Dokploy, Mosquitto and `mqtt-sim` are already in `docker-compose.yml`. Set:

```env
MQTT_ENABLED=true
```

Then redeploy/restart the `api` service. The console stream badge switches to **LIVE** when broker packets arrive (and back to **SIMULATED** after silence). Leave `MQTT_ENABLED=false` to keep the in-process simulator; the broker still runs ready for you.

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
infra/            Local Mosquitto compose
docker-compose.yml  Production stack (Dokploy)
```

## Deploy on Dokploy

Use a **Compose** application (not a single Dockerfile app). The repo already has production images for `web`, `api`, and MySQL.

### 1. DNS

Point two hostnames at your Dokploy server IP, for example:

- `app.example.com` → console
- `api.example.com` → SCADA API / WebSocket

### 2. Create the app

1. Dokploy → **Create** → **Compose**
2. Connect the Git repo
3. Compose path: `./docker-compose.yml`
4. Compose type: **docker-compose**

### 3. Environment

In the Compose **Environment** tab, set at least:

```env
MYSQL_PASSWORD=choose-a-strong-password
MYSQL_ROOT_PASSWORD=choose-a-strong-password
JWT_SECRET=choose-a-long-random-secret
CORS_ORIGIN=https://app.example.com
NEXT_PUBLIC_API_URL=https://api.example.com
NEXT_PUBLIC_WS_URL=https://api.example.com
```

Optional:

```env
MQTT_ENABLED=false
LLM_BASE_URL=
LLM_API_KEY=
LLM_MODEL=gpt-4o-mini
```

Mosquitto and a demo `mqtt-sim` publisher are always in the stack. Set `MQTT_ENABLED=true` and restart `api` to ingest LIVE telemetry from the broker. Leave it `false` to keep the in-process plant simulator.

`NEXT_PUBLIC_*` are **build-time** args for the web image. If you change them later, trigger a **rebuild** (not only a restart).

### 4. Domains

In Dokploy Domains, attach:

| Domain | Service |
|--------|---------|
| `app.example.com` | `web` |
| `api.example.com` | `api` |

Enable HTTPS (Let's Encrypt) on both. Socket.IO needs the API domain to support WebSockets (Dokploy/Traefik does this by default).

### 5. Deploy

Click **Deploy**. First build pulls Node images and compiles the monorepo — allow several minutes.

Check:

- `https://api.example.com/health`
- `https://app.example.com/login` — seed admin `admin@aquasense.local` / `admin123`

### Notes

- Do **not** publish host ports; Dokploy Traefik routes by domain to services `web` and `api`.
- MQTT: services `mosquitto` + `mqtt-sim` run automatically. Flip `MQTT_ENABLED=true` on `api` for LIVE mode.
- Chat assistant works without an LLM; set `LLM_*` on `web` when your OpenAI-compatible API is ready.