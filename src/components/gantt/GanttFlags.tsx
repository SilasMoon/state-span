import React, { useState, useRef } from "react";
import { GanttFlag, ZoomConfig } from "@/types/gantt";
import { Flag, CheckCircle, AlertCircle, Star, Target, Zap, Trophy, Rocket } from "lucide-react";
import * as LucideIcons from "lucide-react";

interface GanttFlagsProps {
  flags: GanttFlag[];
  zoom: ZoomConfig;
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

export const GanttFlags = ({
  flags,
  zoom,
  swimlaneColumnWidth,
  selectedFlag,
  onFlagClick,
  onFlagMove,
}: GanttFlagsProps) => {
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

  return (
    <div className="absolute inset-0 pointer-events-none" style={{ left: `${swimlaneColumnWidth}px` }}>
      {flags.map((flag) => {
        const isDragging = draggingFlag?.id === flag.id;
        const displayPosition = isDragging && tempPosition !== null ? tempPosition : flag.position;
        const left = (displayPosition / zoom.hoursPerColumn) * zoom.columnWidth;
        const IconComponent = flag.icon && iconMap[flag.icon] ? iconMap[flag.icon] : Flag;
        const isSelected = selectedFlag === flag.id;

        return (
          <div
            key={flag.id}
            className="absolute top-0 bottom-0 pointer-events-auto cursor-move group"
            style={{
              left: `${left}px`,
              transform: "translateX(-50%)",
              opacity: isDragging ? 0.7 : 1,
            }}
            onMouseDown={(e) => handleMouseDown(flag, e)}
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
