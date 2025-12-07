import { SOSAlert, RescueBoat } from "@/types/rescue";

// Karachi area coordinates for realistic simulation
const KARACHI_CENTER = { lat: 24.8607, lon: 67.0011 };

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

export function generateRandomSOS(): SOSAlert {
  const id = `SOS-${String(Date.now()).slice(-6)}`;
  const villageIndex = Math.floor(Math.random() * villageNames.length);
  
  return {
    id,
    village_id: `V-${String(villageIndex).padStart(2, "0")}`,
    village_name: villageNames[villageIndex],
    lat: KARACHI_CENTER.lat + (Math.random() - 0.5) * 0.1,
    lon: KARACHI_CENTER.lon + (Math.random() - 0.5) * 0.2,
    type: alertTypes[Math.floor(Math.random() * alertTypes.length)],
    severity: (Math.floor(Math.random() * 3) + 1) as 1 | 2 | 3,
    people_affected: Math.floor(Math.random() * 50) + 5,
    timestamp: new Date().toISOString(),
  };
}
