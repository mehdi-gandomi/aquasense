'use client';

import { useEffect, useMemo, useRef } from 'react';
import {
  MapContainer,
  Marker,
  Popup,
  TileLayer,
  useMap,
  useMapEvents,
} from 'react-leaflet';
import L from 'leaflet';
import type { Severity } from '@aquasense/shared';
import { SEVERITY_COLOR } from '@aquasense/shared';
import clsx from 'clsx';
import 'leaflet/dist/leaflet.css';

export interface MapSensorPin {
  id: string;
  facilityId?: string;
  label: string;
  parameter?: string;
  unit?: string;
  lat: number;
  lng: number;
  source?: string;
}

export interface FleetSite {
  id: string;
  shortName: string;
  code: string;
  kind: string;
  address?: string;
  lat?: number;
  lng?: number;
  severity: Severity;
  warning: number;
  critical: number;
  instruments: number;
  mapSensors?: MapSensorPin[];
}

function kindGlyph(kind: string): string {
  if (kind === 'reservoir') {
    return `<path d="M8 4c3 4 5 7 5 10a5 5 0 1 1-10 0c0-3 2-6 5-10z" fill="currentColor"/>`;
  }
  if (kind === 'pretreatment') {
    return `<rect x="5" y="6" width="14" height="12" rx="1.5" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M8 12h8M12 9v6" stroke="currentColor" stroke-width="1.8"/>`;
  }
  // wrrf / default — plant stacks
  return `<path d="M6 18V8l5-3 5 3v10" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M9 18v-4h6v4" fill="none" stroke="currentColor" stroke-width="1.8"/><circle cx="18" cy="7" r="2.2" fill="currentColor"/>`;
}

function plantIcon(kind: string, severity: Severity, selected: boolean) {
  const color = SEVERITY_COLOR[severity];
  const size = selected ? 48 : 40;
  const ring = selected ? 3 : 2;
  return L.divIcon({
    className: '',
    html: `<div style="width:${size}px;height:${size}px;position:relative;filter:drop-shadow(0 2px 4px rgba(7,21,34,0.35));opacity:${selected ? 1 : 0.92}">
      <div style="position:absolute;inset:0;border-radius:999px;background:${color}22;border:${ring}px solid ${color}"></div>
      <div style="position:absolute;inset:6px;border-radius:999px;background:#0b2033;color:#e8f4f8;display:flex;align-items:center;justify-content:center">
        <svg viewBox="0 0 24 24" width="18" height="18" style="color:#4fd8ea">${kindGlyph(kind)}</svg>
      </div>
      <div style="position:absolute;bottom:-2px;left:50%;transform:translateX(-50%);width:0;height:0;border-left:6px solid transparent;border-right:6px solid transparent;border-top:8px solid ${color}"></div>
    </div>`,
    iconSize: [size, size + 6],
    iconAnchor: [size / 2, size + 4],
    popupAnchor: [0, -(size / 2)],
  });
}

function sensorIcon(selected: boolean) {
  const fill = selected ? '#14afc4' : '#0d7b8b';
  return L.divIcon({
    className: '',
    html: `<div style="width:18px;height:18px;border-radius:4px;background:${fill};border:2px solid #eef4f6;box-shadow:0 1px 3px rgba(0,0,0,0.35);transform:rotate(45deg)"></div>`,
    iconSize: [18, 18],
    iconAnchor: [9, 9],
  });
}

function Fit({ sites }: { sites: FleetSite[] }) {
  const map = useMap();
  const done = useRef(false);
  useEffect(() => {
    if (done.current) return;
    const pts = sites.filter((s) => s.lat != null && s.lng != null) as Array<
      FleetSite & { lat: number; lng: number }
    >;
    if (pts.length === 1) {
      map.setView([pts[0].lat, pts[0].lng], 11);
      done.current = true;
      return;
    }
    if (pts.length > 1) {
      map.fitBounds(
        pts.map((s) => [s.lat, s.lng] as [number, number]),
        { padding: [48, 48] },
      );
      done.current = true;
    }
  }, [map, sites]);
  return null;
}

