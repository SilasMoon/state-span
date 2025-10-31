import { GanttTask, GanttState, ZoomConfig } from "@/types/gantt";
import React, { useState } from "react";
import { createPortal } from "react-dom";

interface GanttBarProps {
  item: GanttTask | GanttState;
  swimlaneId: string;
  swimlaneType: "task" | "state";
  zoom: ZoomConfig;
  columnWidth: number;
  isSelected: boolean;
  isSummary?: boolean;
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
  isSummary = false,
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
  const [isTooltipDragging, setIsTooltipDragging] = useState(false);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(null);
  const [tooltipDragOffset, setTooltipDragOffset] = useState({ x: 0, y: 0 });

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

  // Reset tooltip position when selection changes
  React.useEffect(() => {
    if (!isSelected) {
      setTooltipPos(null);
    }
  }, [isSelected]);

  const left = (tempStart / zoom.hoursPerColumn) * columnWidth;
  const width = (tempDuration / zoom.hoursPerColumn) * columnWidth;

  const snapToGrid = (value: number) => {
    return Math.round(value / zoom.hoursPerColumn) * zoom.hoursPerColumn;
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
    // Disable interaction for summary bars
    if (isSummary) return;
    
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
      const hoursDelta = Math.round((deltaX / columnWidth) * zoom.hoursPerColumn);
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
      const hoursDelta = Math.round((delta / columnWidth) * zoom.hoursPerColumn);
      const newStart = snapToGrid(Math.max(0, item.start + hoursDelta));
      const newDuration = snapToGrid(Math.max(zoom.hoursPerColumn, item.duration - hoursDelta));
      
      if (!checkOverlap(swimlaneId, item.id, newStart, newDuration)) {
        setTempStart(newStart);
        setTempDuration(newDuration);
      }
    } else if (isDragging === 'end') {
      const delta = e.clientX - dragStart.x;
      const hoursDelta = Math.round((delta / columnWidth) * zoom.hoursPerColumn);
      const newDuration = snapToGrid(Math.max(zoom.hoursPerColumn, item.duration + hoursDelta));
      
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

  const handleTooltipMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setIsTooltipDragging(true);
    const tooltipElement = (e.currentTarget as HTMLElement);
    const rect = tooltipElement.getBoundingClientRect();
    setTooltipDragOffset({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    });
  };

  const handleTooltipMouseMove = (e: MouseEvent) => {
    if (isTooltipDragging) {
      setTooltipPos({
        x: e.clientX - tooltipDragOffset.x,
        y: e.clientY - tooltipDragOffset.y
      });
    }
  };

  const handleTooltipMouseUp = () => {
    setIsTooltipDragging(false);
  };

  React.useEffect(() => {
    if (isTooltipDragging) {
      document.addEventListener('mousemove', handleTooltipMouseMove);
      document.addEventListener('mouseup', handleTooltipMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleTooltipMouseMove);
        document.removeEventListener('mouseup', handleTooltipMouseUp);
      };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isTooltipDragging, tooltipDragOffset]);

  return (
    <>
      <div
        className={`absolute ${isSummary ? 'h-0.5' : isState ? 'h-[22px]' : 'h-6 rounded'} ${isSummary ? 'cursor-default' : isDragging === 'move' ? 'cursor-grabbing' : isModifierPressed ? 'cursor-crosshair' : 'cursor-grab'} group flex items-center justify-center text-xs font-medium ${isSummary ? '' : 'shadow-lg hover:shadow-xl'} transition-all pointer-events-auto ${
          isSelected ? 'ring-2 ring-primary ring-offset-2 z-50' : 'z-10'
        } ${isDragging === 'move' && targetSwimlaneId !== swimlaneId ? 'opacity-50' : ''} ${isModifierPressed && !isSummary ? 'ring-2 ring-blue-400/50' : ''}`}
        style={{
          left: `${left}px`,
          width: `${width}px`,
          top: '50%',
          transform: 'translateY(-50%)',
          backgroundColor: isSummary ? '#9ca3af' : isState ? `${item.color}80` : item.color,
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
        onMouseMove={(e) => {
          if (isSelected && !tooltipPos && !isTooltipDragging) {
            const rect = e.currentTarget.getBoundingClientRect();
            setTooltipPos({
              x: rect.right + 10,
              y: rect.top
            });
          }
        }}
        data-swimlane-id={swimlaneId}
        data-item-id={item.id}
      >
              {/* Display label inside the bar (not for summary) */}
              {item.label && !isSummary && (
                <span 
                  className="px-2 truncate font-medium text-shadow-sm" 
                  style={{ 
                    color: item.labelColor || '#000000',
                    textShadow: '0 1px 2px rgba(255,255,255,0.5)'
                  }}
                >
                  {item.label}
                </span>
              )}
              
              {/* End markers for summary bars */}
              {isSummary && (
                <>
                  <div className="absolute left-0 w-0.5 h-3 bg-gray-400" style={{ top: '50%', transform: 'translateY(-50%)' }} />
                  <div className="absolute right-0 w-0.5 h-3 bg-gray-400" style={{ top: '50%', transform: 'translateY(-50%)' }} />
                </>
              )}
              
        {/* Resize handles - show when NOT in link mode and NOT summary */}
        {!isModifierPressed && !isSummary && (
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

      {/* Custom draggable tooltip */}
      {isSelected && tooltipPos && createPortal(
        <div
          className="fixed z-[100] max-w-sm rounded-md border bg-popover px-3 py-2 text-sm text-popover-foreground shadow-md cursor-move select-none"
          style={{
            left: `${tooltipPos.x}px`,
            top: `${tooltipPos.y}px`,
          }}
          onMouseDown={handleTooltipMouseDown}
        >
          <div className="space-y-2">
            {item.label && (
              <div className="font-semibold text-base">
                {item.label}
              </div>
            )}
            {item.description && (
              <div className={item.label ? "pt-2 border-t border-border" : ""}>
                <p className="text-sm">{item.description}</p>
              </div>
            )}
            <div className={`space-y-1 ${(item.label || item.description) ? "pt-2 border-t border-border" : ""}`}>
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
            {!isModifierPressed && !isSummary && (
              <p className="text-xs text-muted-foreground italic pt-2 border-t border-border">
                Hold Shift/Ctrl to create links
              </p>
            )}
            {isSummary && (
              <p className="text-xs text-muted-foreground italic pt-2 border-t border-border">
                Summary bar (read-only)
              </p>
            )}
          </div>
        </div>,
        document.body
      )}

      {/* Link creation handles - positioned absolutely at bar edges (not for summary bars) */}
      {isModifierPressed && !isSummary && (
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
            ref={(el) => {
              if (el && isModifierPressed) {
                const rect = el.getBoundingClientRect();
                const parentRect = el.parentElement?.getBoundingClientRect();
                console.log('[GanttBar] START handle', {
                  itemId: item.id,
                  barLeft: left,
                  handleStyleLeft: left - 12,
                  handleAbsLeft: rect.left,
                  handleCenterX: rect.left + rect.width / 2,
                  parentLeft: parentRect?.left,
                  relativeToParent: rect.left - (parentRect?.left || 0) + rect.width / 2
                });
              }
            }}
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
