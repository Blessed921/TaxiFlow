import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, Circle } from 'react-leaflet';
import L from 'leaflet';
import { Navigation, MapPin, Car } from 'lucide-react';
import { renderToStaticMarkup } from 'react-dom/server';

interface MapProps {
  center?: [number, number];
  markers?: Array<{
    id: string;
    position: [number, number];
    type: 'pickup' | 'destination' | 'driver';
    label?: string;
  }>;
  onMapClick?: (lat: number, lng: number) => void;
  showUserLocation?: boolean;
}

const createIcon = (type: 'pickup' | 'destination' | 'driver') => {
  const iconMarkup = renderToStaticMarkup(
    <div className={`p-2 rounded-xl border-2 ${
      type === 'pickup' ? 'bg-indigo-600 border-white shadow-premium' : 
      type === 'destination' ? 'bg-rose-500 border-white shadow-premium' : 
      'bg-slate-900 border-white shadow-premium'
    } text-white`}>
      {type === 'pickup' && <MapPin size={16} />}
      {type === 'destination' && <Navigation size={16} />}
      {type === 'driver' && <Car size={16} />}
    </div>
  );

  return L.divIcon({
    html: iconMarkup,
    className: 'custom-marker',
    iconSize: [36, 36],
    iconAnchor: [18, 36],
  });
};

const MapEvents = ({ onClick, center }: { onClick?: (lat: number, lng: number) => void, center?: [number, number] }) => {
  const map = useMap();
  
  // Handle map click
  useEffect(() => {
    if (!onClick) return;
    const handleMapClick = (e: L.LeafletMouseEvent) => {
      onClick(e.latlng.lat, e.latlng.lng);
    };
    map.on('click', handleMapClick);
    return () => { map.off('click', handleMapClick); };
  }, [map, onClick]);

  // Force re-center when center prop changes
  useEffect(() => {
    if (center) {
      map.setView(center, map.getZoom(), { animate: true });
    }
  }, [center, map]);

  return null;
};

const Map: React.FC<MapProps> = ({ center = [51.505, -0.09] as [number, number], markers = [], onMapClick, showUserLocation }) => {
  return (
    <MapContainer center={center} zoom={14} className="h-full w-full grayscale-[0.3]" zoomControl={false}>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      
      {markers.map((marker) => (
        <Marker key={marker.id} position={marker.position} icon={createIcon(marker.type)}>
          {marker.label && <Popup>{marker.label}</Popup>}
        </Marker>
      ))}

      <MapEvents onClick={onMapClick} center={center} />
    </MapContainer>
  );
};

export default Map;
