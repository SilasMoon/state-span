import { GanttFlag, ZoomConfig } from "@/types/gantt";

interface GanttFlagLinesProps {
  flags: GanttFlag[];
  zoom: ZoomConfig;
  swimlaneColumnWidth: number;
  selectedFlag: string | null;
}

export const GanttFlagLines = ({
  flags,
  zoom,
  swimlaneColumnWidth,
  selectedFlag,
}: GanttFlagLinesProps) => {
  return (
    <div 
      className="absolute inset-0 pointer-events-none" 
      style={{ 
        left: `${swimlaneColumnWidth}px`,
        zIndex: 1, // Behind bars (z-10) and links (z-20+)
      }}
    >
      {flags.map((flag) => {
        const left = (flag.position / zoom.hoursPerColumn) * zoom.columnWidth;
        const isSelected = selectedFlag === flag.id;

        return (
          <div
            key={flag.id}
            className="absolute top-0 bottom-0"
            style={{
              left: `${left}px`,
              transform: "translateX(-50%)",
            }}
          >
            {/* Vertical line extending through all swimlanes */}
            <div
              className="absolute top-0 bottom-0 transition-all"
              style={{
                backgroundColor: flag.color,
                opacity: isSelected ? 0.4 : 0.25,
                width: isSelected ? "3px" : "2px",
                boxShadow: isSelected ? `0 0 8px ${flag.color}` : "none",
              }}
            />
          </div>
        );
      })}
    </div>
  );
};
