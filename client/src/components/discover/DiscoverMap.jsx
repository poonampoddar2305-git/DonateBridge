import React, { useEffect, useRef, useMemo, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Compass, Target, Maximize2, Minimize2, MapPin, Navigation, Info, Layers } from 'lucide-react';

// Fix Leaflet default icon paths
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Custom Icon Creator using L.divIcon
const createCustomMarkerIcon = (type, isSelected = false, isHovered = false) => {
  let iconHtml = '';

  if (type === 'user') {
    iconHtml = `
      <div class="relative flex items-center justify-center w-8 h-8">
        <span class="absolute w-8 h-8 rounded-full bg-blue-500/30 animate-ping"></span>
        <div class="w-6 h-6 rounded-full bg-blue-600 border-2 border-white shadow-md flex items-center justify-center text-white font-bold text-[10px]">
          YOU
        </div>
      </div>
    `;
  } else if (type === 'destination') {
    iconHtml = `
      <div class="relative flex items-center justify-center w-9 h-9 -mt-2">
        <span class="absolute w-9 h-9 rounded-full bg-[#4A7C59]/40 animate-pulse"></span>
        <div class="w-8 h-8 rounded-xl bg-[#4A7C59] border-2 border-white shadow-xl flex items-center justify-center text-white font-bold text-xs">
          🎯
        </div>
      </div>
    `;
  } else if (type === 'ngo') {
    const bg = isSelected ? 'bg-[#4A7C59] scale-125 z-50 ring-4 ring-[#4A7C59]/30' : isHovered ? 'bg-[#4A7C59] scale-110' : 'bg-[#3B6647] hover:scale-110';
    iconHtml = `
      <div class="transition-all duration-200 ${bg} w-7 h-7 rounded-xl border-2 border-white shadow-md flex items-center justify-center text-white font-bold text-xs">
        🏛️
      </div>
    `;
  } else {
    // Donation
    const bg = isSelected ? 'bg-amber-600 scale-125 z-50 ring-4 ring-amber-300' : isHovered ? 'bg-amber-500 scale-110' : 'bg-stone-800 hover:scale-110';
    iconHtml = `
      <div class="transition-all duration-200 ${bg} w-7 h-7 rounded-xl border-2 border-white shadow-md flex items-center justify-center text-white font-bold text-xs">
        📦
      </div>
    `;
  }

  return L.divIcon({
    html: iconHtml,
    className: 'custom-leaflet-marker',
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -16]
  });
};

// Map Controller for Center / Zoom Updates
function MapController({ center, zoom, bounds }) {
  const map = useMap();

  useEffect(() => {
    if (bounds && bounds.length >= 2) {
      try {
        map.fitBounds(bounds, { padding: [40, 40], maxZoom: 15, animate: true });
      } catch (e) {
        if (center) map.setView(center, zoom || 12, { animate: true });
      }
    } else if (center) {
      map.setView(center, zoom || 12, { animate: true });
    }
  }, [center, zoom, bounds, map]);

  return null;
}

