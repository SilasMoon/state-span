import { GanttSwimlane, ZoomLevel } from "@/types/gantt";
import { ChevronRight, ChevronDown, Trash2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GanttBar } from "./GanttBar";
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
  selected: { type: "swimlane" | "activity" | "state"; swimlaneId: string; itemId?: string } | null;
  onSelect: (type: "swimlane" | "activity" | "state", swimlaneId: string, itemId?: string) => void;
  onToggleExpand: (id: string) => void;
  onDelete: (id: string) => void;
  onAddChild: (parentId: string, type: "activity" | "state") => void;
  onAddActivity: (swimlaneId: string, start: number) => void;
  onAddState: (swimlaneId: string, start: number) => void;
  onActivityDoubleClick: (swimlaneId: string, activityId: string) => void;
  onStateDoubleClick: (swimlaneId: string, stateId: string) => void;
  onActivityMove: (fromSwimlaneId: string, activityId: string, toSwimlaneId: string, newStart: number) => void;
  onStateMove: (fromSwimlaneId: string, stateId: string, toSwimlaneId: string, newStart: number) => void;
  onActivityResize: (swimlaneId: string, activityId: string, newStart: number, newDuration: number) => void;
  onStateResize: (swimlaneId: string, stateId: string, newStart: number, newDuration: number) => void;
  onSwimlaneNameChange: (id: string, name: string) => void;
  checkOverlap: (swimlaneId: string, itemId: string, start: number, duration: number) => boolean;
  onDragStateChange: (itemId: string, swimlaneId: string) => (isDragging: boolean, targetSwimlaneId: string | null, tempStart: number, tempDuration: number, mouseX: number, mouseY: number, offsetX?: number, offsetY?: number) => void;
}

export const GanttRow = ({
  swimlane,
  level,
  zoom,
  totalHours,
  selected,
  onSelect,
  onToggleExpand,
  onDelete,
  onAddChild,
  onAddActivity,
  onAddState,
  onActivityDoubleClick,
  onStateDoubleClick,
  onActivityMove,
  onStateMove,
  onActivityResize,
  onStateResize,
  onSwimlaneNameChange,
  checkOverlap,
  onDragStateChange,
}: GanttRowProps) => {
  const columnWidth = zoom === 1 ? 30 : zoom === 2 ? 40 : zoom === 4 ? 50 : zoom === 8 ? 60 : zoom === 12 ? 70 : 80;
  const columns = Math.ceil(totalHours / zoom);

  const hasChildren = swimlane.children.length > 0;

  const renderGrid = () => {
    const cells = [];
    for (let i = 0; i < columns; i++) {
      cells.push(
        <div
          key={i}
          className="border-r border-gantt-grid h-full cursor-pointer"
          style={{ width: `${columnWidth}px`, minWidth: `${columnWidth}px` }}
          onClick={(e) => {
            if (e.detail === 2) return; // ignore double clicks
            const hour = i * zoom;
            if (swimlane.type === "activity") {
              onAddActivity(swimlane.id, hour);
            } else {
              onAddState(swimlane.id, hour);
            }
          }}
        />
      );
    }
    return cells;
  };

  const isRowSelected = selected?.type === 'swimlane' && selected.swimlaneId === swimlane.id;

  return (
    <div
      className={`flex transition-colors border-b border-gantt-grid`}
      data-swimlane-id={swimlane.id}
    >
      <div
        className={`sticky left-0 z-10 bg-card border-r border-border flex items-center gap-2 px-3 py-2 group ${
          isRowSelected ? 'bg-primary/10 ring-2 ring-primary ring-inset' : ''
        }`}
        style={{ width: "280px", minWidth: "280px", paddingLeft: `${level * 20 + 12}px` }}
      >
        {hasChildren && (
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0"
            onClick={() => onToggleExpand(swimlane.id)}
          >
            {swimlane.expanded ? (
              <ChevronDown className="w-4 h-4" />
            ) : (
              <ChevronRight className="w-4 h-4" />
            )}
          </Button>
        )}
        {!hasChildren && <div className="w-6" />}
        
        <input
          type="text"
          value={swimlane.name}
          onChange={(e) => onSwimlaneNameChange(swimlane.id, e.target.value)}
          className="flex-1 bg-transparent border-none outline-none text-sm text-foreground cursor-pointer"
          onClick={() => onSelect('swimlane', swimlane.id)}
        />
        
        <span
          className={`text-xs px-2 py-0.5 rounded ${
            swimlane.type === "activity"
              ? "bg-primary/20 text-primary"
              : "bg-secondary/20 text-secondary"
          }`}
        >
          {swimlane.type}
        </span>

        <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                <Plus className="w-3 h-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => onAddChild(swimlane.id, "activity")}>
                Add Activity Child
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onAddChild(swimlane.id, "state")}>
                Add State Child
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0 text-destructive hover:text-destructive"
            onClick={() => onDelete(swimlane.id)}
          >
            <Trash2 className="w-3 h-3" />
          </Button>
        </div>
      </div>

      <div className="relative flex h-12" style={{ minWidth: `${columns * columnWidth}px` }}>
        <div className="absolute inset-0 flex">{renderGrid()}</div>
        <div className="absolute inset-0 pointer-events-none">
          {swimlane.type === "activity" &&
            swimlane.activities?.map((activity) => (
              <GanttBar
                key={activity.id}
                item={activity}
                swimlaneId={swimlane.id}
                swimlaneType={swimlane.type}
                zoom={zoom}
                columnWidth={columnWidth}
                isSelected={selected?.type === 'activity' && selected.swimlaneId === swimlane.id && selected.itemId === activity.id}
                onDoubleClick={() => onActivityDoubleClick(swimlane.id, activity.id)}
                onSelect={() => onSelect('activity', swimlane.id, activity.id)}
                onMove={(toSwimlaneId, newStart) => onActivityMove(swimlane.id, activity.id, toSwimlaneId, newStart)}
                onResize={(newStart, newDuration) => onActivityResize(swimlane.id, activity.id, newStart, newDuration)}
                checkOverlap={checkOverlap}
                onDragStateChange={onDragStateChange(activity.id, swimlane.id)}
              />
            ))}
          {swimlane.type === "state" &&
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
                onSelect={() => onSelect('state', swimlane.id, state.id)}
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
