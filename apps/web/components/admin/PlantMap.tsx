'use client';

import { useEffect } from 'react';
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

const icon = L.divIcon({
  className: '',
  html: '<div style="width:14px;height:14px;background:#14afc4;border:2px solid #eef4f6"></div>',
  iconSize: [14, 14],
  iconAnchor: [7, 7],
});

function Clicker({ onPick }: { onPick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onPick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

function Recenter({ lat, lng }: { lat?: number; lng?: number }) {
  const map = useMap();
  useEffect(() => {
    if (lat != null && lng != null) map.setView([lat, lng], 12);
  }, [lat, lng, map]);
  return null;
}

export function PlantMap({
  lat,
  lng,
  onPick,
}: {
  lat?: number;
  lng?: number;
  onPick: (lat: number, lng: number) => void;
}) {
  const center: [number, number] = [lat ?? 53.48, lng ?? -2.24];

  return (
    <MapContainer
      center={center}
      zoom={lat ? 12 : 6}
      className="h-[280px] w-full border-2 border-line"
      scrollWheelZoom
    >
      <TileLayer
        attribution="&copy; OpenStreetMap"
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <Clicker onPick={onPick} />
      <Recenter lat={lat} lng={lng} />
      {lat != null && lng != null && <Marker position={[lat, lng]} icon={icon} />}
    </MapContainer>
  );
}
