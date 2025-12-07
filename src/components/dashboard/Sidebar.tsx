import { SOSAlert, FloodZone } from "@/types/rescue";
import { SOSList } from "./SOSList";
import { ControlPanel } from "./ControlPanel";
import { AlertTriangle } from "lucide-react";

interface SidebarProps {
  alerts: SOSAlert[];
  selectedSOS: SOSAlert | null;
  isSimulating: boolean;
  hasFloodZones: boolean;
  onSelectSOS: (sos: SOSAlert) => void;
  onAddSOS: () => void;
  onToggleSimulation: () => void;
  onSimulateFlood: () => void;
  onSimulateGiantFlood: () => void;
}

export function Sidebar({
  alerts,
  selectedSOS,
  isSimulating,
  hasFloodZones,
  onSelectSOS,
  onAddSOS,
  onToggleSimulation,
  onSimulateFlood,
  onSimulateGiantFlood,
}: SidebarProps) {
  return (
    <aside className="w-80 bg-sidebar border-r border-sidebar-border flex flex-col h-full">
      <div className="p-4 border-b border-sidebar-border">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-danger" />
          <h2 className="font-semibold">Active SOS Alerts</h2>
          <span className="ml-auto bg-danger/20 text-danger text-xs font-bold px-2 py-0.5 rounded-full">
            {alerts.length}
          </span>
        </div>
      </div>

      <SOSList
        alerts={alerts}
        selectedId={selectedSOS?.id ?? null}
        onSelect={onSelectSOS}
      />

      <ControlPanel
        isSimulating={isSimulating}
        hasFloodZones={hasFloodZones}
        onAddSOS={onAddSOS}
        onToggleSimulation={onToggleSimulation}
        onSimulateFlood={onSimulateFlood}
        onSimulateGiantFlood={onSimulateGiantFlood}
      />
    </aside>
  );
}
