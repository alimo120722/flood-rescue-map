import { useEffect, useMemo } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap, Polyline } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { SOSAlert, RescueBoat } from "@/types/rescue";
import { calculateDistance, formatDistance, estimateArrivalTime } from "@/utils/distance";

interface RescueMapProps {
  sosAlerts: SOSAlert[];
  boats: RescueBoat[];
  selectedSOS: SOSAlert | null;
  nearestBoat: RescueBoat | null;
  onSelectSOS: (sos: SOSAlert) => void;
}

// Custom SOS marker icon
const createSOSIcon = (isSelected: boolean) => {
  return L.divIcon({
    className: "custom-marker",
    html: `
      <div class="custom-sos-marker ${isSelected ? "selected" : ""}">
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

// Custom boat marker icon with status-based colors
const createBoatIcon = (status: RescueBoat["status"], isNearest: boolean) => {
  const colorMap = {
    available: "#14b8a6",    // Teal
    responding: "#f59e0b",   // Amber
    returning: "#6b7280",    // Gray
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

// Component to handle map view changes
function MapController({ selectedSOS }: { selectedSOS: SOSAlert | null }) {
  const map = useMap();

  useEffect(() => {
    if (selectedSOS) {
      map.flyTo([selectedSOS.lat, selectedSOS.lon], 14, {
        duration: 1,
      });
    }
  }, [selectedSOS, map]);

  return null;
}

export function RescueMap({
  sosAlerts,
  boats,
  selectedSOS,
  nearestBoat,
  onSelectSOS,
}: RescueMapProps) {
  const mapCenter: [number, number] = [24.8607, 67.0811];

  // Calculate connection lines between responding boats and their target alerts
  const boatConnections = useMemo(() => {
    return boats
      .filter((boat) => boat.status === "responding" && boat.targetSOSId)
      .map((boat) => {
        const targetSOS = sosAlerts.find((sos) => sos.id === boat.targetSOSId);
        if (!targetSOS) return null;
        
        const distance = calculateDistance(boat.lat, boat.lon, targetSOS.lat, targetSOS.lon);
        const eta = estimateArrivalTime(distance);
        
        return {
          boatId: boat.boat_id,
          boatName: boat.name,
          sosId: targetSOS.id,
          line: [
            [boat.lat, boat.lon] as [number, number],
            [targetSOS.lat, targetSOS.lon] as [number, number],
          ],
          distance,
          eta,
          midpoint: {
            lat: (boat.lat + targetSOS.lat) / 2,
            lon: (boat.lon + targetSOS.lon) / 2,
          },
        };
      })
      .filter(Boolean);
  }, [boats, sosAlerts]);

  // Line between selected SOS and nearest available boat
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
        className="w-full h-full"
        zoomControl={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://carto.com/">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        />

        <MapController selectedSOS={selectedSOS} />

        {/* Connection lines for responding boats */}
        {boatConnections.map((conn) => conn && (
          <Polyline
            key={`line-${conn.boatId}`}
            positions={conn.line}
            pathOptions={{
              color: "#f59e0b",
              weight: 2,
              dashArray: "8, 8",
              opacity: 0.9,
            }}
          />
        ))}

        {/* Selected SOS to nearest available boat connection */}
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

        {/* SOS Markers */}
        {sosAlerts.map((sos) => (
          <Marker
            key={sos.id}
            position={[sos.lat, sos.lon]}
            icon={createSOSIcon(selectedSOS?.id === sos.id)}
            eventHandlers={{
              click: () => onSelectSOS(sos),
            }}
          >
            <Popup>
              <div className="text-sm">
                <p className="font-bold text-danger">{sos.village_name}</p>
                <p className="text-xs opacity-70">{sos.id}</p>
                <p className="mt-1">{sos.people_affected} people affected</p>
              </div>
            </Popup>
          </Marker>
        ))}

        {/* Boat Markers */}
        {boats.map((boat) => (
          <Marker
            key={boat.boat_id}
            position={[boat.lat, boat.lon]}
            icon={createBoatIcon(boat.status, nearestBoat?.boat_id === boat.boat_id)}
          >
            <Popup>
              <div className="text-sm">
                <p className="font-bold text-rescue">{boat.name}</p>
                <p className="text-xs opacity-70">{boat.boat_id}</p>
                <p className="mt-1 capitalize">Status: {boat.status}</p>
                <p>Capacity: {boat.capacity}</p>
                {boat.status === "responding" && boat.targetSOSId && (
                  <p className="mt-1 text-amber-600 font-medium">
                    Target: {boat.targetSOSId}
                  </p>
                )}
                {selectedSOS && (
                  <p className="mt-1 font-medium">
                    Distance:{" "}
                    {formatDistance(
                      calculateDistance(
                        selectedSOS.lat,
                        selectedSOS.lon,
                        boat.lat,
                        boat.lon
                      )
                    )}
                  </p>
                )}
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>

      {/* ETA Labels for active rescues */}
      <div className="absolute top-6 left-6 z-[1000] space-y-2 max-h-[200px] overflow-y-auto">
        {boatConnections.map((conn) => conn && (
          <div
            key={`eta-${conn.boatId}`}
            className="bg-warning/90 backdrop-blur-sm text-warning-foreground rounded-lg px-3 py-2 text-sm shadow-lg"
          >
            <span className="font-semibold">{conn.boatName}</span>
            <span className="mx-2">→</span>
            <span className="opacity-80">{conn.sosId}</span>
            <span className="ml-3 font-bold">{formatDistance(conn.distance)}</span>
            <span className="ml-2 text-xs opacity-80">ETA: {conn.eta}</span>
          </div>
        ))}
      </div>

      {/* Map Legend */}
      <div className="absolute bottom-6 right-6 bg-card/95 backdrop-blur-sm border border-border rounded-lg p-3 z-[1000]">
        <p className="text-xs font-semibold mb-2 text-muted-foreground uppercase tracking-wide">
          Legend
        </p>
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-danger" />
            <span className="text-xs">SOS Alert</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-rescue" />
            <span className="text-xs">Available Boat</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-warning" />
            <span className="text-xs">Responding</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-muted-foreground" />
            <span className="text-xs">Returning</span>
          </div>
        </div>
      </div>

      {/* Distance indicator when SOS selected */}
      {selectedSOS && nearestBoat && (
        <div className="absolute top-6 left-1/2 -translate-x-1/2 bg-rescue/95 backdrop-blur-sm text-rescue-foreground rounded-lg px-4 py-2 z-[1000] flex items-center gap-3">
          <span className="text-sm font-medium">
            Nearest: {nearestBoat.name}
          </span>
          <span className="font-bold">
            {formatDistance(
              calculateDistance(
                selectedSOS.lat,
                selectedSOS.lon,
                nearestBoat.lat,
                nearestBoat.lon
              )
            )}
          </span>
          <span className="text-xs opacity-80">
            ETA:{" "}
            {estimateArrivalTime(
              calculateDistance(
                selectedSOS.lat,
                selectedSOS.lon,
                nearestBoat.lat,
                nearestBoat.lon
              )
            )}
          </span>
        </div>
      )}
    </div>
  );
}
