import { GanttFlag, ZoomConfig } from "@/types/gantt";

interface GanttFlagLinesProps {
  flags: GanttFlag[];
  zoom: ZoomConfig;
  swimlaneColumnWidth: number;
  selectedFlag: string | null;
  draggingFlag: { id: string; tempPosition: number } | null;
}

export const GanttFlagLines = ({
  flags,
  zoom,
  swimlaneColumnWidth,
  selectedFlag,
  draggingFlag,
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
        const isDragging = draggingFlag?.id === flag.id;
        const displayPosition = isDragging ? draggingFlag.tempPosition : flag.position;
        const left = (displayPosition / zoom.hoursPerColumn) * zoom.columnWidth;
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
                opacity: isDragging ? 0.5 : (isSelected ? 0.4 : 0.25),
                width: isDragging ? "3px" : (isSelected ? "3px" : "2px"),
                boxShadow: isDragging || isSelected ? `0 0 8px ${flag.color}` : "none",
              }}
            />
          </div>
        );
      })}
    </div>
  );
};
