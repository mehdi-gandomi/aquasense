'use client';

import { useEffect } from 'react';
import { MapContainer, Marker, Popup, TileLayer, useMap } from 'react-leaflet';
import L from 'leaflet';
import type { Severity } from '@aquasense/shared';
import { SEVERITY_COLOR } from '@aquasense/shared';
import 'leaflet/dist/leaflet.css';

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
}

function pin(severity: Severity) {
  const color = SEVERITY_COLOR[severity];
  return L.divIcon({
    className: '',
    html: `<div style="width:16px;height:16px;background:${color};border:2px solid #eef4f6;box-shadow:2px 2px 0 #071522"></div>`,
    iconSize: [16, 16],
    iconAnchor: [8, 8],
  });
}

function Fit({ sites }: { sites: FleetSite[] }) {
  const map = useMap();
  useEffect(() => {
    const pts = sites.filter((s) => s.lat != null && s.lng != null) as Array<
      FleetSite & { lat: number; lng: number }
    >;
    if (pts.length === 1) {
      map.setView([pts[0].lat, pts[0].lng], 10);
      return;
    }
    if (pts.length > 1) {
      map.fitBounds(
        pts.map((s) => [s.lat, s.lng] as [number, number]),
        { padding: [40, 40] },
      );
    }
  }, [map, sites]);
  return null;
}

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
      {sites
        .filter((s) => s.lat != null && s.lng != null)
        .map((site) => (
          <Marker
            key={site.id}
            position={[site.lat!, site.lng!]}
            icon={pin(site.severity)}
            eventHandlers={{
              click: () => onSelect?.(site.id),
            }}
          >
            <Popup>
              <div className="text-[12px] font-semibold uppercase tracking-[0.08em]">
                {site.shortName}
              </div>
              <div className="text-[10px] text-slate-500">
                {site.code} · {site.critical} crit · {site.warning} warn
              </div>
            </Popup>
          </Marker>
        ))}
    </MapContainer>
  );
}
