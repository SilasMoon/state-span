import { GanttActivity, GanttState, ZoomLevel } from "@/types/gantt";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import React, { useState } from "react";

interface GanttBarProps {
  item: GanttActivity | GanttState;
  swimlaneId: string;
  zoom: ZoomLevel;
  columnWidth: number;
  isSelected: boolean;
  onDoubleClick: () => void;
  onSelect: () => void;
  onMove: (toSwimlaneId: string, newStart: number) => void;
  onResize: (newStart: number, newDuration: number) => void;
  checkOverlap: (swimlaneId: string, itemId: string, start: number, duration: number) => boolean;
}

export const GanttBar = ({
  item,
  swimlaneId,
  zoom,
  columnWidth,
  isSelected,
  onDoubleClick,
  onSelect,
  onMove,
  onResize,
  checkOverlap,
}: GanttBarProps) => {
  const [isDragging, setIsDragging] = useState<'start' | 'end' | 'move' | null>(null);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [tempStart, setTempStart] = useState(item.start);
  const [tempDuration, setTempDuration] = useState(item.duration);
  const [targetSwimlaneId, setTargetSwimlaneId] = useState(swimlaneId);

  const left = (tempStart / zoom) * columnWidth;
  const width = (tempDuration / zoom) * columnWidth;

  const snapToGrid = (value: number) => {
    return Math.round(value / zoom) * zoom;
  };

  const handleResizeStart = (e: React.MouseEvent, handle: 'start' | 'end') => {
    e.stopPropagation();
    setIsDragging(handle);
    setDragStart({ x: e.clientX, y: e.clientY });
    setTempStart(item.start);
    setTempDuration(item.duration);
    setTargetSwimlaneId(swimlaneId);
  };

  const handleMoveStart = (e: React.MouseEvent) => {
    if (e.target !== e.currentTarget) return;
    e.stopPropagation();
    onSelect();
    setIsDragging('move');
    setDragStart({ x: e.clientX, y: e.clientY });
    setTempStart(item.start);
    setTempDuration(item.duration);
    setTargetSwimlaneId(swimlaneId);
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging) return;
    
    if (isDragging === 'move') {
      const deltaX = e.clientX - dragStart.x;
      const deltaY = e.clientY - dragStart.y;
      const hoursDelta = Math.round((deltaX / columnWidth) * zoom);
      const newStart = snapToGrid(Math.max(0, item.start + hoursDelta));
      setTempStart(newStart);
      
      // Detect swimlane change
      const rowHeight = 48;
      const rowsDelta = Math.round(deltaY / rowHeight);
      if (rowsDelta !== 0) {
        const swimlaneElement = document.elementFromPoint(e.clientX, e.clientY);
        const rowElement = swimlaneElement?.closest('[data-swimlane-id]');
        if (rowElement) {
          const newSwimlaneId = rowElement.getAttribute('data-swimlane-id');
          if (newSwimlaneId) {
            setTargetSwimlaneId(newSwimlaneId);
          }
        }
      }
    } else if (isDragging === 'start') {
      const delta = e.clientX - dragStart.x;
      const hoursDelta = Math.round((delta / columnWidth) * zoom);
      const newStart = snapToGrid(Math.max(0, item.start + hoursDelta));
      const newDuration = snapToGrid(Math.max(zoom, item.duration - hoursDelta));
      
      if (!checkOverlap(swimlaneId, item.id, newStart, newDuration)) {
        setTempStart(newStart);
        setTempDuration(newDuration);
      }
    } else if (isDragging === 'end') {
      const delta = e.clientX - dragStart.x;
      const hoursDelta = Math.round((delta / columnWidth) * zoom);
      const newDuration = snapToGrid(Math.max(zoom, item.duration + hoursDelta));
      
      if (!checkOverlap(swimlaneId, item.id, item.start, newDuration)) {
        setTempDuration(newDuration);
      }
    }
  };

  const handleMouseUp = () => {
    if (isDragging) {
      if (isDragging === 'move') {
        if (!checkOverlap(targetSwimlaneId, item.id, tempStart, tempDuration)) {
          onMove(targetSwimlaneId, tempStart);
        }
      } else {
        if (!checkOverlap(swimlaneId, item.id, tempStart, tempDuration)) {
          onResize(tempStart, tempDuration);
        }
      }
      setIsDragging(null);
      setTargetSwimlaneId(swimlaneId);
    }
  };

  React.useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, dragStart, tempStart, tempDuration]);

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className={`absolute top-1 h-6 rounded cursor-move group flex items-center justify-center text-xs font-medium shadow-lg hover:shadow-xl transition-all pointer-events-auto ${
              isSelected ? 'ring-2 ring-primary ring-offset-2' : ''
            }`}
            style={{
              left: `${left}px`,
              width: `${width}px`,
              backgroundColor: item.color,
              color: "#fff",
            }}
            onMouseDown={handleMoveStart}
            onDoubleClick={(e) => {
              e.stopPropagation();
              onDoubleClick();
            }}
            onClick={(e) => {
              e.stopPropagation();
              onSelect();
            }}
          >
            {/* Resize handle - left */}
            <div
              className="absolute left-0 top-0 bottom-0 w-2 cursor-ew-resize hover:bg-white/30 opacity-0 group-hover:opacity-100 transition-opacity z-10"
              onMouseDown={(e) => handleResizeStart(e, 'start')}
            />
            
            {/* Resize handle - right */}
            <div
              className="absolute right-0 top-0 bottom-0 w-2 cursor-ew-resize hover:bg-white/30 opacity-0 group-hover:opacity-100 transition-opacity z-10"
              onMouseDown={(e) => handleResizeStart(e, 'end')}
            />
          </div>
        </TooltipTrigger>
        {item.description && (
          <TooltipContent>
            <p className="max-w-xs">{item.description}</p>
          </TooltipContent>
        )}
      </Tooltip>
    </TooltipProvider>
  );
};
