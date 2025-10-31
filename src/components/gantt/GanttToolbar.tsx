import { ZoomIn, ZoomOut, Plus, Download, Upload, Trash2, Maximize2, Undo, Redo, Image } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { ZoomLevel } from "@/types/gantt";
import { useRef } from "react";

interface GanttToolbarProps {
  zoom: ZoomLevel;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onZoomToFit: () => void;
  onAddActivityLane: () => void;
  onAddStateLane: () => void;
  onExport: () => void;
  onExportPNG: () => void;
  onImport: (data: string) => void;
  onClear: () => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
}

export const GanttToolbar = ({
  zoom,
  onZoomIn,
  onZoomOut,
  onZoomToFit,
  onAddActivityLane,
  onAddStateLane,
  onExport,
  onExportPNG,
  onImport,
  onClear,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
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
    if (zoom === 1) return "1h";
    if (zoom === 24) return "1d";
    return `${zoom}h`;
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
          <DropdownMenuItem onClick={onAddActivityLane}>
            Activity Swimlane
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onAddStateLane}>
            State Swimlane
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

      <div className="flex-1" />

      <ThemeToggle />

      <div className="h-6 w-px bg-border mx-1" />

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
