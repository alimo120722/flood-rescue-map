import { useState, useCallback, useEffect, useRef } from "react";
import { SOSAlert, RescueBoat } from "@/types/rescue";
import {
  initialSOSAlerts,
  initialRescueBoats,
  generateRandomSOS,
} from "@/data/mockData";
import { calculateDistance } from "@/utils/distance";
import { getRoute, getNextPositionOnRoute, RoutePoint } from "@/utils/routing";

const BOAT_SPEED = 0.0015; // Speed per tick for route-based movement
const ARRIVAL_THRESHOLD = 0.002; // Distance to consider "arrived"

interface BoatRoute {
  boatId: string;
  route: RoutePoint[];
}

export function useRescueData() {
  const [sosAlerts, setSOSAlerts] = useState<SOSAlert[]>(initialSOSAlerts);
  const [boats, setBoats] = useState<RescueBoat[]>(initialRescueBoats);
  const [selectedSOS, setSelectedSOS] = useState<SOSAlert | null>(null);
  const [nearestBoat, setNearestBoat] = useState<RescueBoat | null>(null);
  const [isSimulating, setIsSimulating] = useState(true);
  const [boatRoutes, setBoatRoutes] = useState<Map<string, RoutePoint[]>>(new Map());
  
  const alertsRef = useRef<SOSAlert[]>(sosAlerts);
  const boatsRef = useRef<RescueBoat[]>(boats);
  const routesRef = useRef<Map<string, RoutePoint[]>>(boatRoutes);
  const pendingAssignments = useRef<Set<string>>(new Set());

  // Keep refs in sync
  useEffect(() => {
    alertsRef.current = sosAlerts;
  }, [sosAlerts]);

  useEffect(() => {
    boatsRef.current = boats;
  }, [boats]);

  useEffect(() => {
    routesRef.current = boatRoutes;
  }, [boatRoutes]);

  // Find nearest boat to selected SOS (for UI display only)
  useEffect(() => {
    if (!selectedSOS) {
      setNearestBoat(null);
      return;
    }

    const availableBoats = boats.filter((b) => b.status === "available");
    if (availableBoats.length === 0) {
      setNearestBoat(null);
      return;
    }

    let closest = availableBoats[0];
    let minDistance = calculateDistance(
      selectedSOS.lat,
      selectedSOS.lon,
      closest.lat,
      closest.lon
    );

    for (const boat of availableBoats.slice(1)) {
      const distance = calculateDistance(
        selectedSOS.lat,
        selectedSOS.lon,
        boat.lat,
        boat.lon
      );
      if (distance < minDistance) {
        minDistance = distance;
        closest = boat;
      }
    }

    setNearestBoat(closest);
  }, [selectedSOS, boats]);

  // Optimal boat-SOS assignment using Hungarian-style greedy matching
  const computeOptimalAssignments = useCallback(() => {
    const currentAlerts = alertsRef.current;
    const currentBoats = boatsRef.current;
    
    const availableBoats = currentBoats.filter((b) => b.status === "available");
    const assignedAlertIds = currentBoats
      .filter((b) => b.status === "responding" && b.targetSOSId)
      .map((b) => b.targetSOSId);
    
    const unassignedAlerts = currentAlerts.filter(
      (sos) => !assignedAlertIds.includes(sos.id) && !pendingAssignments.current.has(sos.id)
    );

    if (availableBoats.length === 0 || unassignedAlerts.length === 0) {
      return [];
    }

    // Create distance matrix
    const assignments: { boatId: string; alertId: string; distance: number }[] = [];
    
    // Calculate all distances
    const distanceMatrix: { boat: RescueBoat; alert: SOSAlert; distance: number }[] = [];
    for (const boat of availableBoats) {
      for (const alert of unassignedAlerts) {
        distanceMatrix.push({
          boat,
          alert,
          distance: calculateDistance(boat.lat, boat.lon, alert.lat, alert.lon),
        });
      }
    }

    // Sort by distance and greedily assign
    distanceMatrix.sort((a, b) => a.distance - b.distance);
    
    const usedBoats = new Set<string>();
    const usedAlerts = new Set<string>();

    for (const entry of distanceMatrix) {
      if (usedBoats.has(entry.boat.boat_id) || usedAlerts.has(entry.alert.id)) {
        continue;
      }
      
      assignments.push({
        boatId: entry.boat.boat_id,
        alertId: entry.alert.id,
        distance: entry.distance,
      });
      
      usedBoats.add(entry.boat.boat_id);
      usedAlerts.add(entry.alert.id);
      pendingAssignments.current.add(entry.alert.id);
    }

    return assignments;
  }, []);

  // Fetch routes for new assignments
  const fetchRouteForBoat = useCallback(async (boat: RescueBoat, targetLat: number, targetLon: number) => {
    const route = await getRoute(
      { lat: boat.lat, lon: boat.lon },
      { lat: targetLat, lon: targetLon }
    );
    
    if (route && route.coordinates.length > 0) {
      setBoatRoutes((prev) => {
        const newRoutes = new Map(prev);
        newRoutes.set(boat.boat_id, route.coordinates);
        return newRoutes;
      });
    }
  }, []);

  // Assignment effect - compute optimal assignments when boats become available or new alerts added
  useEffect(() => {
    if (!isSimulating) return;

    const assignmentInterval = setInterval(async () => {
      const assignments = computeOptimalAssignments();
      
      if (assignments.length === 0) return;

      for (const assignment of assignments) {
        const boat = boatsRef.current.find((b) => b.boat_id === assignment.boatId);
        const alert = alertsRef.current.find((a) => a.id === assignment.alertId);
        
        if (!boat || !alert) continue;

        console.log(`[DISPATCH] ${boat.name} responding to ${alert.id} (${assignment.distance.toFixed(2)} km)`);
        
        // Fetch route
        fetchRouteForBoat(boat, alert.lat, alert.lon);
        
        // Update boat status
        setBoats((prev) =>
          prev.map((b) =>
            b.boat_id === assignment.boatId
              ? {
                  ...b,
                  status: "responding" as const,
                  targetSOSId: assignment.alertId,
                  last_update: new Date().toISOString(),
                }
              : b
          )
        );
        
        pendingAssignments.current.delete(assignment.alertId);
      }
    }, 1000);

    return () => clearInterval(assignmentInterval);
  }, [isSimulating, computeOptimalAssignments, fetchRouteForBoat]);

  // Main simulation loop - move boats along routes
  useEffect(() => {
    if (!isSimulating) return;

    const interval = setInterval(() => {
      const currentAlerts = alertsRef.current;
      const currentRoutes = routesRef.current;
      const alertsToRemove: string[] = [];

      setBoats((prevBoats) => {
        return prevBoats.map((boat) => {
          // If boat is responding, move along route or directly to target
          if (boat.status === "responding" && boat.targetSOSId) {
            const targetSOS = currentAlerts.find((sos) => sos.id === boat.targetSOSId);

            if (!targetSOS) {
              // Alert was removed, return home
              fetchRouteForBoat(boat, boat.homeBase.lat, boat.homeBase.lon);
              return {
                ...boat,
                status: "returning" as const,
                targetSOSId: undefined,
                last_update: new Date().toISOString(),
              };
            }

            const route = currentRoutes.get(boat.boat_id);
            
            if (route && route.length > 0) {
              // Move along route
              const { newPos, remainingRoute } = getNextPositionOnRoute(
                { lat: boat.lat, lon: boat.lon },
                route,
                BOAT_SPEED
              );
              
              // Update route
              setBoatRoutes((prev) => {
                const newRoutes = new Map(prev);
                newRoutes.set(boat.boat_id, remainingRoute);
                return newRoutes;
              });

              const distToTarget = calculateDistance(newPos.lat, newPos.lon, targetSOS.lat, targetSOS.lon);
              
              if (distToTarget < ARRIVAL_THRESHOLD) {
                console.log(`[RESCUE] ${boat.name} arrived at ${targetSOS.id}`);
                alertsToRemove.push(targetSOS.id);
                fetchRouteForBoat({ ...boat, lat: targetSOS.lat, lon: targetSOS.lon }, boat.homeBase.lat, boat.homeBase.lon);
                return {
                  ...boat,
                  lat: targetSOS.lat,
                  lon: targetSOS.lon,
                  status: "returning" as const,
                  targetSOSId: undefined,
                  last_update: new Date().toISOString(),
                };
              }

              return {
                ...boat,
                lat: newPos.lat,
                lon: newPos.lon,
                last_update: new Date().toISOString(),
              };
            } else {
              // No route yet, move directly
              const dx = targetSOS.lon - boat.lon;
              const dy = targetSOS.lat - boat.lat;
              const distance = Math.sqrt(dx * dx + dy * dy);

              if (distance < ARRIVAL_THRESHOLD) {
                console.log(`[RESCUE] ${boat.name} arrived at ${targetSOS.id}`);
                alertsToRemove.push(targetSOS.id);
                fetchRouteForBoat(boat, boat.homeBase.lat, boat.homeBase.lon);
                return {
                  ...boat,
                  status: "returning" as const,
                  targetSOSId: undefined,
                  last_update: new Date().toISOString(),
                };
              }

              const ratio = BOAT_SPEED / distance;
              return {
                ...boat,
                lat: boat.lat + dy * ratio,
                lon: boat.lon + dx * ratio,
                last_update: new Date().toISOString(),
              };
            }
          }

          // If boat is returning, move along route or directly home
          if (boat.status === "returning") {
            const route = currentRoutes.get(boat.boat_id);
            
            if (route && route.length > 0) {
              const { newPos, remainingRoute } = getNextPositionOnRoute(
                { lat: boat.lat, lon: boat.lon },
                route,
                BOAT_SPEED
              );
              
              setBoatRoutes((prev) => {
                const newRoutes = new Map(prev);
                newRoutes.set(boat.boat_id, remainingRoute);
                return newRoutes;
              });

              const distToHome = calculateDistance(newPos.lat, newPos.lon, boat.homeBase.lat, boat.homeBase.lon);
              
              if (distToHome < ARRIVAL_THRESHOLD) {
                console.log(`[HOME] ${boat.name} returned to base`);
                return {
                  ...boat,
                  lat: boat.homeBase.lat,
                  lon: boat.homeBase.lon,
                  status: "available" as const,
                  last_update: new Date().toISOString(),
                };
              }

              return {
                ...boat,
                lat: newPos.lat,
                lon: newPos.lon,
                last_update: new Date().toISOString(),
              };
            } else {
              // Move directly towards home
              const dx = boat.homeBase.lon - boat.lon;
              const dy = boat.homeBase.lat - boat.lat;
              const distance = Math.sqrt(dx * dx + dy * dy);

              if (distance < ARRIVAL_THRESHOLD) {
                console.log(`[HOME] ${boat.name} returned to base`);
                return {
                  ...boat,
                  lat: boat.homeBase.lat,
                  lon: boat.homeBase.lon,
                  status: "available" as const,
                  last_update: new Date().toISOString(),
                };
              }

              const ratio = BOAT_SPEED / distance;
              return {
                ...boat,
                lat: boat.lat + dy * ratio,
                lon: boat.lon + dx * ratio,
                last_update: new Date().toISOString(),
              };
            }
          }

          return boat;
        });
      });

      // Remove resolved alerts after boat state update
      if (alertsToRemove.length > 0) {
        setSOSAlerts((prev) => {
          const newAlerts = prev.filter((a) => !alertsToRemove.includes(a.id));
          if (selectedSOS && alertsToRemove.includes(selectedSOS.id)) {
            setSelectedSOS(null);
          }
          return newAlerts;
        });
      }
    }, 300);

    return () => clearInterval(interval);
  }, [isSimulating, selectedSOS, fetchRouteForBoat]);

  const addSOS = useCallback(() => {
    const newSOS = generateRandomSOS();
    setSOSAlerts((prev) => [newSOS, ...prev]);
    console.log(`[NEW SOS] ${newSOS.id} at ${newSOS.village_name}`);
  }, []);

  const removeSOS = useCallback((id: string) => {
    setSOSAlerts((prev) => prev.filter((sos) => sos.id !== id));
    if (selectedSOS?.id === id) {
      setSelectedSOS(null);
    }
  }, [selectedSOS]);

  const assignBoat = useCallback((sosId: string, boatId: string) => {
    console.log(`[MANUAL DISPATCH] Assigning boat ${boatId} to SOS ${sosId}`);
    
    const boat = boatsRef.current.find((b) => b.boat_id === boatId);
    const alert = alertsRef.current.find((a) => a.id === sosId);
    
    if (boat && alert) {
      fetchRouteForBoat(boat, alert.lat, alert.lon);
    }
    
    setBoats((prev) =>
      prev.map((boat) =>
        boat.boat_id === boatId
          ? { ...boat, status: "responding" as const, targetSOSId: sosId }
          : boat
      )
    );
  }, [fetchRouteForBoat]);

  const toggleSimulation = useCallback(() => {
    setIsSimulating((prev) => !prev);
  }, []);

  return {
    sosAlerts,
    boats,
    selectedSOS,
    setSelectedSOS,
    nearestBoat,
    isSimulating,
    boatRoutes,
    addSOS,
    removeSOS,
    assignBoat,
    toggleSimulation,
  };
}
