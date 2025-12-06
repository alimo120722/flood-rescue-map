import { SOSAlert, RescueBoat } from "@/types/rescue";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  AlertTriangle,
  Users,
  MapPin,
  Clock,
  Ship,
  Navigation,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { calculateDistance, formatDistance, estimateArrivalTime } from "@/utils/distance";
import { cn } from "@/lib/utils";

interface SOSDetailModalProps {
  sos: SOSAlert | null;
  nearestBoat: RescueBoat | null;
  isOpen: boolean;
  onClose: () => void;
  onAssignBoat: (sosId: string, boatId: string) => void;
}

const severityConfig = {
  1: { label: "Low Priority", color: "text-warning", bg: "bg-warning/20" },
  2: { label: "Medium Priority", color: "text-warning", bg: "bg-warning/30" },
  3: { label: "Critical", color: "text-danger", bg: "bg-danger/20" },
};

const typeConfig = {
  flood: { label: "Flooding Emergency", icon: "🌊" },
  stranded: { label: "People Stranded", icon: "🆘" },
  medical: { label: "Medical Emergency", icon: "🏥" },
  supplies: { label: "Supply Request", icon: "📦" },
};

export function SOSDetailModal({
  sos,
  nearestBoat,
  isOpen,
  onClose,
  onAssignBoat,
}: SOSDetailModalProps) {
  if (!sos) return null;

  const severity = severityConfig[sos.severity];
  const type = typeConfig[sos.type];

  const distance = nearestBoat
    ? calculateDistance(sos.lat, sos.lon, nearestBoat.lat, nearestBoat.lon)
    : null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-card border-border max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-danger/20 flex items-center justify-center pulse-danger">
              <AlertTriangle className="w-5 h-5 text-danger" />
            </div>
            <div>
              <span className="text-lg">{sos.village_name}</span>
              <p className="text-xs font-normal text-muted-foreground font-mono">
                {sos.id}
              </p>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          {/* Status badges */}
          <div className="flex gap-2">
            <span className={cn("px-3 py-1 rounded-full text-xs font-bold", severity.bg, severity.color)}>
              {severity.label}
            </span>
            <span className="px-3 py-1 rounded-full text-xs font-medium bg-muted text-muted-foreground">
              {type.icon} {type.label}
            </span>
          </div>

          {/* Details grid */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-muted/50 rounded-lg p-3">
              <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                <Users className="w-3.5 h-3.5" />
                <span>People Affected</span>
              </div>
              <p className="text-2xl font-bold">{sos.people_affected}</p>
            </div>

            <div className="bg-muted/50 rounded-lg p-3">
              <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                <Clock className="w-3.5 h-3.5" />
                <span>Time Since Alert</span>
              </div>
              <p className="text-lg font-semibold">
                {formatDistanceToNow(new Date(sos.timestamp))}
              </p>
            </div>
          </div>

          {/* Location */}
          <div className="bg-muted/50 rounded-lg p-3">
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
              <MapPin className="w-3.5 h-3.5" />
              <span>Coordinates</span>
            </div>
            <p className="font-mono text-sm">
              {sos.lat.toFixed(6)}, {sos.lon.toFixed(6)}
            </p>
          </div>

          {/* Nearest Boat */}
          {nearestBoat && distance !== null && (
            <div className="bg-rescue/10 border border-rescue/30 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-3">
                <Ship className="w-4 h-4 text-rescue" />
                <span className="text-sm font-semibold text-rescue">
                  Nearest Available Rescue Unit
                </span>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-bold">{nearestBoat.name}</p>
                  <p className="text-xs text-muted-foreground font-mono">
                    {nearestBoat.boat_id}
                  </p>
                </div>
                <div className="text-right">
                  <div className="flex items-center gap-1 text-rescue">
                    <Navigation className="w-3 h-3" />
                    <span className="font-bold">{formatDistance(distance)}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    ETA: {estimateArrivalTime(distance)}
                  </p>
                </div>
              </div>

              <Button
                onClick={() => onAssignBoat(sos.id, nearestBoat.boat_id)}
                className="w-full mt-4 bg-rescue hover:bg-rescue/90 text-rescue-foreground"
              >
                <Ship className="w-4 h-4 mr-2" />
                Dispatch {nearestBoat.name}
              </Button>
            </div>
          )}

          {!nearestBoat && (
            <div className="bg-warning/10 border border-warning/30 rounded-lg p-4 text-center">
              <p className="text-warning text-sm font-medium">
                No available rescue boats at this time
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
