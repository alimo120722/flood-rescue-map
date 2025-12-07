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
  safePointId?: string; // ID of the safe point this alert is moving towards
  currentLat?: number; // Current position while moving to safe point
  currentLon?: number;
  reachedSafePoint?: boolean; // Has this alert reached the safe point
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
  targetSafePointId?: string; // ID of the safe point the boat is going to
  homeBase: { lat: number; lon: number }; // Where the boat returns to
}

export interface BoatRoute {
  boat_id: string;
  waypoints: { lat: number; lon: number }[];
  currentIndex: number;
  speed: number; // km per update cycle
}

export interface FloodZone {
  id: string;
  lat: number;
  lon: number;
  radius: number; // in kilometers
  isGiantFlood: boolean;
}

export interface SafePoint {
  id: string;
  lat: number;
  lon: number;
  assignedAlertIds: string[];
  assignedBoatId?: string;
}