function ClickCapture({
  enabled,
  onClick,
}: {
  enabled: boolean;
  onClick: (lat: number, lng: number) => void;
}) {
  useMapEvents({
    click(e) {
      if (!enabled) return;
      onClick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

export function CatchmentMap({
  sites,
  selectedPlantId,
  onSelectPlant,
  placeMode,
  onPlaceClick,
  sensorPins,
  selectedSensorId,
  onSelectSensor,
  onSensorMoved,
  className = 'h-[520px] w-full',
}: {
  sites: FleetSite[];
  selectedPlantId?: string | null;
  onSelectPlant?: (id: string) => void;
  placeMode?: boolean;
  onPlaceClick?: (lat: number, lng: number) => void;
  sensorPins?: MapSensorPin[];
  selectedSensorId?: string | null;
  onSelectSensor?: (id: string) => void;
  onSensorMoved?: (id: string, lat: number, lng: number) => void;
  className?: string;
}) {
  const plantMarkers = useMemo(
    () => sites.filter((s) => s.lat != null && s.lng != null),
    [sites],
  );

  return (
    <div className={clsx('relative', placeMode && 'cursor-crosshair')}>
      <MapContainer
        center={[53.48, -2.24]}
        zoom={6}
        className={className}
        scrollWheelZoom
      >
        <TileLayer
          attribution="&copy; OpenStreetMap"
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Fit sites={sites} />
        <ClickCapture enabled={!!placeMode && !!onPlaceClick} onClick={(lat, lng) => onPlaceClick?.(lat, lng)} />

        {plantMarkers.map((site) => {
          const selected = site.id === selectedPlantId;
          return (
            <Marker
              key={site.id}
              position={[site.lat!, site.lng!]}
              icon={plantIcon(site.kind, site.severity, selected)}
              opacity={selectedPlantId && !selected ? 0.55 : 1}
              eventHandlers={{
                click: (e) => {
                  if (placeMode) return;
                  L.DomEvent.stopPropagation(e);
                  onSelectPlant?.(site.id);
                },
              }}
              zIndexOffset={selected ? 600 : 400}
            >
              <Popup>
                <div className="min-w-[140px]">
                  <div className="text-[12px] font-semibold uppercase tracking-[0.08em] text-slate-800">
                    {site.shortName}
                  </div>
                  <div className="mt-0.5 text-[10px] text-slate-500">
                    {site.code} · {site.kind}
                  </div>
                  <div className="mt-1 text-[10px] text-slate-600">
                    {site.critical} crit · {site.warning} warn · {site.instruments} pts
                  </div>
                </div>
              </Popup>
            </Marker>
          );
        })}

        {(sensorPins ?? [])
          .filter((s) => Number.isFinite(s.lat) && Number.isFinite(s.lng))
          .map((sensor) => (
            <Marker
              key={sensor.id}
              position={[sensor.lat, sensor.lng]}
              icon={sensorIcon(sensor.id === selectedSensorId)}
              draggable={!placeMode}
              eventHandlers={{
                click: (e) => {
                  if (placeMode) return;
                  L.DomEvent.stopPropagation(e);
                  onSelectSensor?.(sensor.id);
                },
                dragend: (e) => {
                  const m = e.target as L.Marker;
                  const ll = m.getLatLng();
                  onSensorMoved?.(sensor.id, ll.lat, ll.lng);
                },
              }}
              zIndexOffset={500}
            >
              <Popup>
                <div className="text-[11px] font-semibold text-slate-800">{sensor.label}</div>
                <div className="text-[10px] text-slate-500">
                  {sensor.parameter}
                  {sensor.unit ? ` · ${sensor.unit}` : ''}
                </div>
              </Popup>
            </Marker>
          ))}
      </MapContainer>

      {placeMode && (
        <div className="pointer-events-none absolute left-3 top-3 rounded-xl bg-cyan-600 px-3 py-1.5 text-[11px] font-semibold text-white shadow-md">
          Click map to place sensor
        </div>
      )}
    </div>
  );
}

/** Backward-compatible simple fleet map. */
export function FleetMap({
  sites,
  onSelect,
  className = 'h-[420px] w-full border-2 border-line',
}: {
  sites: FleetSite[];
  onSelect?: (id: string) => void;
  className?: string;
}) {
  return (
    <CatchmentMap
      sites={sites}
      onSelectPlant={onSelect}
      className={className}
    />
  );
}
