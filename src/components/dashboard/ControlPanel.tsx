import { Button } from "@/components/ui/button";
import { AlertTriangle, Ship, Play, Pause, CloudRain, Waves } from "lucide-react";

interface ControlPanelProps {
  isSimulating: boolean;
  hasFloodZones: boolean;
  onAddSOS: () => void;
  onToggleSimulation: () => void;
  onSimulateFlood: () => void;
  onSimulateGiantFlood: () => void;
}

export function ControlPanel({
  isSimulating,
  hasFloodZones,
  onAddSOS,
  onToggleSimulation,
  onSimulateFlood,
  onSimulateGiantFlood,
}: ControlPanelProps) {
  return (
    <div className="p-4 border-t border-border bg-card/50 space-y-2">
      <Button
        onClick={onSimulateGiantFlood}
        variant="secondary"
        className="w-full bg-blue-900/50 hover:bg-blue-800/60 text-blue-100 border border-blue-700/50"
      >
        <Waves className="w-4 h-4 mr-2" />
        Simulate Giant Flood
      </Button>

      <Button
        onClick={onAddSOS}
        variant="destructive"
        className="w-full bg-danger hover:bg-danger/90"
        disabled={!hasFloodZones}
        title={!hasFloodZones ? "Create a flood first" : undefined}
      >
        <AlertTriangle className="w-4 h-4 mr-2" />
        Simulate New SOS
      </Button>

      <Button
        onClick={onSimulateFlood}
        variant="secondary"
        className="w-full bg-blue-600/30 hover:bg-blue-600/50 text-blue-200 border border-blue-500/30"
      >
        <CloudRain className="w-4 h-4 mr-2" />
        Simulate a Flood
      </Button>

      <Button
        onClick={onToggleSimulation}
        variant="secondary"
        className="w-full"
      >
        {isSimulating ? (
          <>
            <Pause className="w-4 h-4 mr-2" />
            Pause Boat Movement
          </>
        ) : (
          <>
            <Play className="w-4 h-4 mr-2" />
            Resume Boat Movement
          </>
        )}
      </Button>
    </div>
  );
}