export default function DiscoverMap({
  userCoords = null,
  onUserCoordsChange = null,
  items = [],
  searchType = 'donations',
  selectedItem = null,
  hoveredItemId = null,
  onSelectItem = null,
  routeData = null,
  radiusKm = 25,
  className = 'h-full w-full'
}) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const containerRef = useRef(null);
  const mapRef = useRef(null);

  // Compute center
  const mapCenter = useMemo(() => {
    if (selectedItem) {
      const lat = selectedItem.location ? selectedItem.location.lat : selectedItem.lat;
      const lng = selectedItem.location ? selectedItem.location.lng : selectedItem.lng;
      if (lat && lng) return [lat, lng];
    }
    if (userCoords && userCoords[0] && userCoords[1]) return userCoords;
    return [20.5937, 78.9629]; // Geographic overview
  }, [selectedItem, userCoords]);

  // Compute bounds
  const autoBounds = useMemo(() => {
    if (routeData && routeData.coordinates && routeData.coordinates.length > 0) {
      return routeData.coordinates;
    }
    const points = [];
    if (userCoords && userCoords[0] && userCoords[1]) points.push(userCoords);
    items.forEach(item => {
      const lat = item.location ? item.location.lat : item.lat;
      const lng = item.location ? item.location.lng : item.lng;
      if (lat && lng) points.push([lat, lng]);
    });
    return points.length > 1 ? points : null;
  }, [userCoords, items, routeData]);

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  const userMarkerEvents = useMemo(() => ({
    dragend(e) {
      const marker = e.target;
      const pos = marker.getLatLng();
      if (onUserCoordsChange) {
        onUserCoordsChange([pos.lat, pos.lng]);
      }
    }
  }), [onUserCoordsChange]);

  return (
    <div ref={containerRef} className={`relative overflow-hidden rounded-xl border border-stone-300 shadow-sm bg-stone-100 ${className}`}>
      
      {/* Top Left Live Badge Overlay */}
      <div className="absolute top-3 left-3 z-400 bg-white/95 backdrop-blur-md px-3 py-1.5 rounded-lg border border-stone-200 shadow-xs flex items-center gap-2 text-stone-800 text-xs font-semibold">
        <span className="w-2 h-2 rounded-full bg-[#4A7C59] animate-pulse" />
        <span>Logistics Radar</span>
        <span className="text-stone-400 font-mono text-[11px]">| {items.length} Active Pins</span>
      </div>

      {/* Top Right Controls Overlay */}
      <div className="absolute top-3 right-3 z-400 flex flex-col gap-1.5 bg-white/95 backdrop-blur-md p-1 rounded-lg border border-stone-200 shadow-sm">
        <button
          title="Recenter GPS"
          onClick={() => {
            if (mapRef.current && userCoords && userCoords[0] && userCoords[1]) {
              mapRef.current.setView(userCoords, 14, { animate: true });
            }
          }}
          className="w-8 h-8 rounded-md flex items-center justify-center text-stone-700 hover:bg-stone-100 transition-colors cursor-pointer"
        >
          <Compass className="w-4 h-4 text-[#4A7C59]" />
        </button>

        <button
          title="Fit All Pins"
          onClick={() => {
            if (mapRef.current && autoBounds) {
              mapRef.current.fitBounds(autoBounds, { padding: [40, 40] });
            }
          }}
          className="w-8 h-8 rounded-md flex items-center justify-center text-stone-700 hover:bg-stone-100 transition-colors cursor-pointer"
        >
          <Target className="w-4 h-4 text-blue-600" />
        </button>

        <button
          title="Fullscreen Map"
          onClick={toggleFullscreen}
          className="w-8 h-8 rounded-md flex items-center justify-center text-stone-700 hover:bg-stone-100 transition-colors cursor-pointer"
        >
          {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
        </button>
      </div>

      {/* Bottom Map Legend Banner */}
      <div className="absolute bottom-3 left-3 z-400 bg-white/95 backdrop-blur-md px-3 py-1.5 rounded-lg border border-stone-200 shadow-xs flex items-center gap-3 text-[11px] font-semibold text-stone-700">
        <div className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded-full bg-blue-600 inline-block" />
          <span>You</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-xs">🏛️</span>
          <span>NGOs</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-xs">📦</span>
          <span>Donations</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-xs">🎯</span>
          <span>Selected Target</span>
        </div>
      </div>

      {/* Leaflet Canvas */}
      <MapContainer
        ref={mapRef}
        center={mapCenter}
        zoom={13}
        zoomControl={false}
        style={{ height: '100%', width: '100%', zIndex: 1 }}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; OpenStreetMap contributors'
        />

        <MapController center={mapCenter} zoom={selectedItem ? 14 : 12} />

        {/* Coverage Radius Circle */}
        {userCoords && (
          <Circle
            center={userCoords}
            radius={(radiusKm || 25) * 1000}
            pathOptions={{
              color: '#4A7C59',
              fillColor: '#4A7C59',
              fillOpacity: 0.05,
              weight: 1.5,
              dashArray: '4, 4'
            }}
          />
        )}

        {/* Route Polylines */}
        {routeData && routeData.coordinates && (
          <Polyline
            positions={routeData.coordinates}
            pathOptions={{
              color: '#4A7C59',
              weight: 5,
              opacity: 0.9,
              dashArray: routeData.isFallback ? '5, 5' : null
            }}
          />
        )}

        {/* User Draggable Marker */}
        {userCoords && (
          <Marker
            position={userCoords}
            draggable={true}
            eventHandlers={userMarkerEvents}
            icon={createCustomMarkerIcon('user')}
          >
            <Popup>
              <div className="p-1 font-sans text-xs space-y-1 text-left">
                <span className="font-bold text-blue-600 block">📍 Your Location (Origin)</span>
                <p className="text-stone-500 text-[11px]">Drag pin anywhere to test distance from new location.</p>
              </div>
            </Popup>
          </Marker>
        )}

        {/* Item Markers */}
        {items.map((item) => {
          const lat = item.location ? item.location.lat : item.lat;
          const lng = item.location ? item.location.lng : item.lng;
          if (!lat || !lng) return null;

          const isSelected = selectedItem?.id === item.id;
          const isHovered = hoveredItemId === item.id;
          const markerType = isSelected ? 'destination' : (searchType === 'ngos' ? 'ngo' : 'donation');
          const title = item.title || item.name || item.category || 'Location';

          return (
            <Marker
              key={item.id}
              position={[lat, lng]}
              icon={createCustomMarkerIcon(markerType, isSelected, isHovered)}
              eventHandlers={{
                click: () => onSelectItem && onSelectItem(item)
              }}
            >
              <Popup>
                <div className="p-1 text-xs font-sans space-y-2 text-stone-900 max-w-50 text-left">
                  <div className="font-bold text-sm leading-snug">{title}</div>
                  {item.category && (
                    <span className="inline-block bg-accent text-[#4A7C59] px-2 py-0.5 rounded text-[10px] font-bold">
                      {item.category}
                    </span>
                  )}
                  {item._dist && (
                    <p className="text-stone-500 text-[11px]">
                      {item._dist.toFixed(1)} km from your location
                    </p>
                  )}
                  <p className="text-stone-600 text-[11px] truncate">
                    {item.location?.address || item.address || 'Address listed'}
                  </p>
                  <button
                    onClick={() => onSelectItem && onSelectItem(item)}
                    className="w-full mt-1 bg-[#4A7C59] hover:bg-primary-hover text-white font-bold text-[11px] py-1.5 px-3 rounded-md transition-colors cursor-pointer"
                  >
                    🎯 Select &amp; View Route
                  </button>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
}
