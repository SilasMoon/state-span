import { ZoomIn, ZoomOut, Plus, Download, Upload, Trash2, Maximize2, Undo, Redo, Image, Flag, Eye, EyeOff, RotateCcw, ChevronDown, HelpCircle, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { ZoomConfig } from "@/types/gantt";
import { useRef } from "react";

interface GanttToolbarProps {
  zoom: ZoomConfig;
  granularityIndex: number;
  onGranularityDecrease: () => void;
  onGranularityIncrease: () => void;
  canGranularityDecrease: boolean;
  canGranularityIncrease: boolean;
  onZoomIn: () => void;
  onZoomOut: () => void;
  canZoomIn: boolean;
  canZoomOut: boolean;
  onZoomToFit: () => void;
  onAddTaskLane: () => void;
  onAddStateLane: () => void;
  onAddFlag: (swimlane: "top" | "bottom") => void;
  onExport: () => void;
  onExportPNG: () => void;
  onImport: (data: string) => void;
  onClear: () => void;
  onResetToDefault: () => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  chartTitle: string;
  onChartTitleChange: (title: string) => void;
  showTopFlags: boolean;
  showBottomFlags: boolean;
  onToggleTopFlags: () => void;
  onToggleBottomFlags: () => void;
  onShowHelp: () => void;
}

export const GanttToolbar = ({
  zoom,
  granularityIndex,
  onGranularityDecrease,
  onGranularityIncrease,
  canGranularityDecrease,
  canGranularityIncrease,
  onZoomIn,
  onZoomOut,
  canZoomIn,
  canZoomOut,
  onZoomToFit,
  onAddTaskLane,
  onAddStateLane,
  onAddFlag,
  onExport,
  onExportPNG,
  onImport,
  onClear,
  onResetToDefault,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  chartTitle,
  onChartTitleChange,
  showTopFlags,
  showBottomFlags,
  onToggleTopFlags,
  onToggleBottomFlags,
  onShowHelp,
}: GanttToolbarProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const content = event.target?.result as string;
        onImport(content);
      };
      reader.readAsText(file);
    }
  };

  const getZoomLabel = () => {
    return zoom.zoomLabel;
  };

  const getGranularityLabel = () => {
    return zoom.granularityLabel;
  };

  return (
    <div className="flex items-center gap-2 p-3 bg-card border-b border-border">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="icon" title="Add Swimlane">
            <Plus className="w-4 h-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem onClick={onAddTaskLane}>
            Task Swimlane
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onAddStateLane}>
            State Swimlane
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="icon" title="Add Flag (F)">
            <Flag className="w-4 h-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem onClick={() => onAddFlag("top")}>
            Add Top Flag
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onAddFlag("bottom")}>
            Add Bottom Flag
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="icon" title="Toggle Flag Visibility">
            <Eye className="w-4 h-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem onClick={onToggleTopFlags}>
            {showTopFlags ? <Eye className="w-4 h-4 mr-2" /> : <EyeOff className="w-4 h-4 mr-2" />}
            Top Flags
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onToggleBottomFlags}>
            {showBottomFlags ? <Eye className="w-4 h-4 mr-2" /> : <EyeOff className="w-4 h-4 mr-2" />}
            Bottom Flags
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Button variant="outline" size="icon" onClick={onExport} title="Export JSON">
        <Download className="w-4 h-4" />
      </Button>
      
      <Button variant="outline" size="icon" onClick={handleImportClick} title="Import JSON">
        <Upload className="w-4 h-4" />
      </Button>
      
      <Button variant="outline" size="icon" onClick={onExportPNG} title="Export PNG">
        <Image className="w-4 h-4" />
      </Button>
      
      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        onChange={handleFileChange}
        className="hidden"
      />
      
      <Button variant="destructive" size="icon" onClick={onClear} title="Clear All">
        <Trash2 className="w-4 h-4" />
      </Button>

      <Button variant="outline" size="icon" onClick={onResetToDefault} title="Reset to Default Example">
        <RotateCcw className="w-4 h-4" />
      </Button>

      <div className="h-6 w-px bg-border mx-1" />

      <Button 
        variant="outline" 
        size="sm" 
        onClick={onUndo}
        disabled={!canUndo}
        title="Undo (Ctrl+Z)"
      >
        <Undo className="w-4 h-4" />
      </Button>
      <Button 
        variant="outline" 
        size="sm" 
        onClick={onRedo}
        disabled={!canRedo}
        title="Redo (Ctrl+Y)"
      >
        <Redo className="w-4 h-4" />
      </Button>

      <input
        type="text"
        value={chartTitle}
        onChange={(e) => onChartTitleChange(e.target.value)}
        maxLength={200}
        className="flex-1 text-xl font-bold bg-transparent border-none outline-none text-foreground text-center min-w-0 mx-4 focus:ring-2 focus:ring-primary/20 rounded px-3 py-1 transition-all"
        placeholder="Enter chart title..."
      />

      <ThemeToggle />

      <Button variant="outline" size="icon" onClick={onShowHelp} title="Keyboard Shortcuts">
        <HelpCircle className="w-4 h-4" />
      </Button>

      <div className="h-6 w-px bg-border mx-1" />

      {/* Granularity Controls */}
      <span className="text-sm text-muted-foreground">Granularity: {getGranularityLabel()}</span>
      <Button
        variant="outline"
        size="sm"
        onClick={onGranularityDecrease}
        disabled={!canGranularityDecrease}
        title="Decrease granularity (finer)"
      >
        <ChevronDown className="w-4 h-4" />
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={onGranularityIncrease}
        disabled={!canGranularityIncrease}
        title="Increase granularity (coarser)"
      >
        <ChevronUp className="w-4 h-4" />
      </Button>

      <div className="h-6 w-px bg-border mx-1" />

      {/* Zoom Controls */}
      <span className="text-sm text-muted-foreground">Zoom: {getZoomLabel()}</span>
      <Button
        variant="outline"
        size="sm"
        onClick={onZoomToFit}
        title="Zoom to fit entire timeline"
      >
        <Maximize2 className="w-4 h-4" />
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={onZoomOut}
        disabled={!canZoomOut}
        title="Zoom out"
      >
        <ZoomOut className="w-4 h-4" />
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={onZoomIn}
        disabled={!canZoomIn}
        title="Zoom in"
      >
        <ZoomIn className="w-4 h-4" />
      </Button>
    </div>
  );
};
