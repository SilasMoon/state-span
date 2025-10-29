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

  // Sync local state with props when item changes (but not during drag)
  React.useEffect(() => {
    if (!isDragging) {
      console.log('=== SYNCING STATE ===');
      console.log('item.id:', item.id);
      console.log('item.start:', item.start);
      console.log('item.duration:', item.duration);
      console.log('Setting tempStart to:', item.start);
      setTempStart(item.start);
      setTempDuration(item.duration);
    }
  }, [item.start, item.duration, isDragging]);

  const left = (tempStart / zoom) * columnWidth;
  const width = (tempDuration / zoom) * columnWidth;

  const snapToGrid = (value: number) => {
    return Math.round(value / zoom) * zoom;
  };

  const handleResizeStart = (e: React.MouseEvent, handle: 'start' | 'end') => {
    e.stopPropagation();
    e.preventDefault();
    document.body.style.cursor = 'ew-resize';
    setIsDragging(handle);
    setDragStart({ x: e.clientX, y: e.clientY, initialSwimlaneId: swimlaneId });
    setTempStart(item.start);
    setTempDuration(item.duration);
    setTargetSwimlaneId(swimlaneId);
  };

  const handleMoveStart = (e: React.MouseEvent) => {
    // Only prevent drag if clicking on resize or link handles
    const target = e.target as HTMLElement;
    if (target.closest('[data-handle-type]') || target.classList.contains('cursor-ew-resize')) return;
    e.stopPropagation();
    e.preventDefault();
    document.body.style.cursor = 'grabbing';
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
      console.log('handleMouseMove - deltaX:', deltaX);
      console.log('columnWidth:', columnWidth, 'zoom:', zoom);
      const hoursDelta = Math.round((deltaX / columnWidth) * zoom);
      console.log('hoursDelta:', hoursDelta);
      const newStart = snapToGrid(Math.max(0, item.start + hoursDelta));
      console.log('item.start:', item.start, 'newStart:', newStart);
      
      // Detect swimlane change by finding element under cursor
      const swimlaneElement = document.elementFromPoint(e.clientX, e.clientY);
      const rowElement = swimlaneElement?.closest('[data-swimlane-id]');
      if (rowElement) {
        const newSwimlaneId = rowElement.getAttribute('data-swimlane-id');
        console.log('newSwimlaneId:', newSwimlaneId);
        if (newSwimlaneId) {
          setTargetSwimlaneId(newSwimlaneId);
          // Check overlap in target swimlane
          const canPlace = !checkOverlap(newSwimlaneId, item.id, newStart, tempDuration);
          console.log('canPlace:', canPlace, 'newStart:', newStart);
          document.body.style.cursor = canPlace ? 'grabbing' : 'not-allowed';
          if (canPlace) {
            console.log('Setting tempStart to:', newStart);
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
      console.log('=== MOUSE UP ===');
      console.log('isDragging:', isDragging);
      console.log('targetSwimlaneId:', targetSwimlaneId);
      console.log('tempStart:', tempStart);
      console.log('tempDuration:', tempDuration);
      console.log('item.id:', item.id);
      
      document.body.style.cursor = '';
      if (isDragging === 'move') {
        const hasOverlap = checkOverlap(targetSwimlaneId, item.id, tempStart, tempDuration);
        console.log('checkOverlap result:', hasOverlap);
        
        if (!hasOverlap) {
          console.log('Calling onMove with:', targetSwimlaneId, tempStart);
          onMove(targetSwimlaneId, tempStart);
        } else {
          console.log('Move blocked by overlap');
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDragging, tempStart, tempDuration, targetSwimlaneId]);

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className={`absolute h-6 rounded ${isDragging === 'move' ? 'cursor-grabbing' : 'cursor-grab'} group flex items-center justify-center text-xs font-medium shadow-lg hover:shadow-xl transition-all pointer-events-auto ${
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
