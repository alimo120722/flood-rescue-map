import { useEffect, useMemo } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap, Polyline, Circle } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { SOSAlert, RescueBoat, FloodZone, SafePoint } from "@/types/rescue";
import { calculateDistance, formatDistance, estimateArrivalTime } from "@/utils/distance";
import { RoutePoint } from "@/utils/routing";

interface RescueMapProps {
  sosAlerts: SOSAlert[];
  boats: RescueBoat[];
  selectedSOS: SOSAlert | null;
  nearestBoat: RescueBoat | null;
  boatRoutes: Map<string, RoutePoint[]>;
  floodZones: FloodZone[];
  safePoints: SafePoint[];
  onSelectSOS: (sos: SOSAlert) => void;
}

// Custom SOS marker icon
const createSOSIcon = (isSelected: boolean, isMovingToSafe: boolean = false) => {
  const baseColor = isMovingToSafe ? "hsl(38 92% 50%)" : "hsl(0 84% 60%)";
  const borderColor = isMovingToSafe ? "hsl(38 92% 70%)" : "hsl(0 84% 75%)";
  
  return L.divIcon({
    className: "custom-marker",
    html: `
      <div class="custom-sos-marker ${isSelected ? "selected" : ""}" style="background: ${baseColor}; border-color: ${borderColor};">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"/>
          <path d="M12 9v4"/>
          <path d="M12 17h.01"/>
        </svg>
      </div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  });
};

// Safe point marker
const createSafePointIcon = () => {
  return L.divIcon({
    className: "custom-marker",
    html: `
      <div class="safe-point-marker">
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="m3 11 18-5v12L3 14v-3z"/>
          <path d="M11.6 16.8a3 3 0 1 1-5.8-1.6"/>
        </svg>
      </div>
    `,
    iconSize: [36, 36],
    iconAnchor: [18, 18],
  });
};

// Custom boat marker icon with status-based colors
const createBoatIcon = (status: RescueBoat["status"], isNearest: boolean) => {
  const colorMap = {
    available: "#14b8a6",
    responding: "#f59e0b",
    returning: "#6b7280",
  };
  const color = colorMap[status];
  
  return L.divIcon({
    className: "custom-marker",
    html: `
      <div class="custom-boat-marker ${isNearest ? "highlighted" : ""}" style="background: ${color}; border-color: ${color};">
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M2 21c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1 .6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1"/>
          <path d="M19.38 20A11.6 11.6 0 0 0 21 14l-9-4-9 4c0 2.9.94 5.34 2.81 7.76"/>
          <path d="M19 13V7a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2v6"/>
          <path d="M12 10v4"/>
          <path d="M12 2v3"/>
        </svg>
      </div>
    `,
    iconSize: isNearest ? [34, 34] : [28, 28],
    iconAnchor: isNearest ? [17, 17] : [14, 14],
  });
};

function MapController({ selectedSOS }: { selectedSOS: SOSAlert | null }) {
  const map = useMap();

  useEffect(() => {
    if (selectedSOS) {
      map.flyTo([selectedSOS.lat, selectedSOS.lon], 14, { duration: 1 });
    }
  }, [selectedSOS, map]);

  return null;
}

export function RescueMap({
  sosAlerts,
  boats,
  selectedSOS,
  nearestBoat,
  boatRoutes,
  floodZones,
  safePoints,
  onSelectSOS,
}: RescueMapProps) {
  const mapCenter: [number, number] = [24.8607, 67.0811];

  const hasGiantFlood = floodZones.some(z => z.isGiantFlood);

  // Connection lines between responding boats and their targets
  const boatConnections = useMemo(() => {
    return boats
      .filter((boat) => boat.status === "responding" && (boat.targetSOSId || boat.targetSafePointId))
      .map((boat) => {
        let targetLat: number, targetLon: number, targetId: string;
        
        if (boat.targetSafePointId) {
          const safePoint = safePoints.find(sp => sp.id === boat.targetSafePointId);
          if (!safePoint) return null;
          targetLat = safePoint.lat;
          targetLon = safePoint.lon;
          targetId = `SP: ${safePoint.assignedAlertIds.length} alerts`;
        } else {
          const targetSOS = sosAlerts.find((sos) => sos.id === boat.targetSOSId);
          if (!targetSOS) return null;
          targetLat = targetSOS.lat;
          targetLon = targetSOS.lon;
          targetId = targetSOS.id;
        }
        
        const distance = calculateDistance(boat.lat, boat.lon, targetLat, targetLon);
        const eta = estimateArrivalTime(distance);
        
        const route = boatRoutes.get(boat.boat_id);
        const routePositions: [number, number][] = route && route.length > 0
          ? [[boat.lat, boat.lon], ...route.map(p => [p.lat, p.lon] as [number, number])]
          : [[boat.lat, boat.lon], [targetLat, targetLon]];
        
        return {
          boatId: boat.boat_id,
          boatName: boat.name,
          targetId,
          routePositions,
          distance,
          eta,
        };
      })
      .filter(Boolean);
  }, [boats, sosAlerts, safePoints, boatRoutes]);

  // Lines from alerts moving to safe points
  const alertToSafePointLines = useMemo(() => {
    return sosAlerts
      .filter(alert => alert.safePointId && !alert.reachedSafePoint)
      .map(alert => {
        const safePoint = safePoints.find(sp => sp.id === alert.safePointId);
        if (!safePoint) return null;
        
        const currentLat = alert.currentLat ?? alert.lat;
        const currentLon = alert.currentLon ?? alert.lon;
        
        return {
          alertId: alert.id,
          positions: [[currentLat, currentLon], [safePoint.lat, safePoint.lon]] as [number, number][],
        };
      })
      .filter(Boolean);
  }, [sosAlerts, safePoints]);

  const selectedConnection = useMemo(() => {
    if (!selectedSOS || !nearestBoat) return null;
    return [
      [selectedSOS.lat, selectedSOS.lon] as [number, number],
      [nearestBoat.lat, nearestBoat.lon] as [number, number],
    ];
  }, [selectedSOS, nearestBoat]);

  return (
    <div className="relative w-full h-full">
      <MapContainer
        center={mapCenter}
        zoom={12}
        className="w-full h-full rescue-map-container"
        zoomControl={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://carto.com/">CARTO</a>'
          url={hasGiantFlood 
            ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            : "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          }
        />

        <MapController selectedSOS={selectedSOS} />

        {/* Flood zone circles (only for regional floods, not giant) */}
        {floodZones.filter(z => !z.isGiantFlood).map((zone) => (
          <Circle
            key={zone.id}
            center={[zone.lat, zone.lon]}
            radius={zone.radius * 1000}
            pathOptions={{
              fillColor: "#3b82f6",
              fillOpacity: 0.2,
              color: "#1d4ed8",
              weight: 2,
              opacity: 0.6,
            }}
          />
        ))}

        {/* Flooded streets overlay for giant flood */}
        {hasGiantFlood && (
          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            opacity={0.3}
            className="flood-overlay"
          />
        )}

        {/* Alert to safe point lines */}
        {alertToSafePointLines.map((line) => line && (
          <Polyline
            key={`alert-sp-${line.alertId}`}
            positions={line.positions}
            pathOptions={{
              color: "#fbbf24",
              weight: 2,
              opacity: 0.5,
              dashArray: "5, 5",
            }}
          />
        ))}

        {/* Route lines for responding boats */}
        {boatConnections.map((conn) => conn && (
          <Polyline
            key={`route-${conn.boatId}`}
            positions={conn.routePositions}
            pathOptions={{
              color: "#f59e0b",
              weight: 3,
              opacity: 0.85,
            }}
          />
        ))}

        {/* Selected SOS to nearest available boat */}
        {selectedConnection && (
          <Polyline
            positions={selectedConnection}
            pathOptions={{
              color: "#14b8a6",
              weight: 3,
              dashArray: "10, 10",
              opacity: 0.8,
            }}
          />
        )}

        {/* Safe Point Markers */}
        {safePoints.map((sp) => (
          <Marker
            key={sp.id}
            position={[sp.lat, sp.lon]}
            icon={createSafePointIcon()}
          >
            <Popup className="rescue-popup">
              <div className="text-sm">
                <p className="font-bold text-green-400">Safe Point</p>
                <p className="text-xs opacity-70">{sp.id}</p>
                <p className="mt-1">{sp.assignedAlertIds.length} alerts assigned</p>
                {sp.assignedBoatId && (
                  <p className="text-amber-400 mt-1">Boat: {sp.assignedBoatId}</p>
                )}
              </div>
            </Popup>
          </Marker>
        ))}

        {/* SOS Markers */}
        {sosAlerts.map((sos) => {
          const displayLat = sos.currentLat ?? sos.lat;
          const displayLon = sos.currentLon ?? sos.lon;
          
          return (
            <Marker
              key={sos.id}
              position={[displayLat, displayLon]}
              icon={createSOSIcon(selectedSOS?.id === sos.id, !!sos.safePointId)}
              eventHandlers={{
                click: () => onSelectSOS(sos),
              }}
            >
              <Popup className="rescue-popup">
                <div className="text-sm">
                  <p className="font-bold text-danger">{sos.village_name}</p>
                  <p className="text-xs opacity-70">{sos.id}</p>
                  <p className="mt-1">{sos.people_affected} people affected</p>
                  {sos.safePointId && (
                    <p className="text-amber-400 mt-1">
                      {sos.reachedSafePoint ? "At safe point" : "Moving to safe point"}
                    </p>
                  )}
                </div>
              </Popup>
            </Marker>
          );
        })}

        {/* Boat Markers */}
        {boats.map((boat) => (
          <Marker
            key={boat.boat_id}
            position={[boat.lat, boat.lon]}
            icon={createBoatIcon(boat.status, nearestBoat?.boat_id === boat.boat_id)}
          >
            <Popup className="rescue-popup">
              <div className="text-sm">
                <p className="font-bold text-rescue">{boat.name}</p>
                <p className="text-xs opacity-70">{boat.boat_id}</p>
                <p className="mt-1 capitalize">Status: {boat.status}</p>
                <p>Capacity: {boat.capacity}</p>
                {boat.status === "responding" && (boat.targetSOSId || boat.targetSafePointId) && (
                  <p className="mt-1 text-amber-400 font-medium">
                    Target: {boat.targetSOSId || boat.targetSafePointId}
                  </p>
                )}
                {selectedSOS && (
                  <p className="mt-1 font-medium">
                    Distance: {formatDistance(calculateDistance(selectedSOS.lat, selectedSOS.lon, boat.lat, boat.lon))}
                  </p>
                )}
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>

      {/* ETA Labels for active rescues */}
      <div className="absolute top-6 left-6 z-[2000] space-y-2 max-h-[200px] overflow-y-auto pointer-events-none">
        {boatConnections.map((conn) => conn && (
          <div
            key={`eta-${conn.boatId}`}
            className="bg-warning/90 backdrop-blur-sm text-warning-foreground rounded-lg px-3 py-2 text-sm shadow-lg"
          >
            <span className="font-semibold">{conn.boatName}</span>
            <span className="mx-2">→</span>
            <span className="opacity-80">{conn.targetId}</span>
            <span className="ml-3 font-bold">{formatDistance(conn.distance)}</span>
            <span className="ml-2 text-xs opacity-80">ETA: {conn.eta}</span>
          </div>
        ))}
      </div>

      {/* Map Legend */}
      <div className="absolute bottom-6 right-6 bg-card/95 backdrop-blur-sm border border-border rounded-lg p-3 z-[2000]">
        <p className="text-xs font-semibold mb-2 text-muted-foreground uppercase tracking-wide">Legend</p>
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-danger" />
            <span className="text-xs">SOS Alert</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-warning" />
            <span className="text-xs">Alert → Safe Point</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-green-500" />
            <span className="text-xs">Safe Point</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-rescue" />
            <span className="text-xs">Available Boat</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full" style={{ background: "#f59e0b" }} />
            <span className="text-xs">Responding</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-muted-foreground" />
            <span className="text-xs">Returning</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-blue-500/50 border border-blue-600" />
            <span className="text-xs">Flood Zone</span>
          </div>
        </div>
      </div>

      {/* Distance indicator when SOS selected */}
      {selectedSOS && nearestBoat && (
        <div className="absolute top-6 left-1/2 -translate-x-1/2 bg-rescue/95 backdrop-blur-sm text-rescue-foreground rounded-lg px-4 py-2 z-[2000] flex items-center gap-3">
          <span className="text-sm font-medium">Nearest: {nearestBoat.name}</span>
          <span className="font-bold">
            {formatDistance(calculateDistance(selectedSOS.lat, selectedSOS.lon, nearestBoat.lat, nearestBoat.lon))}
          </span>
          <span className="text-xs opacity-80">
            ETA: {estimateArrivalTime(calculateDistance(selectedSOS.lat, selectedSOS.lon, nearestBoat.lat, nearestBoat.lon))}
          </span>
        </div>
      )}

      {/* Flood status indicator */}
      {floodZones.length > 0 && (
        <div className="absolute top-6 right-6 z-[2000]">
          <div className={`px-4 py-2 rounded-lg backdrop-blur-sm ${hasGiantFlood ? 'bg-blue-900/80 text-blue-100' : 'bg-blue-600/80 text-blue-50'}`}>
            <span className="font-semibold">
              {hasGiantFlood ? '🌊 GIANT FLOOD ACTIVE' : `🌧️ ${floodZones.length} Flood Zone${floodZones.length > 1 ? 's' : ''}`}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
