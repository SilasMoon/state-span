import React, { useState } from "react";
import { GanttSwimlane, ZoomLevel } from "@/types/gantt";
import { ChevronRight, ChevronDown, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GanttBar } from "./GanttBar";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface GanttRowProps {
  swimlane: GanttSwimlane;
  level: number;
  zoom: ZoomLevel;
  totalHours: number;
  swimlaneColumnWidth: number;
  selected: { type: "swimlane" | "task" | "state"; swimlaneId: string; itemId?: string } | null;
  onSelect: (type: "swimlane" | "task" | "state", swimlaneId: string, itemId?: string) => void;
  onToggleExpand: (id: string) => void;
  onDelete: (id: string) => void;
  onAddChild: (parentId: string, type: "task" | "state") => void;
  onCreateByDrag: (swimlaneId: string, start: number, duration: number) => void;
  onTaskDoubleClick: (swimlaneId: string, taskId: string) => void;
  onStateDoubleClick: (swimlaneId: string, stateId: string) => void;
  onTaskMove: (fromSwimlaneId: string, taskId: string, toSwimlaneId: string, newStart: number) => void;
  onStateMove: (fromSwimlaneId: string, stateId: string, toSwimlaneId: string, newStart: number) => void;
  onTaskResize: (swimlaneId: string, taskId: string, newStart: number, newDuration: number) => void;
  onStateResize: (swimlaneId: string, stateId: string, newStart: number, newDuration: number) => void;
  onSwimlaneNameChange: (id: string, name: string) => void;
  onSwimlaneDrop: (swimlaneId: string, targetParentId: string | null, insertBeforeId: string | null) => void;
  checkOverlap: (swimlaneId: string, itemId: string, start: number, duration: number) => boolean;
  onDragStateChange: (itemId: string, swimlaneId: string) => (isDragging: boolean, targetSwimlaneId: string | null, tempStart: number, tempDuration: number, mouseX: number, mouseY: number, offsetX?: number, offsetY?: number) => void;
}

