export interface SOSAlert {
  id: string;
  village_id: string;
  village_name: string;
  lat: number;
  lon: number;
  type: "flood" | "stranded" | "medical" | "supplies";
  severity: 1 | 2 | 3; // 1 = low, 3 = critical
  people_affected: number;
  timestamp: string;
}

export interface RescueBoat {
  boat_id: string;
  name: string;
  lat: number;
  lon: number;
  status: "available" | "responding" | "returning";
  capacity: number;
  last_update: string;
  targetSOSId?: string; // ID of the SOS alert the boat is responding to
  homeBase: { lat: number; lon: number }; // Where the boat returns to
}

export interface BoatRoute {
  boat_id: string;
  waypoints: { lat: number; lon: number }[];
  currentIndex: number;
  speed: number; // km per update cycle
}
