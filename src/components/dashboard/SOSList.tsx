import { SOSAlert } from "@/types/rescue";
import { AlertTriangle, Clock, Users, MapPin } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";

interface SOSListProps {
  alerts: SOSAlert[];
  selectedId: string | null;
  onSelect: (alert: SOSAlert) => void;
}

const severityConfig = {
  1: { label: "Low", color: "bg-warning/20 text-warning border-warning/30" },
  2: { label: "Medium", color: "bg-warning/30 text-warning border-warning/40" },
  3: { label: "Critical", color: "bg-danger/20 text-danger border-danger/30" },
};

const typeConfig = {
  flood: { label: "Flooding", icon: "🌊" },
  stranded: { label: "Stranded", icon: "🆘" },
  medical: { label: "Medical", icon: "🏥" },
  supplies: { label: "Supplies", icon: "📦" },
};

export function SOSList({ alerts, selectedId, onSelect }: SOSListProps) {
  if (alerts.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="text-center text-muted-foreground">
          <AlertTriangle className="w-12 h-12 mx-auto mb-4 opacity-30" />
          <p className="text-sm">No active SOS alerts</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto space-y-2 p-4">
      {alerts.map((alert) => {
        const isSelected = selectedId === alert.id;
        const severity = severityConfig[alert.severity];
        const type = typeConfig[alert.type];

        return (
          <button
            key={alert.id}
            onClick={() => onSelect(alert)}
            className={cn(
              "w-full text-left p-4 rounded-lg border transition-all duration-200",
              "hover:bg-muted/50",
              isSelected
                ? "bg-danger/10 border-danger/40 glow-danger"
                : "bg-card/50 border-border hover:border-muted-foreground/30"
            )}
          >
            <div className="flex items-start justify-between gap-3 mb-2">
              <div className="flex items-center gap-2">
                <span className="text-lg">{type.icon}</span>
                <span className="font-semibold text-sm">{alert.village_name}</span>
              </div>
              <span
                className={cn(
                  "text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border",
                  severity.color
                )}
              >
                {severity.label}
              </span>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <MapPin className="w-3 h-3" />
                <span className="font-mono">
                  {alert.lat.toFixed(4)}, {alert.lon.toFixed(4)}
                </span>
              </div>

              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Users className="w-3 h-3" />
                  <span>{alert.people_affected} people</span>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Clock className="w-3 h-3" />
                  <span>
                    {formatDistanceToNow(new Date(alert.timestamp), {
                      addSuffix: true,
                    })}
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-3 flex items-center justify-between">
              <span className="text-[10px] font-mono text-muted-foreground">
                {alert.id}
              </span>
              <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                {type.label}
              </span>
            </div>
          </button>
        );
      })}
    </div>
  );
}
