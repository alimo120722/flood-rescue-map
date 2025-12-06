import { SOSAlert, RescueBoat, BoatRoute } from "@/types/rescue";

// Karachi area coordinates for realistic simulation
const KARACHI_CENTER = { lat: 24.8607, lon: 67.0011 };

export const initialSOSAlerts: SOSAlert[] = [
  {
    id: "SOS-001",
    village_id: "MZ-01",
    village_name: "Malir Town",
    lat: 24.8932,
    lon: 67.0876,
    type: "flood",
    severity: 3,
    people_affected: 45,
    timestamp: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
  },
  {
    id: "SOS-002",
    village_id: "KT-03",
    village_name: "Korangi Creek",
    lat: 24.8234,
    lon: 67.1234,
    type: "stranded",
    severity: 2,
    people_affected: 12,
    timestamp: new Date(Date.now() - 1000 * 60 * 8).toISOString(),
  },
  {
    id: "SOS-003",
    village_id: "LN-02",
    village_name: "Landhi Colony",
    lat: 24.8456,
    lon: 67.1567,
    type: "medical",
    severity: 3,
    people_affected: 8,
    timestamp: new Date(Date.now() - 1000 * 60 * 3).toISOString(),
  },
];

export const initialRescueBoats: RescueBoat[] = [
  {
    boat_id: "B-01",
    name: "Rescue Alpha",
    lat: 24.8712,
    lon: 67.0456,
    status: "available",
    capacity: 15,
    last_update: new Date().toISOString(),
  },
  {
    boat_id: "B-02",
    name: "Rescue Bravo",
    lat: 24.8523,
    lon: 67.0987,
    status: "available",
    capacity: 20,
    last_update: new Date().toISOString(),
  },
  {
    boat_id: "B-03",
    name: "Rescue Charlie",
    lat: 24.8845,
    lon: 67.1123,
    status: "responding",
    capacity: 12,
    last_update: new Date().toISOString(),
  },
  {
    boat_id: "B-04",
    name: "Rescue Delta",
    lat: 24.8321,
    lon: 67.0678,
    status: "available",
    capacity: 18,
    last_update: new Date().toISOString(),
  },
  {
    boat_id: "B-05",
    name: "Rescue Echo",
    lat: 24.8654,
    lon: 67.1345,
    status: "returning",
    capacity: 15,
    last_update: new Date().toISOString(),
  },
];

export const boatRoutes: BoatRoute[] = [
  {
    boat_id: "B-01",
    waypoints: [
      { lat: 24.8712, lon: 67.0456 },
      { lat: 24.8752, lon: 67.0556 },
      { lat: 24.8792, lon: 67.0656 },
      { lat: 24.8752, lon: 67.0756 },
      { lat: 24.8712, lon: 67.0656 },
      { lat: 24.8672, lon: 67.0556 },
    ],
    currentIndex: 0,
    speed: 0.003,
  },
  {
    boat_id: "B-02",
    waypoints: [
      { lat: 24.8523, lon: 67.0987 },
      { lat: 24.8563, lon: 67.1087 },
      { lat: 24.8603, lon: 67.1187 },
      { lat: 24.8563, lon: 67.1087 },
    ],
    currentIndex: 0,
    speed: 0.004,
  },
  {
    boat_id: "B-03",
    waypoints: [
      { lat: 24.8845, lon: 67.1123 },
      { lat: 24.8885, lon: 67.1023 },
      { lat: 24.8925, lon: 67.0923 },
      { lat: 24.8885, lon: 67.1023 },
    ],
    currentIndex: 0,
    speed: 0.005,
  },
  {
    boat_id: "B-04",
    waypoints: [
      { lat: 24.8321, lon: 67.0678 },
      { lat: 24.8361, lon: 67.0778 },
      { lat: 24.8401, lon: 67.0878 },
      { lat: 24.8441, lon: 67.0778 },
      { lat: 24.8401, lon: 67.0678 },
      { lat: 24.8361, lon: 67.0578 },
    ],
    currentIndex: 0,
    speed: 0.003,
  },
  {
    boat_id: "B-05",
    waypoints: [
      { lat: 24.8654, lon: 67.1345 },
      { lat: 24.8614, lon: 67.1445 },
      { lat: 24.8574, lon: 67.1545 },
      { lat: 24.8614, lon: 67.1445 },
    ],
    currentIndex: 0,
    speed: 0.004,
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
