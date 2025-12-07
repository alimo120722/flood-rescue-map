import { Button } from "@/components/ui/button";
import { AlertTriangle, Ship, Play, Pause } from "lucide-react";

interface ControlPanelProps {
  isSimulating: boolean;
  onAddSOS: () => void;
  onToggleSimulation: () => void;
}

export function ControlPanel({
  isSimulating,
  onAddSOS,
  onToggleSimulation,
}: ControlPanelProps) {
  return (
    <div className="p-4 border-t border-border bg-card/50 space-y-2">
      <Button
        onClick={onAddSOS}
        variant="destructive"
        className="w-full bg-danger hover:bg-danger/90"
      >
        <AlertTriangle className="w-4 h-4 mr-2" />
        Simulate New SOS
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
