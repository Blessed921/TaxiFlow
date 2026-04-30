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
    <div className={`p-2 rounded-full border-2 ${
      type === 'pickup' ? 'bg-blue-500 border-blue-200' : 
      type === 'destination' ? 'bg-green-500 border-green-200' : 
      'bg-orange-500 border-orange-200'
    } text-white shadow-lg`}>
      {type === 'pickup' && <MapPin size={16} />}
      {type === 'destination' && <Navigation size={16} />}
      {type === 'driver' && <Car size={16} />}
    </div>
  );

  return L.divIcon({
    html: iconMarkup,
    className: 'custom-marker',
    iconSize: [32, 32],
    iconAnchor: [16, 32],
  });
};

const MapEvents = ({ onClick }: { onClick?: (lat: number, lng: number) => void }) => {
  const map = useMap();
  useEffect(() => {
    if (!onClick) return;
    const handleMapClick = (e: L.LeafletMouseEvent) => {
      onClick(e.latlng.lat, e.latlng.lng);
    };
    map.on('click', handleMapClick);
    return () => { map.off('click', handleMapClick); };
  }, [map, onClick]);
  return null;
};

const Map: React.FC<MapProps> = ({ center = [51.505, -0.09], markers = [], onMapClick, showUserLocation }) => {
  return (
    <MapContainer center={center} zoom={13} className="h-full w-full rounded-2xl overflow-hidden" zoomControl={false}>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      
      {markers.map((marker) => (
        <Marker key={marker.id} position={marker.position} icon={createIcon(marker.type)}>
          {marker.label && <Popup>{marker.label}</Popup>}
        </Marker>
      ))}

      <MapEvents onClick={onMapClick} />
    </MapContainer>
  );
};

export default Map;
