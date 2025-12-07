import { SOSAlert, RescueBoat, FloodZone } from "@/types/rescue";

// Karachi area coordinates for realistic simulation
export const KARACHI_CENTER = { lat: 24.8607, lon: 67.0811 };
export const KARACHI_BOUNDS = {
  north: 24.95,
  south: 24.75,
  east: 67.25,
  west: 66.90,
};

// Start with no alerts - only add via button
export const initialSOSAlerts: SOSAlert[] = [];

export const initialRescueBoats: RescueBoat[] = [
  {
    boat_id: "B-01",
    name: "Rescue Alpha",
    lat: 24.8712,
    lon: 67.0456,
    status: "available",
    capacity: 15,
    last_update: new Date().toISOString(),
    homeBase: { lat: 24.8712, lon: 67.0456 },
  },
  {
    boat_id: "B-02",
    name: "Rescue Bravo",
    lat: 24.8523,
    lon: 67.0987,
    status: "available",
    capacity: 20,
    last_update: new Date().toISOString(),
    homeBase: { lat: 24.8523, lon: 67.0987 },
  },
  {
    boat_id: "B-03",
    name: "Rescue Charlie",
    lat: 24.8845,
    lon: 67.1123,
    status: "available",
    capacity: 12,
    last_update: new Date().toISOString(),
    homeBase: { lat: 24.8845, lon: 67.1123 },
  },
  {
    boat_id: "B-04",
    name: "Rescue Delta",
    lat: 24.8321,
    lon: 67.0678,
    status: "available",
    capacity: 18,
    last_update: new Date().toISOString(),
    homeBase: { lat: 24.8321, lon: 67.0678 },
  },
  {
    boat_id: "B-05",
    name: "Rescue Echo",
    lat: 24.8654,
    lon: 67.1345,
    status: "available",
    capacity: 15,
    last_update: new Date().toISOString(),
    homeBase: { lat: 24.8654, lon: 67.1345 },
  },
];

export const villageNames = [
  "Gadap Town",
  "Bin Qasim",
  "Shah Faisal",
  "Gulshan-e-Iqbal",
  "Liaquatabad",
  "Nazimabad",
  "New Karachi",
  "Orangi Town",
  "Saddar",
  "Jamshed Town",
];

export const alertTypes: SOSAlert["type"][] = ["flood", "stranded", "medical", "supplies"];

export function generateRandomSOSInFloodZone(floodZones: FloodZone[]): SOSAlert | null {
  if (floodZones.length === 0) return null;
  
  // Pick a random flood zone
  const zone = floodZones[Math.floor(Math.random() * floodZones.length)];
  
  // Generate random point within the flood zone
  const angle = Math.random() * 2 * Math.PI;
  const radiusKm = Math.random() * zone.radius * 0.9; // Stay within 90% of radius
  
  // Convert km to degrees (approximate)
  const latOffset = (radiusKm / 111) * Math.cos(angle);
  const lonOffset = (radiusKm / (111 * Math.cos(zone.lat * Math.PI / 180))) * Math.sin(angle);
  
  const lat = zone.lat + latOffset;
  const lon = zone.lon + lonOffset;
  
  const id = `SOS-${String(Date.now()).slice(-6)}-${Math.floor(Math.random() * 1000)}`;
  const villageIndex = Math.floor(Math.random() * villageNames.length);
  
  return {
    id,
    village_id: `V-${String(villageIndex).padStart(2, "0")}`,
    village_name: villageNames[villageIndex],
    lat,
    lon,
    type: alertTypes[Math.floor(Math.random() * alertTypes.length)],
    severity: (Math.floor(Math.random() * 3) + 1) as 1 | 2 | 3,
    people_affected: Math.floor(Math.random() * 50) + 5,
    timestamp: new Date().toISOString(),
  };
}

export function generateMultipleSOSAlerts(floodZones: FloodZone[], count: number): SOSAlert[] {
  const alerts: SOSAlert[] = [];
  for (let i = 0; i < count; i++) {
    const alert = generateRandomSOSInFloodZone(floodZones);
    if (alert) {
      // Add small delay to ensure unique IDs
      alert.id = `SOS-${Date.now()}-${i}`;
      alerts.push(alert);
    }
  }
  return alerts;
}

export function isPointInFloodZone(lat: number, lon: number, floodZones: FloodZone[]): boolean {
  for (const zone of floodZones) {
    if (zone.isGiantFlood) return true; // Giant flood covers everything
    
    // Calculate distance in km
    const R = 6371;
    const dLat = (lat - zone.lat) * Math.PI / 180;
    const dLon = (lon - zone.lon) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(zone.lat * Math.PI / 180) * Math.cos(lat * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distance = R * c;
    
    if (distance <= zone.radius) return true;
  }
  return false;
}
