import React from "react";
import { GanttFlag, ZoomConfig } from "@/types/gantt";
import { Flag, CheckCircle, AlertCircle, Star, Target, Zap, Trophy, Rocket } from "lucide-react";
import { useState, useRef } from "react";

interface GanttFlagRowProps {
  flags: GanttFlag[];
  zoom: ZoomConfig;
  totalHours: number;
  swimlaneColumnWidth: number;
  selectedFlag: string | null;
  onFlagClick: (flagId: string) => void;
  onFlagMove: (flagId: string, newPosition: number) => void;
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

export const GanttFlagRow = ({
  flags,
  zoom,
  totalHours,
  swimlaneColumnWidth,
  selectedFlag,
  onFlagClick,
  onFlagMove,
}: GanttFlagRowProps) => {
  const [draggingFlag, setDraggingFlag] = useState<{
    id: string;
    startX: number;
    startPosition: number;
  } | null>(null);
  const [tempPosition, setTempPosition] = useState<number | null>(null);
  const isDraggingRef = useRef(false);

  const handleMouseDown = (flag: GanttFlag, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    isDraggingRef.current = false;
    
    const scrollContainer = document.querySelector('.overflow-auto');
    const scrollLeft = scrollContainer?.scrollLeft || 0;
    
    setDraggingFlag({
      id: flag.id,
      startX: e.clientX + scrollLeft,
      startPosition: flag.position,
    });
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!draggingFlag) return;
    
    const scrollContainer = document.querySelector('.overflow-auto');
    const scrollLeft = scrollContainer?.scrollLeft || 0;
    
    const currentX = e.clientX + scrollLeft;
    const deltaX = currentX - draggingFlag.startX;
    const deltaHours = (deltaX / zoom.columnWidth) * zoom.hoursPerColumn;
    const newPosition = Math.max(0, Math.round((draggingFlag.startPosition + deltaHours) / zoom.hoursPerColumn) * zoom.hoursPerColumn);
    
    if (Math.abs(deltaX) > 5) {
      isDraggingRef.current = true;
    }
    
    setTempPosition(newPosition);
  };

  const handleMouseUp = (e: MouseEvent) => {
    if (draggingFlag && tempPosition !== null && isDraggingRef.current) {
      onFlagMove(draggingFlag.id, tempPosition);
    } else if (draggingFlag && !isDraggingRef.current) {
      // It was a click, not a drag
      onFlagClick(draggingFlag.id);
    }
    
    setDraggingFlag(null);
    setTempPosition(null);
    isDraggingRef.current = false;
  };

  // Attach mouse move and up listeners when dragging
  React.useEffect(() => {
    if (draggingFlag) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [draggingFlag, tempPosition]);

  const columns = Math.ceil(totalHours / zoom.hoursPerColumn);

  return (
    <div className="flex">
      {/* Label column */}
      <div
        className="sticky left-0 z-30 bg-gantt-header border-r border-border flex items-center px-4 font-medium text-foreground"
        style={{ width: `${swimlaneColumnWidth}px`, minWidth: `${swimlaneColumnWidth}px`, height: '64px' }}
      >
        Flags
      </div>

      {/* Grid and flags area */}
      <div className="relative flex" style={{ height: '64px' }}>
        {/* Grid columns */}
        {Array.from({ length: columns }).map((_, i) => (
          <div
            key={i}
            className="border-r border-gantt-grid bg-gantt-bg"
            style={{ width: `${zoom.columnWidth}px`, minWidth: `${zoom.columnWidth}px` }}
          />
        ))}

        {/* Flags (icons and labels only, no vertical lines here) */}
        {flags.map((flag) => {
          const isDragging = draggingFlag?.id === flag.id;
          const displayPosition = isDragging && tempPosition !== null ? tempPosition : flag.position;
          const left = (displayPosition / zoom.hoursPerColumn) * zoom.columnWidth;
          const IconComponent = flag.icon && iconMap[flag.icon] ? iconMap[flag.icon] : Flag;
          const isSelected = selectedFlag === flag.id;

          return (
            <div
              key={flag.id}
              className="absolute top-0 bottom-0 cursor-move group"
              style={{
                left: `${left}px`,
                transform: "translateX(-50%)",
                opacity: isDragging ? 0.7 : 1,
                zIndex: isDragging ? 40 : 20,
              }}
              onMouseDown={(e) => handleMouseDown(flag, e)}
            >
              {/* Highlight on hover */}
              <div
                className="absolute top-0 bottom-0 opacity-0 group-hover:opacity-15 transition-opacity pointer-events-none"
                style={{
                  backgroundColor: flag.color,
                  width: `${zoom.columnWidth}px`,
                  left: "50%",
                  transform: "translateX(-50%)",
                }}
              />

              {/* Flag icon and label */}
              <div
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-1 min-w-max pointer-events-none"
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
    </div>
  );
};
