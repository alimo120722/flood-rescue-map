import { AlertTriangle, Radio, Ship } from "lucide-react";

interface HeaderProps {
  sosCount: number;
  boatCount: number;
  availableBoats: number;
}

export function Header({ sosCount, boatCount, availableBoats }: HeaderProps) {
  return (
    <header className="h-16 bg-card border-b border-border flex items-center justify-between px-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-danger/20 flex items-center justify-center">
          <AlertTriangle className="w-5 h-5 text-danger" />
        </div>
        <div>
          <h1 className="text-xl font-bold tracking-tight">
            Flood SOS & Rescue Dashboard
          </h1>
          <p className="text-xs text-muted-foreground">
            Real-time rescue coordination system
          </p>
        </div>
      </div>

      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-danger animate-pulse" />
          <span className="text-sm font-medium">
            <span className="text-danger font-bold">{sosCount}</span>{" "}
            <span className="text-muted-foreground">Active SOS</span>
          </span>
        </div>

        <div className="h-4 w-px bg-border" />

        <div className="flex items-center gap-2">
          <Ship className="w-4 h-4 text-rescue" />
          <span className="text-sm font-medium">
            <span className="text-rescue font-bold">{availableBoats}</span>
            <span className="text-muted-foreground">/{boatCount} Available</span>
          </span>
        </div>

        <div className="h-4 w-px bg-border" />

        <div className="flex items-center gap-2">
          <Radio className="w-4 h-4 text-success animate-pulse" />
          <span className="text-xs text-success font-medium">LIVE</span>
        </div>
      </div>
    </header>
  );
}
