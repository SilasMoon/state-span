import { GanttFlag, ZoomConfig } from "@/types/gantt";
import { Flag, CheckCircle, AlertCircle, Star, Target, Zap, Trophy, Rocket } from "lucide-react";
import * as LucideIcons from "lucide-react";

interface GanttFlagsProps {
  flags: GanttFlag[];
  zoom: ZoomConfig;
  swimlaneColumnWidth: number;
  selectedFlag: string | null;
  onFlagClick: (flagId: string) => void;
}

const iconMap: Record<string, React.ComponentType<any>> = {
  Flag,
  CheckCircle,
  AlertCircle,
  Star,
  Target,
  Zap,
  Trophy,
  Rocket,
};

export const GanttFlags = ({
  flags,
  zoom,
  swimlaneColumnWidth,
  selectedFlag,
  onFlagClick,
}: GanttFlagsProps) => {
  return (
    <div className="absolute inset-0 pointer-events-none" style={{ left: `${swimlaneColumnWidth}px` }}>
      {flags.map((flag) => {
        const left = (flag.position / zoom.hoursPerColumn) * zoom.columnWidth;
        const IconComponent = flag.icon && iconMap[flag.icon] ? iconMap[flag.icon] : Flag;
        const isSelected = selectedFlag === flag.id;

        return (
          <div
            key={flag.id}
            className="absolute top-0 bottom-0 pointer-events-auto cursor-pointer group"
            style={{
              left: `${left}px`,
              transform: "translateX(-50%)",
            }}
            onClick={(e) => {
              e.stopPropagation();
              onFlagClick(flag.id);
            }}
          >
            {/* Vertical line */}
            <div
              className="absolute top-0 bottom-0 w-0.5 transition-all"
              style={{
                backgroundColor: flag.color,
                opacity: isSelected ? 1 : 0.6,
                width: isSelected ? "3px" : "2px",
                boxShadow: isSelected ? `0 0 8px ${flag.color}` : "none",
              }}
            />
            
            {/* Semi-transparent column highlight */}
            <div
              className="absolute top-0 bottom-0 opacity-0 group-hover:opacity-15 transition-opacity"
              style={{
                backgroundColor: flag.color,
                width: `${zoom.columnWidth}px`,
                left: "50%",
                transform: "translateX(-50%)",
              }}
            />

            {/* Flag icon and label */}
            <div
              className="absolute top-2 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 min-w-max"
              style={{
                filter: isSelected ? `drop-shadow(0 0 4px ${flag.color})` : "none",
              }}
            >
              <div
                className="p-1.5 rounded-full transition-all"
                style={{
                  backgroundColor: flag.color,
                  transform: isSelected ? "scale(1.2)" : "scale(1)",
                }}
              >
                <IconComponent className="w-4 h-4 text-white" />
              </div>
              <div
                className="text-xs font-semibold px-2 py-0.5 rounded whitespace-nowrap shadow-md"
                style={{
                  backgroundColor: flag.color,
                  color: "white",
                }}
              >
                {flag.label}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};
