import { GanttActivity, GanttState, ZoomLevel } from "@/types/gantt";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Trash2, Link2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import React, { useState } from "react";

interface GanttBarProps {
  item: GanttActivity | GanttState;
  swimlaneId: string;
  zoom: ZoomLevel;
  columnWidth: number;
  onDoubleClick: () => void;
  onStartLinking: () => void;
  onDelete: () => void;
  onResize: (newStart: number, newDuration: number) => void;
}

export const GanttBar = ({
  item,
  zoom,
  columnWidth,
  onDoubleClick,
  onStartLinking,
  onDelete,
  onResize,
}: GanttBarProps) => {
  const [isDragging, setIsDragging] = useState<'start' | 'end' | null>(null);
  const [dragStart, setDragStart] = useState(0);
  const [tempStart, setTempStart] = useState(item.start);
  const [tempDuration, setTempDuration] = useState(item.duration);

  const left = (tempStart / zoom) * columnWidth;
  const width = (tempDuration / zoom) * columnWidth;

  const handleResizeStart = (e: React.MouseEvent, handle: 'start' | 'end') => {
    e.stopPropagation();
    setIsDragging(handle);
    setDragStart(e.clientX);
    setTempStart(item.start);
    setTempDuration(item.duration);
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging) return;
    
    const delta = e.clientX - dragStart;
    const hoursDelta = Math.round((delta / columnWidth) * zoom);
    
    if (isDragging === 'start') {
      const newStart = Math.max(0, item.start + hoursDelta);
      const newDuration = Math.max(zoom, item.duration - hoursDelta);
      setTempStart(newStart);
      setTempDuration(newDuration);
    } else {
      const newDuration = Math.max(zoom, item.duration + hoursDelta);
      setTempDuration(newDuration);
    }
  };

  const handleMouseUp = () => {
    if (isDragging) {
      onResize(tempStart, tempDuration);
      setIsDragging(null);
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
            className="absolute top-1 h-10 rounded cursor-pointer group flex items-center justify-center text-xs font-medium shadow-lg hover:shadow-xl transition-all pointer-events-auto"
            style={{
              left: `${left}px`,
              width: `${width}px`,
              backgroundColor: item.color,
              color: "#fff",
            }}
            onDoubleClick={onDoubleClick}
          >
            {/* Resize handle - left */}
            <div
              className="absolute left-0 top-0 bottom-0 w-2 cursor-ew-resize hover:bg-white/30 opacity-0 group-hover:opacity-100 transition-opacity"
              onMouseDown={(e) => handleResizeStart(e, 'start')}
            />
            
            {/* Resize handle - right */}
            <div
              className="absolute right-0 top-0 bottom-0 w-2 cursor-ew-resize hover:bg-white/30 opacity-0 group-hover:opacity-100 transition-opacity"
              onMouseDown={(e) => handleResizeStart(e, 'end')}
            />

            <div className="absolute -right-8 top-0 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 bg-card hover:bg-primary"
                onClick={(e) => {
                  e.stopPropagation();
                  onStartLinking();
                }}
              >
                <Link2 className="w-3 h-3" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 bg-card hover:bg-destructive text-destructive hover:text-destructive-foreground"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete();
                }}
              >
                <Trash2 className="w-3 h-3" />
              </Button>
            </div>
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
