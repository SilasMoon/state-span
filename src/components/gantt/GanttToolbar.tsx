import { Button } from "@/components/ui/button";
import { ZoomIn, ZoomOut, Plus } from "lucide-react";
import { ZoomLevel } from "@/types/gantt";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface GanttToolbarProps {
  zoom: ZoomLevel;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onAddActivityLane: () => void;
  onAddStateLane: () => void;
}

export const GanttToolbar = ({
  zoom,
  onZoomIn,
  onZoomOut,
  onAddActivityLane,
  onAddStateLane,
}: GanttToolbarProps) => {
  const getZoomLabel = () => {
    if (zoom === 1) return "1h";
    if (zoom === 24) return "1d";
    return `${zoom}h`;
  };

  return (
    <div className="flex items-center gap-2 p-3 bg-card border-b border-border">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm">
            <Plus className="w-4 h-4 mr-2" />
            Add Swimlane
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem onClick={onAddActivityLane}>
            Activity Swimlane
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onAddStateLane}>
            State Swimlane
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <div className="flex-1" />

      <span className="text-sm text-muted-foreground">Zoom: {getZoomLabel()}</span>
      <Button
        variant="outline"
        size="sm"
        onClick={onZoomOut}
        disabled={zoom === 24}
      >
        <ZoomOut className="w-4 h-4" />
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={onZoomIn}
        disabled={zoom === 1}
      >
        <ZoomIn className="w-4 h-4" />
      </Button>
    </div>
  );
};