export const GanttRow = ({
  swimlane,
  level,
  zoom,
  totalHours,
  swimlaneColumnWidth,
  selected,
  onSelect,
  onToggleExpand,
  onDelete,
  onAddChild,
  onCreateByDrag,
  onTaskDoubleClick,
  onStateDoubleClick,
  onTaskMove,
  onStateMove,
  onTaskResize,
  onStateResize,
  onSwimlaneNameChange,
  onSwimlaneDrop,
  checkOverlap,
  onDragStateChange,
}: GanttRowProps) => {
  const columnWidth = zoom === 0.5 ? 36 : zoom === 1 ? 20 : zoom === 2 ? 28 : zoom === 4 ? 36 : zoom === 8 ? 44 : zoom === 12 ? 52 : 60;
  const columns = Math.ceil(totalHours / zoom);

  const hasChildren = swimlane.children.length > 0;

  const [dragCreation, setDragCreation] = useState<{
    startHour: number;
    currentHour: number;
    hasMoved: boolean;
  } | null>(null);

  const [dragOver, setDragOver] = useState<'top' | 'bottom' | 'inside' | null>(null);

  const renderGrid = () => {
    const cells = [];
    for (let i = 0; i < columns; i++) {
      cells.push(
        <div
          key={i}
          data-cell-index={i}
          className="border-r border-gantt-grid h-full cursor-crosshair"
          style={{ width: `${columnWidth}px`, minWidth: `${columnWidth}px` }}
          onMouseDown={(e) => {
            if (e.button !== 0) return; // Only left click
            
            // Disable drag creation for parent swimlanes
            if (hasChildren) {
              return;
            }
            
            // Check if there's a bar or handle at the click position
            const elementsAtPoint = document.elementsFromPoint(e.clientX, e.clientY);
            const clickedOnBar = elementsAtPoint.some(el => el.hasAttribute('data-item-id'));
            const clickedOnHandle = elementsAtPoint.some(el => el.hasAttribute('data-handle-type'));
            
            console.log('[GanttRow] Grid cell mousedown:', {
              clickedOnBar,
              clickedOnHandle,
              elementsAtPoint: elementsAtPoint.map(el => ({
                tag: el.tagName,
                classes: el.className,
                dataItemId: el.getAttribute('data-item-id'),
                dataHandleType: el.getAttribute('data-handle-type')
              }))
            });
            
            if (clickedOnBar || clickedOnHandle) {
              // Let the bar handle its own events
              console.log('[GanttRow] Returning early - bar or handle detected');
              return;
            }
            
            e.preventDefault();
            e.stopPropagation();
            console.log('[GanttRow] Starting drag creation');
            const hour = i * zoom;
            setDragCreation({ startHour: hour, currentHour: hour, hasMoved: false });
          }}
        />
      );
    }
    return cells;
  };

  // Handle drag creation
  React.useEffect(() => {
    if (!dragCreation) return;

    const handleMouseMove = (e: MouseEvent) => {
      const target = document.elementFromPoint(e.clientX, e.clientY);
      const cell = target?.closest('[data-cell-index]');
      if (cell) {
        const cellIndex = parseInt(cell.getAttribute('data-cell-index') || '0');
        const currentHour = cellIndex * zoom;
        setDragCreation(prev => {
          if (!prev) return null;
          const hasMoved = prev.startHour !== currentHour;
          return { ...prev, currentHour, hasMoved };
        });
      }
    };

    const handleMouseUp = () => {
      if (dragCreation) {
        // Only create if the user actually dragged to a different cell
        if (dragCreation.hasMoved) {
          const start = Math.min(dragCreation.startHour, dragCreation.currentHour);
          const end = Math.max(dragCreation.startHour, dragCreation.currentHour);
          const duration = Math.max(zoom, end - start + zoom); // Minimum 1 column

          // Check for overlap before creating
          if (!checkOverlap(swimlane.id, 'temp-creation', start, duration)) {
            onCreateByDrag(swimlane.id, start, duration);
          } else {
            toast.error("Cannot create: overlaps with existing item");
          }
        }

        setDragCreation(null);
      }
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [dragCreation, zoom, swimlane.id, onCreateByDrag, checkOverlap]);

  const isRowSelected = selected?.type === 'swimlane' && selected.swimlaneId === swimlane.id;

  // Drag and drop handlers for swimlane reordering
  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('swimlane-id', swimlane.id);
    e.dataTransfer.setData('swimlane-type', swimlane.type);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    const draggedId = e.dataTransfer.types.includes('swimlane-id') ? 'swimlane' : null;
    if (!draggedId) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const height = rect.height;
    
    // Determine drop zone: top third, middle third, or bottom third
    if (y < height * 0.25) {
      setDragOver('top');
    } else if (y > height * 0.75) {
      setDragOver('bottom');
    } else {
      setDragOver('inside');
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    if (e.currentTarget === e.target) {
      setDragOver(null);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    const draggedId = e.dataTransfer.getData('swimlane-id');
    const draggedType = e.dataTransfer.getData('swimlane-type');
    
    if (!draggedId || draggedId === swimlane.id) {
      setDragOver(null);
      return;
    }

    // Check type compatibility for 'inside' drop
    if (dragOver === 'inside' && draggedType !== swimlane.type) {
      toast.error(`Cannot move ${draggedType} swimlane into ${swimlane.type} swimlane`);
      setDragOver(null);
      return;
    }

    if (dragOver === 'top') {
      // Insert before this swimlane
      onSwimlaneDrop(draggedId, swimlane.parentId || null, swimlane.id);
      toast.success("Swimlane moved");
    } else if (dragOver === 'bottom') {
      // Insert after this swimlane by passing this ID as insertBeforeId with special handling
      // The moveSwimlane function will need to handle finding the next sibling
      onSwimlaneDrop(draggedId, swimlane.parentId || null, `after:${swimlane.id}`);
      toast.success("Swimlane moved");
    } else if (dragOver === 'inside') {
      // Make this swimlane the parent
      onSwimlaneDrop(draggedId, swimlane.id, null);
      toast.success("Swimlane moved");
    }

    setDragOver(null);
  };

  return (
    <div
      className={`flex transition-colors relative ${
        dragOver === 'top' ? 'border-t-4 border-t-primary' : ''
      } ${dragOver === 'bottom' ? 'border-b-4 border-b-primary' : ''} ${
        dragOver === 'inside' ? 'bg-primary/10' : ''
      }`}
      data-swimlane-id={swimlane.id}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div
        className={`sticky left-0 z-30 bg-card border-r border-border flex items-center gap-2 px-3 py-2 group transition-colors relative ${
          isRowSelected ? 'bg-primary/20 ring-2 ring-primary' : 'hover:bg-muted/50'
        }`}
        style={{ width: `${swimlaneColumnWidth}px`, minWidth: `${swimlaneColumnWidth}px`, paddingLeft: `${level * 20 + 12}px` }}
        draggable
        onDragStart={handleDragStart}
      >
        {/* Background clickable area for selection */}
        <div
          className="absolute inset-0 cursor-pointer z-0"
          onClick={(e) => {
            e.stopPropagation();
            onSelect('swimlane', swimlane.id);
          }}
        />
        {hasChildren && (
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0 flex-shrink-0 relative z-10"
            onClick={(e) => {
              e.stopPropagation();
              onToggleExpand(swimlane.id);
            }}
          >
            {swimlane.expanded ? (
              <ChevronDown className="w-4 h-4" />
            ) : (
              <ChevronRight className="w-4 h-4" />
            )}
          </Button>
        )}
        {!hasChildren && <div className="w-6 flex-shrink-0" />}
        
        <input
          type="text"
          value={swimlane.name}
          onChange={(e) => onSwimlaneNameChange(swimlane.id, e.target.value)}
          className="bg-transparent border-none outline-none text-sm text-foreground cursor-text min-w-0 flex-1 focus:ring-1 focus:ring-primary/30 rounded px-1 relative z-10"
          onClick={(e) => {
            e.stopPropagation();
          }}
          onKeyDown={(e) => {
            e.stopPropagation();
          }}
        />
        
        <div className="flex items-center gap-2 flex-shrink-0 relative z-10">
          <span
            className={`text-xs px-2 py-0.5 rounded whitespace-nowrap ${
              swimlane.type === "task"
                ? "bg-primary/20 text-primary"
                : "bg-secondary/20 text-secondary"
            }`}
          >
            {swimlane.type}
          </span>

          <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-6 w-6 p-0"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Plus className="w-3 h-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => onAddChild(swimlane.id, "task")}>
                  Add Task Child
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onAddChild(swimlane.id, "state")}>
                  Add State Child
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      <div className="relative flex h-12" style={{ minWidth: `${columns * columnWidth}px` }}>
        <div className="absolute inset-0 flex">{renderGrid()}</div>
        
        {/* Drag creation preview */}
        {dragCreation && (() => {
          const start = Math.min(dragCreation.startHour, dragCreation.currentHour);
          const end = Math.max(dragCreation.startHour, dragCreation.currentHour);
          const duration = end - start + zoom;
          
          const left = (start / zoom) * columnWidth;
          const width = (duration / zoom) * columnWidth;
          const isTaskLane = swimlane.type === 'task';
          const wouldOverlap = checkOverlap(swimlane.id, 'temp-creation', start, duration);
          
          return (
            <div
              className={`absolute ${isTaskLane ? 'h-6 rounded top-1/2 -translate-y-1/2' : 'h-full top-0'} border-2 border-dashed pointer-events-none z-30`}
              style={{
                left: `${left}px`,
                width: `${width}px`,
                backgroundColor: wouldOverlap 
                  ? 'rgba(239, 68, 68, 0.3)' 
                  : (isTaskLane ? 'rgba(59, 130, 246, 0.3)' : 'rgba(168, 85, 247, 0.3)'),
                borderColor: wouldOverlap 
                  ? 'rgb(239, 68, 68)' 
                  : (isTaskLane ? 'rgb(59, 130, 246)' : 'rgb(168, 85, 247)'),
              }}
            />
          );
        })()}
        
        <div className="absolute inset-0 pointer-events-none">
          {/* Render thick horizontal dark grey delimiter for root-level swimlanes with children */}
          {!swimlane.parentId && hasChildren && (
            <div 
              className="absolute top-1/2 left-0 right-0 h-1 bg-gray-700 pointer-events-none z-10"
              style={{ 
                transform: 'translateY(-50%)',
                boxShadow: '0 0 4px rgba(0, 0, 0, 0.2)'
              }}
            />
          )}
          
          {/* Render individual items for leaf swimlanes */}
          {!hasChildren && swimlane.type === "task" &&
            swimlane.tasks?.map((task) => (
              <GanttBar
                key={task.id}
                item={task}
                swimlaneId={swimlane.id}
                swimlaneType={swimlane.type}
                zoom={zoom}
                columnWidth={columnWidth}
                isSelected={selected?.type === 'task' && selected.swimlaneId === swimlane.id && selected.itemId === task.id}
                onDoubleClick={() => onTaskDoubleClick(swimlane.id, task.id)}
                onSelect={() => {
                  console.log('[GanttRow] Task onSelect callback', { swimlaneId: swimlane.id, taskId: task.id });
                  onSelect('task', swimlane.id, task.id);
                }}
                onMove={(toSwimlaneId, newStart) => onTaskMove(swimlane.id, task.id, toSwimlaneId, newStart)}
                onResize={(newStart, newDuration) => onTaskResize(swimlane.id, task.id, newStart, newDuration)}
                checkOverlap={checkOverlap}
                onDragStateChange={onDragStateChange(task.id, swimlane.id)}
              />
            ))}
          {!hasChildren && swimlane.type === "state" &&
            swimlane.states?.map((state) => (
              <GanttBar
                key={state.id}
                item={state}
                swimlaneId={swimlane.id}
                swimlaneType={swimlane.type}
                zoom={zoom}
                columnWidth={columnWidth}
                isSelected={selected?.type === 'state' && selected.swimlaneId === swimlane.id && selected.itemId === state.id}
                onDoubleClick={() => onStateDoubleClick(swimlane.id, state.id)}
                onSelect={() => {
                  console.log('[GanttRow] State onSelect callback', { swimlaneId: swimlane.id, stateId: state.id });
                  onSelect('state', swimlane.id, state.id);
                }}
                onMove={(toSwimlaneId, newStart) => onStateMove(swimlane.id, state.id, toSwimlaneId, newStart)}
                onResize={(newStart, newDuration) => onStateResize(swimlane.id, state.id, newStart, newDuration)}
                checkOverlap={checkOverlap}
                onDragStateChange={onDragStateChange(state.id, swimlane.id)}
              />
            ))}
        </div>
      </div>
    </div>
  );
};
