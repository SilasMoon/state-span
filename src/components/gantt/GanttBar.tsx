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
  const [dragStart, setDragStart] = useState({ x: 0, y: 0, initialSwimlaneId: swimlaneId });
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
    setDragStart({ x: e.clientX, y: e.clientY, initialSwimlaneId: swimlaneId });
    setTempStart(item.start);
    setTempDuration(item.duration);
    setTargetSwimlaneId(swimlaneId);
  };

  const handleMoveStart = (e: React.MouseEvent) => {
    if (e.target !== e.currentTarget) return;
    e.stopPropagation();
    onSelect();
    setIsDragging('move');
    setDragStart({ x: e.clientX, y: e.clientY, initialSwimlaneId: swimlaneId });
    setTempStart(item.start);
    setTempDuration(item.duration);
    setTargetSwimlaneId(swimlaneId);
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging) return;
    
    if (isDragging === 'move') {
      const deltaX = e.clientX - dragStart.x;
      const hoursDelta = Math.round((deltaX / columnWidth) * zoom);
      const newStart = snapToGrid(Math.max(0, item.start + hoursDelta));
      
      // Detect swimlane change by finding element under cursor
      const swimlaneElement = document.elementFromPoint(e.clientX, e.clientY);
      const rowElement = swimlaneElement?.closest('[data-swimlane-id]');
      if (rowElement) {
        const newSwimlaneId = rowElement.getAttribute('data-swimlane-id');
        if (newSwimlaneId) {
          setTargetSwimlaneId(newSwimlaneId);
          // Check overlap in target swimlane
          if (!checkOverlap(newSwimlaneId, item.id, newStart, tempDuration)) {
            setTempStart(newStart);
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
      
      if (!checkOverlap(swimlaneId, item.id, tempStart, newDuration)) {
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
            className={`absolute h-6 rounded cursor-move group flex items-center justify-center text-xs font-medium shadow-lg hover:shadow-xl transition-all pointer-events-auto ${
              isSelected ? 'ring-2 ring-primary ring-offset-2' : ''
            }`}
            style={{
              left: `${left}px`,
              width: `${width}px`,
              top: '50%',
              transform: 'translateY(-50%)',
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
            data-swimlane-id={swimlaneId}
            data-item-id={item.id}
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

            {/* Link creation handles */}
            {/* Left handle (start) */}
            <div
              className="absolute -left-2 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-blue-500 border-2 border-white opacity-0 group-hover:opacity-100 transition-opacity cursor-crosshair z-20 hover:scale-125"
              data-handle-type="start"
              data-swimlane-id={swimlaneId}
              data-item-id={item.id}
              onMouseDown={(e) => {
                e.stopPropagation();
                const event = e.nativeEvent;
                window.dispatchEvent(new CustomEvent('startLinkDrag', {
                  detail: { swimlaneId, itemId: item.id, handleType: 'start', x: event.clientX, y: event.clientY }
                }));
              }}
              title="Drag from start"
            />
            
            {/* Right handle (finish) */}
            <div
              className="absolute -right-2 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-green-500 border-2 border-white opacity-0 group-hover:opacity-100 transition-opacity cursor-crosshair z-20 hover:scale-125"
              data-handle-type="finish"
              data-swimlane-id={swimlaneId}
              data-item-id={item.id}
              onMouseDown={(e) => {
                e.stopPropagation();
                const event = e.nativeEvent;
                window.dispatchEvent(new CustomEvent('startLinkDrag', {
                  detail: { swimlaneId, itemId: item.id, handleType: 'finish', x: event.clientX, y: event.clientY }
                }));
              }}
              title="Drag from finish"
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
