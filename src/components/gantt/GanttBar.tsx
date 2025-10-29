import { GanttActivity, GanttState, ZoomLevel } from "@/types/gantt";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Trash2, Link2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface GanttBarProps {
  item: GanttActivity | GanttState;
  swimlaneId: string;
  zoom: ZoomLevel;
  columnWidth: number;
  onDoubleClick: () => void;
  onStartLinking: () => void;
  onDelete: () => void;
}

export const GanttBar = ({
  item,
  zoom,
  columnWidth,
  onDoubleClick,
  onStartLinking,
  onDelete,
}: GanttBarProps) => {
  const left = (item.start / zoom) * columnWidth;
  const width = (item.duration / zoom) * columnWidth;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className="absolute top-1 h-10 rounded cursor-pointer group flex items-center justify-center text-xs font-medium shadow-lg hover:shadow-xl transition-all hover:scale-105"
            style={{
              left: `${left}px`,
              width: `${width}px`,
              backgroundColor: item.color,
              color: "#fff",
            }}
            onDoubleClick={onDoubleClick}
          >
            <span className="truncate px-2">
              {item.start}h - {item.start + item.duration}h
            </span>
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
