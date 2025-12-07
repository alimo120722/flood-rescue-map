import { useState, useCallback, useEffect, useRef } from "react";
import { SOSAlert, RescueBoat, FloodZone, SafePoint } from "@/types/rescue";
import {
  initialSOSAlerts,
  initialRescueBoats,
  generateRandomSOSInFloodZone,
  generateMultipleSOSAlerts,
  isPointInFloodZone,
  KARACHI_CENTER,
  KARACHI_BOUNDS,
} from "@/data/mockData";
import { calculateDistance } from "@/utils/distance";
import { getRoute, getNextPositionOnRoute, RoutePoint } from "@/utils/routing";

const BOAT_SPEED = 0.0015;
const ARRIVAL_THRESHOLD = 0.002;
const PROXIMITY_THRESHOLD_KM = 1; // 1km for grouping alerts

export function useRescueData() {
  const [sosAlerts, setSOSAlerts] = useState<SOSAlert[]>(initialSOSAlerts);
  const [boats, setBoats] = useState<RescueBoat[]>(initialRescueBoats);
  const [selectedSOS, setSelectedSOS] = useState<SOSAlert | null>(null);
  const [nearestBoat, setNearestBoat] = useState<RescueBoat | null>(null);
  const [isSimulating, setIsSimulating] = useState(true);
  const [boatRoutes, setBoatRoutes] = useState<Map<string, RoutePoint[]>>(new Map());
  const [floodZones, setFloodZones] = useState<FloodZone[]>([]);
  const [safePoints, setSafePoints] = useState<SafePoint[]>([]);
  
  const alertsRef = useRef<SOSAlert[]>(sosAlerts);
  const boatsRef = useRef<RescueBoat[]>(boats);
  const routesRef = useRef<Map<string, RoutePoint[]>>(boatRoutes);
  const pendingAssignments = useRef<Set<string>>(new Set());
  const safePointsRef = useRef<SafePoint[]>(safePoints);

  useEffect(() => { alertsRef.current = sosAlerts; }, [sosAlerts]);
  useEffect(() => { boatsRef.current = boats; }, [boats]);
  useEffect(() => { routesRef.current = boatRoutes; }, [boatRoutes]);
  useEffect(() => { safePointsRef.current = safePoints; }, [safePoints]);

  // Find nearest boat to selected SOS
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
    let minDistance = calculateDistance(selectedSOS.lat, selectedSOS.lon, closest.lat, closest.lon);

    for (const boat of availableBoats.slice(1)) {
      const distance = calculateDistance(selectedSOS.lat, selectedSOS.lon, boat.lat, boat.lon);
      if (distance < minDistance) {
        minDistance = distance;
        closest = boat;
      }
    }

    setNearestBoat(closest);
  }, [selectedSOS, boats]);

  // Group nearby alerts and create safe points
  const groupNearbyAlerts = useCallback((alerts: SOSAlert[]): SafePoint[] => {
    const ungroupedAlerts = alerts.filter(a => !a.safePointId);
    const newSafePoints: SafePoint[] = [];
    const processedIds = new Set<string>();

    for (const alert of ungroupedAlerts) {
      if (processedIds.has(alert.id)) continue;

      const nearbyAlerts = ungroupedAlerts.filter(other => {
        if (other.id === alert.id || processedIds.has(other.id)) return false;
        const distance = calculateDistance(alert.lat, alert.lon, other.lat, other.lon);
        return distance <= PROXIMITY_THRESHOLD_KM;
      });

      if (nearbyAlerts.length > 0) {
        // Create a safe point as the centroid of all nearby alerts
        const allAlerts = [alert, ...nearbyAlerts];
        const centroidLat = allAlerts.reduce((sum, a) => sum + a.lat, 0) / allAlerts.length;
        const centroidLon = allAlerts.reduce((sum, a) => sum + a.lon, 0) / allAlerts.length;

        const safePoint: SafePoint = {
          id: `SP-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          lat: centroidLat,
          lon: centroidLon,
          assignedAlertIds: allAlerts.map(a => a.id),
        };

        newSafePoints.push(safePoint);
        allAlerts.forEach(a => processedIds.add(a.id));
      }
    }

    return newSafePoints;
  }, []);

  // Optimal boat-SOS assignment
  const computeOptimalAssignments = useCallback(() => {
    const currentAlerts = alertsRef.current;
    const currentBoats = boatsRef.current;
    const currentSafePoints = safePointsRef.current;
    
    const availableBoats = currentBoats.filter((b) => b.status === "available");
    const assignedAlertIds = currentBoats
      .filter((b) => (b.status === "responding" || b.status === "returning") && b.targetSOSId)
      .map((b) => b.targetSOSId);
    const assignedSafePointIds = currentBoats
      .filter(b => b.targetSafePointId)
      .map(b => b.targetSafePointId);
    
    // Get unassigned safe points first
    const unassignedSafePoints = currentSafePoints.filter(
      sp => !assignedSafePointIds.includes(sp.id) && !sp.assignedBoatId
    );
    
    // Get unassigned individual alerts (not part of a safe point)
    const unassignedAlerts = currentAlerts.filter(
      (sos) => !sos.safePointId && !assignedAlertIds.includes(sos.id) && !pendingAssignments.current.has(sos.id)
    );

    if (availableBoats.length === 0 || (unassignedAlerts.length === 0 && unassignedSafePoints.length === 0)) {
      return { alertAssignments: [], safePointAssignments: [] };
    }

    const alertAssignments: { boatId: string; alertId: string; distance: number }[] = [];
    const safePointAssignments: { boatId: string; safePointId: string; distance: number }[] = [];
    
    // Build combined distance matrix
    const distanceMatrix: { boat: RescueBoat; targetId: string; type: 'alert' | 'safePoint'; lat: number; lon: number; distance: number }[] = [];
    
    for (const boat of availableBoats) {
      for (const alert of unassignedAlerts) {
        distanceMatrix.push({
          boat,
          targetId: alert.id,
          type: 'alert',
          lat: alert.lat,
          lon: alert.lon,
          distance: calculateDistance(boat.lat, boat.lon, alert.lat, alert.lon),
        });
      }
      for (const sp of unassignedSafePoints) {
        distanceMatrix.push({
          boat,
          targetId: sp.id,
          type: 'safePoint',
          lat: sp.lat,
          lon: sp.lon,
          distance: calculateDistance(boat.lat, boat.lon, sp.lat, sp.lon),
        });
      }
    }

    distanceMatrix.sort((a, b) => a.distance - b.distance);
    
    const usedBoats = new Set<string>();
    const usedTargets = new Set<string>();

    for (const entry of distanceMatrix) {
      if (usedBoats.has(entry.boat.boat_id) || usedTargets.has(entry.targetId)) continue;
      
      if (entry.type === 'alert') {
        alertAssignments.push({
          boatId: entry.boat.boat_id,
          alertId: entry.targetId,
          distance: entry.distance,
        });
        pendingAssignments.current.add(entry.targetId);
      } else {
        safePointAssignments.push({
          boatId: entry.boat.boat_id,
          safePointId: entry.targetId,
          distance: entry.distance,
        });
      }
      
      usedBoats.add(entry.boat.boat_id);
      usedTargets.add(entry.targetId);
    }

    return { alertAssignments, safePointAssignments };
  }, []);

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

  // Check for returning boats that should reroute to outstanding alerts
  const checkReturningBoatsForReroute = useCallback(() => {
    const currentAlerts = alertsRef.current;
    const currentBoats = boatsRef.current;
    const currentSafePoints = safePointsRef.current;
    
    const returningBoats = currentBoats.filter(b => b.status === "returning");
    if (returningBoats.length === 0) return;
    
    const assignedAlertIds = new Set(
      currentBoats.filter(b => b.targetSOSId).map(b => b.targetSOSId)
    );
    const assignedSafePointIds = new Set(
      currentBoats.filter(b => b.targetSafePointId).map(b => b.targetSafePointId)
    );
    
    const unassignedAlerts = currentAlerts.filter(
      a => !a.safePointId && !assignedAlertIds.has(a.id) && !pendingAssignments.current.has(a.id)
    );
    const unassignedSafePoints = currentSafePoints.filter(
      sp => !assignedSafePointIds.has(sp.id) && !sp.assignedBoatId
    );
    
    if (unassignedAlerts.length === 0 && unassignedSafePoints.length === 0) return;
    
    for (const boat of returningBoats) {
      let bestTarget: { type: 'alert' | 'safePoint'; id: string; lat: number; lon: number; distance: number } | null = null;
      
      for (const alert of unassignedAlerts) {
        const distance = calculateDistance(boat.lat, boat.lon, alert.lat, alert.lon);
        if (!bestTarget || distance < bestTarget.distance) {
          bestTarget = { type: 'alert', id: alert.id, lat: alert.lat, lon: alert.lon, distance };
        }
      }
      
      for (const sp of unassignedSafePoints) {
        const distance = calculateDistance(boat.lat, boat.lon, sp.lat, sp.lon);
        if (!bestTarget || distance < bestTarget.distance) {
          bestTarget = { type: 'safePoint', id: sp.id, lat: sp.lat, lon: sp.lon, distance };
        }
      }
      
      if (bestTarget) {
        console.log(`[REROUTE] ${boat.name} rerouting from return to ${bestTarget.id}`);
        fetchRouteForBoat(boat, bestTarget.lat, bestTarget.lon);
        
        if (bestTarget.type === 'alert') {
          pendingAssignments.current.add(bestTarget.id);
          setBoats(prev => prev.map(b =>
            b.boat_id === boat.boat_id
              ? { ...b, status: "responding" as const, targetSOSId: bestTarget!.id, targetSafePointId: undefined }
              : b
          ));
        } else {
          setSafePoints(prev => prev.map(sp =>
            sp.id === bestTarget!.id ? { ...sp, assignedBoatId: boat.boat_id } : sp
          ));
          setBoats(prev => prev.map(b =>
            b.boat_id === boat.boat_id
              ? { ...b, status: "responding" as const, targetSafePointId: bestTarget!.id, targetSOSId: undefined }
              : b
          ));
        }
        
        // Only reroute one boat per tick
        break;
      }
    }
  }, [fetchRouteForBoat]);

  // Assignment effect
  useEffect(() => {
    if (!isSimulating) return;

    const assignmentInterval = setInterval(async () => {
      // First check if returning boats can reroute
      checkReturningBoatsForReroute();
      
      const { alertAssignments, safePointAssignments } = computeOptimalAssignments();
      
      // Handle alert assignments
      for (const assignment of alertAssignments) {
        const boat = boatsRef.current.find((b) => b.boat_id === assignment.boatId);
        const alert = alertsRef.current.find((a) => a.id === assignment.alertId);
        
        if (!boat || !alert) continue;

        console.log(`[DISPATCH] ${boat.name} responding to ${alert.id}`);
        fetchRouteForBoat(boat, alert.lat, alert.lon);
        
        setBoats((prev) =>
          prev.map((b) =>
            b.boat_id === assignment.boatId
              ? { ...b, status: "responding" as const, targetSOSId: assignment.alertId }
              : b
          )
        );
        
        pendingAssignments.current.delete(assignment.alertId);
      }
      
      // Handle safe point assignments
      for (const assignment of safePointAssignments) {
        const boat = boatsRef.current.find((b) => b.boat_id === assignment.boatId);
        const safePoint = safePointsRef.current.find((sp) => sp.id === assignment.safePointId);
        
        if (!boat || !safePoint) continue;

        console.log(`[DISPATCH] ${boat.name} responding to safe point ${safePoint.id} (${safePoint.assignedAlertIds.length} alerts)`);
        fetchRouteForBoat(boat, safePoint.lat, safePoint.lon);
        
        setSafePoints(prev => prev.map(sp =>
          sp.id === assignment.safePointId ? { ...sp, assignedBoatId: boat.boat_id } : sp
        ));
        
        setBoats((prev) =>
          prev.map((b) =>
            b.boat_id === assignment.boatId
              ? { ...b, status: "responding" as const, targetSafePointId: assignment.safePointId }
              : b
          )
        );
      }
    }, 1000);

    return () => clearInterval(assignmentInterval);
  }, [isSimulating, computeOptimalAssignments, fetchRouteForBoat, checkReturningBoatsForReroute]);

  // Move alerts towards their safe points
  useEffect(() => {
    if (!isSimulating) return;
    
    const alertMoveInterval = setInterval(() => {
      const currentSafePoints = safePointsRef.current;
      
      setSOSAlerts(prev => prev.map(alert => {
        if (!alert.safePointId || alert.reachedSafePoint) return alert;
        
        const safePoint = currentSafePoints.find(sp => sp.id === alert.safePointId);
        if (!safePoint) return alert;
        
        const currentLat = alert.currentLat ?? alert.lat;
        const currentLon = alert.currentLon ?? alert.lon;
        
        const dx = safePoint.lon - currentLon;
        const dy = safePoint.lat - currentLat;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance < ARRIVAL_THRESHOLD) {
          return { ...alert, currentLat: safePoint.lat, currentLon: safePoint.lon, reachedSafePoint: true };
        }
        
        const speed = BOAT_SPEED * 0.5; // Alerts move slower than boats
        const ratio = speed / distance;
        
        return {
          ...alert,
          currentLat: currentLat + dy * ratio,
          currentLon: currentLon + dx * ratio,
        };
      }));
    }, 300);
    
    return () => clearInterval(alertMoveInterval);
  }, [isSimulating]);

  // Main simulation loop
  useEffect(() => {
    if (!isSimulating) return;

    const interval = setInterval(() => {
      const currentAlerts = alertsRef.current;
      const currentRoutes = routesRef.current;
      const currentSafePoints = safePointsRef.current;
      const alertsToRemove: string[] = [];
      const safePointsToRemove: string[] = [];

      setBoats((prevBoats) => {
        return prevBoats.map((boat) => {
          // Responding to individual alert
          if (boat.status === "responding" && boat.targetSOSId) {
            const targetSOS = currentAlerts.find((sos) => sos.id === boat.targetSOSId);

            if (!targetSOS) {
              fetchRouteForBoat(boat, boat.homeBase.lat, boat.homeBase.lon);
              return { ...boat, status: "returning" as const, targetSOSId: undefined };
            }

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

              const distToTarget = calculateDistance(newPos.lat, newPos.lon, targetSOS.lat, targetSOS.lon);
              
              if (distToTarget < ARRIVAL_THRESHOLD) {
                console.log(`[RESCUE] ${boat.name} arrived at ${targetSOS.id}`);
                alertsToRemove.push(targetSOS.id);
                fetchRouteForBoat({ ...boat, lat: targetSOS.lat, lon: targetSOS.lon }, boat.homeBase.lat, boat.homeBase.lon);
                return { ...boat, lat: targetSOS.lat, lon: targetSOS.lon, status: "returning" as const, targetSOSId: undefined };
              }

              return { ...boat, lat: newPos.lat, lon: newPos.lon };
            } else {
              const dx = targetSOS.lon - boat.lon;
              const dy = targetSOS.lat - boat.lat;
              const distance = Math.sqrt(dx * dx + dy * dy);

              if (distance < ARRIVAL_THRESHOLD) {
                alertsToRemove.push(targetSOS.id);
                fetchRouteForBoat(boat, boat.homeBase.lat, boat.homeBase.lon);
                return { ...boat, status: "returning" as const, targetSOSId: undefined };
              }

              const ratio = BOAT_SPEED / distance;
              return { ...boat, lat: boat.lat + dy * ratio, lon: boat.lon + dx * ratio };
            }
          }

          // Responding to safe point
          if (boat.status === "responding" && boat.targetSafePointId) {
            const safePoint = currentSafePoints.find(sp => sp.id === boat.targetSafePointId);

            if (!safePoint) {
              fetchRouteForBoat(boat, boat.homeBase.lat, boat.homeBase.lon);
              return { ...boat, status: "returning" as const, targetSafePointId: undefined };
            }

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

              const distToTarget = calculateDistance(newPos.lat, newPos.lon, safePoint.lat, safePoint.lon);
              
              if (distToTarget < ARRIVAL_THRESHOLD) {
                // Check if all assigned alerts have reached the safe point
                const assignedAlerts = currentAlerts.filter(a => safePoint.assignedAlertIds.includes(a.id));
                const allReached = assignedAlerts.every(a => a.reachedSafePoint);
                
                if (allReached) {
                  console.log(`[RESCUE] ${boat.name} completed safe point ${safePoint.id}`);
                  alertsToRemove.push(...safePoint.assignedAlertIds);
                  safePointsToRemove.push(safePoint.id);
                  fetchRouteForBoat({ ...boat, lat: safePoint.lat, lon: safePoint.lon }, boat.homeBase.lat, boat.homeBase.lon);
                  return { ...boat, lat: safePoint.lat, lon: safePoint.lon, status: "returning" as const, targetSafePointId: undefined };
                }
                
                // Wait at safe point for alerts to arrive
                return { ...boat, lat: safePoint.lat, lon: safePoint.lon };
              }

              return { ...boat, lat: newPos.lat, lon: newPos.lon };
            } else {
              const dx = safePoint.lon - boat.lon;
              const dy = safePoint.lat - boat.lat;
              const distance = Math.sqrt(dx * dx + dy * dy);

              if (distance < ARRIVAL_THRESHOLD) {
                const assignedAlerts = currentAlerts.filter(a => safePoint.assignedAlertIds.includes(a.id));
                const allReached = assignedAlerts.every(a => a.reachedSafePoint);
                
                if (allReached) {
                  alertsToRemove.push(...safePoint.assignedAlertIds);
                  safePointsToRemove.push(safePoint.id);
                  fetchRouteForBoat(boat, boat.homeBase.lat, boat.homeBase.lon);
                  return { ...boat, status: "returning" as const, targetSafePointId: undefined };
                }
                
                return boat; // Wait
              }

              const ratio = BOAT_SPEED / distance;
              return { ...boat, lat: boat.lat + dy * ratio, lon: boat.lon + dx * ratio };
            }
          }

          // Returning home
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
                return { ...boat, lat: boat.homeBase.lat, lon: boat.homeBase.lon, status: "available" as const };
              }

              return { ...boat, lat: newPos.lat, lon: newPos.lon };
            } else {
              const dx = boat.homeBase.lon - boat.lon;
              const dy = boat.homeBase.lat - boat.lat;
              const distance = Math.sqrt(dx * dx + dy * dy);

              if (distance < ARRIVAL_THRESHOLD) {
                return { ...boat, lat: boat.homeBase.lat, lon: boat.homeBase.lon, status: "available" as const };
              }

              const ratio = BOAT_SPEED / distance;
              return { ...boat, lat: boat.lat + dy * ratio, lon: boat.lon + dx * ratio };
            }
          }

          return boat;
        });
      });

      if (alertsToRemove.length > 0) {
        setSOSAlerts((prev) => {
          const newAlerts = prev.filter((a) => !alertsToRemove.includes(a.id));
          if (selectedSOS && alertsToRemove.includes(selectedSOS.id)) {
            setSelectedSOS(null);
          }
          return newAlerts;
        });
      }
      
      if (safePointsToRemove.length > 0) {
        setSafePoints(prev => prev.filter(sp => !safePointsToRemove.includes(sp.id)));
      }
    }, 300);

    return () => clearInterval(interval);
  }, [isSimulating, selectedSOS, fetchRouteForBoat]);

  const addSOS = useCallback(() => {
    if (floodZones.length === 0) {
      console.log("[WARNING] Cannot add SOS - no flood zones active");
      return;
    }
    
    const newSOS = generateRandomSOSInFloodZone(floodZones);
    if (newSOS) {
      setSOSAlerts((prev) => [newSOS, ...prev]);
      console.log(`[NEW SOS] ${newSOS.id} at ${newSOS.village_name}`);
    }
  }, [floodZones]);

  const simulateFlood = useCallback(() => {
    const newZone: FloodZone = {
      id: `FZ-${Date.now()}`,
      lat: KARACHI_CENTER.lat + (Math.random() - 0.5) * 0.05,
      lon: KARACHI_CENTER.lon + (Math.random() - 0.5) * 0.1,
      radius: 3 + Math.random() * 2, // 3-5 km radius
      isGiantFlood: false,
    };
    
    setFloodZones(prev => [...prev, newZone]);
    console.log(`[FLOOD] New flood zone created at ${newZone.lat.toFixed(4)}, ${newZone.lon.toFixed(4)}`);
  }, []);

  const simulateGiantFlood = useCallback(() => {
    const giantZone: FloodZone = {
      id: `GF-${Date.now()}`,
      lat: KARACHI_CENTER.lat,
      lon: KARACHI_CENTER.lon,
      radius: 50, // Covers entire region
      isGiantFlood: true,
    };
    
    setFloodZones([giantZone]); // Replace all zones with giant flood
    
    // Generate 25-40 random alerts
    const alertCount = 25 + Math.floor(Math.random() * 16);
    const newAlerts = generateMultipleSOSAlerts([giantZone], alertCount);
    
    // Group nearby alerts and create safe points
    const newSafePoints = groupNearbyAlerts(newAlerts);
    
    // Assign alerts to their safe points
    const alertsWithSafePoints = newAlerts.map(alert => {
      const assignedSafePoint = newSafePoints.find(sp => sp.assignedAlertIds.includes(alert.id));
      if (assignedSafePoint) {
        return { ...alert, safePointId: assignedSafePoint.id };
      }
      return alert;
    });
    
    setSOSAlerts(prev => [...prev, ...alertsWithSafePoints]);
    setSafePoints(prev => [...prev, ...newSafePoints]);
    
    console.log(`[GIANT FLOOD] Created ${alertCount} alerts, ${newSafePoints.length} safe points`);
  }, [groupNearbyAlerts]);

  const removeSOS = useCallback((id: string) => {
    setSOSAlerts((prev) => prev.filter((sos) => sos.id !== id));
    if (selectedSOS?.id === id) {
      setSelectedSOS(null);
    }
  }, [selectedSOS]);

  const assignBoat = useCallback((sosId: string, boatId: string) => {
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

  const isBoatInFloodZone = useCallback((boatLat: number, boatLon: number) => {
    return isPointInFloodZone(boatLat, boatLon, floodZones);
  }, [floodZones]);

  return {
    sosAlerts,
    boats,
    selectedSOS,
    setSelectedSOS,
    nearestBoat,
    isSimulating,
    boatRoutes,
    floodZones,
    safePoints,
    addSOS,
    removeSOS,
    assignBoat,
    toggleSimulation,
    simulateFlood,
    simulateGiantFlood,
    isBoatInFloodZone,
  };
}
