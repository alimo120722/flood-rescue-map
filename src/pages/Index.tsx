import { useState } from "react";
import { Header } from "@/components/dashboard/Header";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { RescueMap } from "@/components/dashboard/RescueMap";
import { SOSDetailModal } from "@/components/dashboard/SOSDetailModal";
import { useRescueData } from "@/hooks/useRescueData";
import { toast } from "@/hooks/use-toast";
import { SOSAlert } from "@/types/rescue";

const Index = () => {
  const {
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
    assignBoat,
    toggleSimulation,
    simulateFlood,
    simulateGiantFlood,
  } = useRescueData();

  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleSelectSOS = (sos: SOSAlert) => {
    setSelectedSOS(sos);
    setIsModalOpen(true);
  };

  const handleAddSOS = () => {
    if (floodZones.length === 0) {
      toast({
        title: "No Flood Zone",
        description: "Create a flood first before adding SOS alerts",
        variant: "destructive",
      });
      return;
    }
    addSOS();
    toast({
      title: "New SOS Alert",
      description: "A new emergency alert has been received!",
      variant: "destructive",
    });
  };

  const handleSimulateFlood = () => {
    simulateFlood();
    toast({
      title: "Flood Zone Created",
      description: "A new flood zone has appeared on the map",
    });
  };

  const handleSimulateGiantFlood = () => {
    simulateGiantFlood();
    toast({
      title: "Giant Flood!",
      description: "Massive flooding across the entire region with multiple SOS alerts",
      variant: "destructive",
    });
  };

  const handleAssignBoat = (sosId: string, boatId: string) => {
    assignBoat(sosId, boatId);
    setIsModalOpen(false);
    toast({
      title: "Rescue Dispatched",
      description: `Boat ${boatId} has been assigned to ${sosId}`,
    });
  };

  const availableBoats = boats.filter((b) => b.status === "available").length;

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-background">
      <Header
        sosCount={sosAlerts.length}
        boatCount={boats.length}
        availableBoats={availableBoats}
      />

      <div className="flex-1 flex overflow-hidden">
        <Sidebar
          alerts={sosAlerts}
          selectedSOS={selectedSOS}
          isSimulating={isSimulating}
          hasFloodZones={floodZones.length > 0}
          onSelectSOS={handleSelectSOS}
          onAddSOS={handleAddSOS}
          onToggleSimulation={toggleSimulation}
          onSimulateFlood={handleSimulateFlood}
          onSimulateGiantFlood={handleSimulateGiantFlood}
        />

        <main className="flex-1 relative">
          <RescueMap
            sosAlerts={sosAlerts}
            boats={boats}
            selectedSOS={selectedSOS}
            nearestBoat={nearestBoat}
            boatRoutes={boatRoutes}
            floodZones={floodZones}
            safePoints={safePoints}
            onSelectSOS={handleSelectSOS}
          />
        </main>
      </div>

      <SOSDetailModal
        sos={selectedSOS}
        nearestBoat={nearestBoat}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onAssignBoat={handleAssignBoat}
      />
    </div>
  );
};

export default Index;
