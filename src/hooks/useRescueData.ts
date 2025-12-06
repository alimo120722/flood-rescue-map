import { useState, useCallback, useEffect, useRef } from "react";
import { SOSAlert, RescueBoat, BoatRoute } from "@/types/rescue";
import {
  initialSOSAlerts,
  initialRescueBoats,
  boatRoutes as initialRoutes,
  generateRandomSOS,
} from "@/data/mockData";
import { calculateDistance } from "@/utils/distance";

export function useRescueData() {
  const [sosAlerts, setSOSAlerts] = useState<SOSAlert[]>(initialSOSAlerts);
  const [boats, setBoats] = useState<RescueBoat[]>(initialRescueBoats);
  const [selectedSOS, setSelectedSOS] = useState<SOSAlert | null>(null);
  const [nearestBoat, setNearestBoat] = useState<RescueBoat | null>(null);
  const [isSimulating, setIsSimulating] = useState(true);
  const routesRef = useRef<BoatRoute[]>([...initialRoutes]);

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

  // Simulate boat movement
  useEffect(() => {
    if (!isSimulating) return;

    const interval = setInterval(() => {
      setBoats((prevBoats) =>
        prevBoats.map((boat) => {
          const route = routesRef.current.find((r) => r.boat_id === boat.boat_id);
          if (!route) return boat;

          const targetWaypoint = route.waypoints[route.currentIndex];
          const dx = targetWaypoint.lon - boat.lon;
          const dy = targetWaypoint.lat - boat.lat;
          const distance = Math.sqrt(dx * dx + dy * dy);

          if (distance < 0.002) {
            // Reached waypoint, move to next
            route.currentIndex = (route.currentIndex + 1) % route.waypoints.length;
            return {
              ...boat,
              last_update: new Date().toISOString(),
            };
          }

          // Move towards target
          const ratio = route.speed / distance;
          return {
            ...boat,
            lat: boat.lat + dy * ratio,
            lon: boat.lon + dx * ratio,
            last_update: new Date().toISOString(),
          };
        })
      );
    }, 1000);

    return () => clearInterval(interval);
  }, [isSimulating]);

  const addSOS = useCallback(() => {
    const newSOS = generateRandomSOS();
    setSOSAlerts((prev) => [newSOS, ...prev]);
  }, []);

  const removeSOS = useCallback((id: string) => {
    setSOSAlerts((prev) => prev.filter((sos) => sos.id !== id));
    if (selectedSOS?.id === id) {
      setSelectedSOS(null);
    }
  }, [selectedSOS]);

  const assignBoat = useCallback((sosId: string, boatId: string) => {
    console.log(`[DISPATCH] Assigning boat ${boatId} to SOS ${sosId}`);
    
    setBoats((prev) =>
      prev.map((boat) =>
        boat.boat_id === boatId
          ? { ...boat, status: "responding" as const }
          : boat
      )
    );

    // Simulate boat returning after some time
    setTimeout(() => {
      setBoats((prev) =>
        prev.map((boat) =>
          boat.boat_id === boatId
            ? { ...boat, status: "returning" as const }
            : boat
        )
      );

      setTimeout(() => {
        setBoats((prev) =>
          prev.map((boat) =>
            boat.boat_id === boatId
              ? { ...boat, status: "available" as const }
              : boat
          )
        );
      }, 10000);
    }, 15000);
  }, []);

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
    addSOS,
    removeSOS,
    assignBoat,
    toggleSimulation,
  };
}
