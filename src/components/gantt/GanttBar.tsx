import { GanttActivity, GanttState, ZoomLevel } from "@/types/gantt";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import React, { useState } from "react";

interface GanttBarProps {
  item: GanttActivity | GanttState;
  swimlaneId: string;
  swimlaneType: "activity" | "state";
  zoom: ZoomLevel;
  columnWidth: number;
  isSelected: boolean;
  onDoubleClick: () => void;
  onSelect: () => void;
  onMove: (toSwimlaneId: string, newStart: number) => void;
  onResize: (newStart: number, newDuration: number) => void;
  checkOverlap: (swimlaneId: string, itemId: string, start: number, duration: number) => boolean;
  onDragStateChange?: (isDragging: boolean, targetSwimlaneId: string | null, tempStart: number, tempDuration: number, mouseX: number, mouseY: number, offsetX?: number, offsetY?: number) => void;
}

export const GanttBar = ({
  item,
  swimlaneId,
  swimlaneType,
  zoom,
  columnWidth,
  isSelected,
  onDoubleClick,
  onSelect,
  onMove,
  onResize,
  checkOverlap,
  onDragStateChange,
}: GanttBarProps) => {
  const isState = swimlaneType === "state";
  const [isDragging, setIsDragging] = useState<'start' | 'end' | 'move' | null>(null);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0, initialSwimlaneId: swimlaneId, offsetX: 0, offsetY: 0 });
  const [tempStart, setTempStart] = useState(item.start);
  const [tempDuration, setTempDuration] = useState(item.duration);
  const [targetSwimlaneId, setTargetSwimlaneId] = useState(swimlaneId);
  const [isModifierPressed, setIsModifierPressed] = useState(false);

  // Track modifier key for link mode
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.shiftKey || e.ctrlKey || e.metaKey) {
        setIsModifierPressed(true);
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (!e.shiftKey && !e.ctrlKey && !e.metaKey) {
        setIsModifierPressed(false);
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  // Sync local state with props when item changes (but not during drag)
  React.useEffect(() => {
    if (!isDragging) {
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
    setDragStart({ x: e.clientX, y: e.clientY, initialSwimlaneId: swimlaneId, offsetX: 0, offsetY: 0 });
    setTempStart(item.start);
    setTempDuration(item.duration);
    setTargetSwimlaneId(swimlaneId);
  };

  const handleMoveStart = (e: React.MouseEvent) => {
    // Only prevent drag if clicking on resize or link handles
    const target = e.target as HTMLElement;
    console.log('[GanttBar] handleMoveStart called', { itemId: item.id, targetTag: target.tagName, targetClasses: target.className });
    if (target.closest('[data-handle-type]') || target.classList.contains('cursor-ew-resize')) {
      console.log('[GanttBar] Ignoring - clicked on handle');
      return;
    }
    e.stopPropagation();
    e.preventDefault();
    console.log('[GanttBar] Starting move, calling onSelect');
    document.body.style.cursor = 'grabbing';
    onSelect();
    setIsDragging('move');
    
    // Calculate offset from cursor to bar's top-left corner
    const barElement = (e.currentTarget as HTMLElement);
    const barRect = barElement.getBoundingClientRect();
    const offsetX = e.clientX - barRect.left;
    const offsetY = e.clientY - barRect.top;
    
    setDragStart({ x: e.clientX, y: e.clientY, initialSwimlaneId: swimlaneId, offsetX, offsetY });
    setTempStart(item.start);
    setTempDuration(item.duration);
    setTargetSwimlaneId(swimlaneId);
    
    // Notify parent with initial offset
    onDragStateChange?.(true, null, item.start, item.duration, e.clientX, e.clientY, offsetX, offsetY);
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
          const canPlace = !checkOverlap(newSwimlaneId, item.id, newStart, tempDuration);
          document.body.style.cursor = canPlace ? 'grabbing' : 'not-allowed';
          if (canPlace) {
            setTempStart(newStart);
          }
          // Always notify parent with current mouse position for smooth ghost tracking
          onDragStateChange?.(true, newSwimlaneId !== swimlaneId ? newSwimlaneId : null, newStart, tempDuration, e.clientX, e.clientY, dragStart.offsetX, dragStart.offsetY);
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
      document.body.style.cursor = '';
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
      // Notify parent that dragging stopped
      onDragStateChange?.(false, null, item.start, item.duration, 0, 0, 0, 0);
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
            className={`absolute ${isState ? 'h-full' : 'h-6 rounded'} ${isDragging === 'move' ? 'cursor-grabbing' : isModifierPressed ? 'cursor-crosshair' : 'cursor-grab'} group flex items-center justify-center text-xs font-medium shadow-lg hover:shadow-xl transition-all pointer-events-auto ${
              isSelected ? 'ring-2 ring-primary ring-offset-2' : ''
            } ${isDragging === 'move' && targetSwimlaneId !== swimlaneId ? 'opacity-50' : ''} ${isModifierPressed ? 'ring-2 ring-blue-400/50' : ''}`}
            style={{
              left: `${left}px`,
              width: `${width}px`,
              ...(isState ? { top: 0 } : { top: '50%', transform: 'translateY(-50%)' }),
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
              console.log('[GanttBar] onClick called', { itemId: item.id });
              onSelect();
            }}
            data-swimlane-id={swimlaneId}
            data-item-id={item.id}
          >
            {/* Resize handles - show when NOT in link mode */}
            {!isModifierPressed && (
              <>
                {/* Resize handle - left */}
                <div
                  className="absolute left-0 top-0 bottom-0 w-3 cursor-ew-resize hover:bg-white/30 opacity-0 group-hover:opacity-100 transition-opacity z-10"
                  onMouseDown={(e) => handleResizeStart(e, 'start')}
                />
                
                {/* Resize handle - right */}
                <div
                  className="absolute right-0 top-0 bottom-0 w-3 cursor-ew-resize hover:bg-white/30 opacity-0 group-hover:opacity-100 transition-opacity z-10"
                  onMouseDown={(e) => handleResizeStart(e, 'end')}
                />
              </>
            )}

            {/* Link creation handles - show when modifier key pressed */}
            {isModifierPressed && (
              <>
                {/* Left handle (start) */}
                <div
                  className="absolute -left-3 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-blue-500 border-2 border-white opacity-0 group-hover:opacity-100 transition-opacity cursor-crosshair z-20 hover:scale-125"
                  data-handle-type="start"
                  data-swimlane-id={swimlaneId}
                  data-item-id={item.id}
                  onMouseDown={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    console.log('[GanttBar] Link handle START clicked', { itemId: item.id });
                    const event = e.nativeEvent;
                    window.dispatchEvent(new CustomEvent('startLinkDrag', {
                      detail: { swimlaneId, itemId: item.id, handleType: 'start', x: event.clientX, y: event.clientY }
                    }));
                  }}
                  title="Drag from start"
                />
                
                {/* Right handle (finish) */}
                <div
                  className="absolute -right-3 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-green-500 border-2 border-white opacity-0 group-hover:opacity-100 transition-opacity cursor-crosshair z-20 hover:scale-125"
                  data-handle-type="finish"
                  data-swimlane-id={swimlaneId}
                  data-item-id={item.id}
                  onMouseDown={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    console.log('[GanttBar] Link handle FINISH clicked', { itemId: item.id });
                    const event = e.nativeEvent;
                    window.dispatchEvent(new CustomEvent('startLinkDrag', {
                      detail: { swimlaneId, itemId: item.id, handleType: 'finish', x: event.clientX, y: event.clientY }
                    }));
                  }}
                  title="Drag from finish"
                />
              </>
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent>
          {item.description && <p className="max-w-xs mb-2">{item.description}</p>}
          {!isModifierPressed && (
            <p className="text-xs text-muted-foreground italic">
              Hold Shift/Ctrl to create links
            </p>
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
