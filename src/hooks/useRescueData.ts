import { useState, useCallback, useEffect, useRef } from "react";
import { SOSAlert, RescueBoat } from "@/types/rescue";
import {
  initialSOSAlerts,
  initialRescueBoats,
  generateRandomSOS,
} from "@/data/mockData";
import { calculateDistance } from "@/utils/distance";

const BOAT_SPEED = 0.002; // Speed per tick
const ARRIVAL_THRESHOLD = 0.003; // Distance to consider "arrived"

export function useRescueData() {
  const [sosAlerts, setSOSAlerts] = useState<SOSAlert[]>(initialSOSAlerts);
  const [boats, setBoats] = useState<RescueBoat[]>(initialRescueBoats);
  const [selectedSOS, setSelectedSOS] = useState<SOSAlert | null>(null);
  const [nearestBoat, setNearestBoat] = useState<RescueBoat | null>(null);
  const [isSimulating, setIsSimulating] = useState(true);

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

  // Main simulation loop - boats autonomously respond to alerts
  useEffect(() => {
    if (!isSimulating) return;

    const interval = setInterval(() => {
      setBoats((prevBoats) => {
        return prevBoats.map((boat) => {
          // If boat is available, find nearest unassigned SOS
          if (boat.status === "available") {
            // Get alerts that no other boat is responding to
            const assignedAlertIds = prevBoats
              .filter((b) => b.status === "responding" && b.targetSOSId)
              .map((b) => b.targetSOSId);

            const unassignedAlerts = sosAlerts.filter(
              (sos) => !assignedAlertIds.includes(sos.id)
            );

            if (unassignedAlerts.length === 0) {
              return boat; // No alerts to respond to
            }

            // Find nearest unassigned alert
            let nearestAlert = unassignedAlerts[0];
            let minDist = calculateDistance(
              boat.lat,
              boat.lon,
              nearestAlert.lat,
              nearestAlert.lon
            );

            for (const alert of unassignedAlerts.slice(1)) {
              const dist = calculateDistance(
                boat.lat,
                boat.lon,
                alert.lat,
                alert.lon
              );
              if (dist < minDist) {
                minDist = dist;
                nearestAlert = alert;
              }
            }

            console.log(`[DISPATCH] ${boat.name} responding to ${nearestAlert.id}`);
            return {
              ...boat,
              status: "responding" as const,
              targetSOSId: nearestAlert.id,
              last_update: new Date().toISOString(),
            };
          }

          // If boat is responding, move towards target SOS
          if (boat.status === "responding" && boat.targetSOSId) {
            const targetSOS = sosAlerts.find((sos) => sos.id === boat.targetSOSId);

            if (!targetSOS) {
              // Alert was removed, return home
              return {
                ...boat,
                status: "returning" as const,
                targetSOSId: undefined,
                last_update: new Date().toISOString(),
              };
            }

            const dx = targetSOS.lon - boat.lon;
            const dy = targetSOS.lat - boat.lat;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance < ARRIVAL_THRESHOLD) {
              // Arrived at SOS - will be removed and boat returns
              console.log(`[RESCUE] ${boat.name} arrived at ${targetSOS.id}`);
              return {
                ...boat,
                status: "returning" as const,
                targetSOSId: undefined,
                last_update: new Date().toISOString(),
              };
            }

            // Move towards target
            const ratio = BOAT_SPEED / distance;
            return {
              ...boat,
              lat: boat.lat + dy * ratio,
              lon: boat.lon + dx * ratio,
              last_update: new Date().toISOString(),
            };
          }

          // If boat is returning, move towards home base
          if (boat.status === "returning") {
            const dx = boat.homeBase.lon - boat.lon;
            const dy = boat.homeBase.lat - boat.lat;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance < ARRIVAL_THRESHOLD) {
              // Arrived home, become available
              console.log(`[HOME] ${boat.name} returned to base`);
              return {
                ...boat,
                lat: boat.homeBase.lat,
                lon: boat.homeBase.lon,
                status: "available" as const,
                last_update: new Date().toISOString(),
              };
            }

            // Move towards home
            const ratio = BOAT_SPEED / distance;
            return {
              ...boat,
              lat: boat.lat + dy * ratio,
              lon: boat.lon + dx * ratio,
              last_update: new Date().toISOString(),
            };
          }

          return boat;
        });
      });

      // Remove alerts that boats have arrived at
      setSOSAlerts((prevAlerts) => {
        const alertsToRemove: string[] = [];

        setBoats((currentBoats) => {
          currentBoats.forEach((boat) => {
            if (boat.status === "returning" && !boat.targetSOSId) {
              // This boat just finished a rescue - check if any alert should be removed
              // We mark this in the previous iteration when status changes to returning
            }
          });
          return currentBoats;
        });

        // Check which alerts have been reached by responding boats
        return prevAlerts.filter((alert) => {
          const respondingBoat = boats.find(
            (b) => b.targetSOSId === alert.id && b.status === "responding"
          );
          if (respondingBoat) {
            const distance = Math.sqrt(
              Math.pow(alert.lon - respondingBoat.lon, 2) +
              Math.pow(alert.lat - respondingBoat.lat, 2)
            );
            if (distance < ARRIVAL_THRESHOLD) {
              console.log(`[RESOLVED] Alert ${alert.id} resolved`);
              // Clear selected if this was the selected one
              if (selectedSOS?.id === alert.id) {
                setSelectedSOS(null);
              }
              return false;
            }
          }
          return true;
        });
      });
    }, 500);

    return () => clearInterval(interval);
  }, [isSimulating, sosAlerts, selectedSOS]);

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
    
    setBoats((prev) =>
      prev.map((boat) =>
        boat.boat_id === boatId
          ? { ...boat, status: "responding" as const, targetSOSId: sosId }
          : boat
      )
    );
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
