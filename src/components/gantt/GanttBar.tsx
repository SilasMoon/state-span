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

const formatHoursToDayTime = (hours: number): string => {
  const day = Math.floor(hours / 24) + 1;
  const hourOfDay = Math.floor(hours % 24);
  const minutes = Math.round((hours % 1) * 60);
  return `Day ${day}, ${String(hourOfDay).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
};

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
  const endHour = item.start + item.duration;
  const startFormatted = formatHoursToDayTime(item.start);
  const endFormatted = formatHoursToDayTime(endHour);
  const [isDragging, setIsDragging] = useState<'start' | 'end' | 'move' | null>(null);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0, initialSwimlaneId: swimlaneId, offsetX: 0, offsetY: 0 });
  const [tempStart, setTempStart] = useState(item.start);
  const [tempDuration, setTempDuration] = useState(item.duration);
  const [targetSwimlaneId, setTargetSwimlaneId] = useState(swimlaneId);
  const [modifierKeyState, setModifierKeyState] = useState(0);

  console.log('[GanttBar] Render', { itemId: item.id, isSelected, modifierKeyState });

  // Track modifier key state globally to force re-render
  React.useEffect(() => {
    const handleKeyChange = (e: KeyboardEvent) => {
      const isPressed = e.shiftKey || e.ctrlKey || e.metaKey;
      console.log('[GanttBar] Modifier key changed', { itemId: item.id, isPressed, shiftKey: e.shiftKey, ctrlKey: e.ctrlKey, metaKey: e.metaKey });
      setModifierKeyState(prev => isPressed ? prev + 1 : 0);
    };
    
    window.addEventListener('keydown', handleKeyChange);
    window.addEventListener('keyup', handleKeyChange);
    return () => {
      window.removeEventListener('keydown', handleKeyChange);
      window.removeEventListener('keyup', handleKeyChange);
    };
  }, [item.id]);

  // Check current modifier key state
  const isModifierPressed = modifierKeyState > 0;

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
    <>
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
              console.log('[GanttBar] onClick called, calling onSelect', { itemId: item.id });
              onSelect();
            }}
              data-swimlane-id={swimlaneId}
              data-item-id={item.id}
            >
              {/* Display label inside the bar */}
              {item.label && (
                <span className="px-2 truncate text-shadow-sm" style={{ textShadow: '0 1px 2px rgba(0,0,0,0.3)' }}>
                  {item.label}
                </span>
              )}
              
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
            </div>
          </TooltipTrigger>
          <TooltipContent className="max-w-sm">
            <div className="space-y-2">
              <div className="space-y-1">
                <div className="flex justify-between gap-4 text-sm">
                  <span className="font-medium">Start:</span>
                  <span>{startFormatted}</span>
                </div>
                <div className="flex justify-between gap-4 text-sm">
                  <span className="font-medium">End:</span>
                  <span>{endFormatted}</span>
                </div>
                <div className="flex justify-between gap-4 text-sm">
                  <span className="font-medium">Duration:</span>
                  <span>{item.duration} hours</span>
                </div>
              </div>
              {item.description && (
                <div className="pt-2 border-t border-border">
                  <p className="text-sm">{item.description}</p>
                </div>
              )}
              {!isModifierPressed && (
                <p className="text-xs text-muted-foreground italic pt-2 border-t border-border">
                  Hold Shift/Ctrl to create links
                </p>
              )}
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      {/* Link creation handles - positioned absolutely at bar edges */}
      {isModifierPressed && (
        <>
          {/* Left handle (start) */}
          <div
            className="absolute w-5 h-5 rounded-full bg-blue-500 border-2 border-white transition-all cursor-crosshair z-[100] hover:scale-125 pointer-events-auto"
            style={{
              left: `${left - 12}px`,
              ...(isState ? { top: '50%' } : { top: '50%' }),
              transform: 'translateY(-50%)',
            }}
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
            className="absolute w-5 h-5 rounded-full bg-green-500 border-2 border-white transition-all cursor-crosshair z-[100] hover:scale-125 pointer-events-auto"
            style={{
              left: `${left + width - 12}px`,
              ...(isState ? { top: '50%' } : { top: '50%' }),
              transform: 'translateY(-50%)',
            }}
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
    </>
  );
};
