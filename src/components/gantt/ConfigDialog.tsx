import React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { GanttConfig } from "@/hooks/useGanttConfig";
import { Download, Upload, RotateCcw } from "lucide-react";
import { toast } from "sonner";

interface ConfigDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  config: GanttConfig;
  onConfigChange: (updates: Partial<GanttConfig>) => void;
  onReset: () => void;
  onExport: () => string;
  onImport: (data: string) => void;
}

export const ConfigDialog = ({
  open,
  onOpenChange,
  config,
  onConfigChange,
  onReset,
  onExport,
  onImport,
}: ConfigDialogProps) => {
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleExport = () => {
    const jsonData = onExport();
    const blob = new Blob([jsonData], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `gantt-config-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Configuration exported");
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const content = event.target?.result as string;
          onImport(content);
          toast.success("Configuration imported");
        } catch (error) {
          toast.error("Failed to import configuration");
        }
      };
      reader.readAsText(file);
    }
  };

  const handleColumnWidthChange = (level: number, value: number) => {
    const newWidths = [...config.columnWidths];
    newWidths[level - 1] = value;
    onConfigChange({ columnWidths: newWidths });
  };

  const handleReset = () => {
    onReset();
    toast.success("Configuration reset to defaults");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Chart Configuration</DialogTitle>
          <DialogDescription>
            Customize zoom column widths, grid contrast, and timescale appearance
          </DialogDescription>
        </DialogHeader>

        <div className="flex gap-2 mb-4">
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className="w-4 h-4 mr-2" />
            Export Config
          </Button>
          <Button variant="outline" size="sm" onClick={handleImportClick}>
            <Upload className="w-4 h-4 mr-2" />
            Import Config
          </Button>
          <Button variant="outline" size="sm" onClick={handleReset}>
            <RotateCcw className="w-4 h-4 mr-2" />
            Reset to Defaults
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={handleFileChange}
            className="hidden"
          />
        </div>

        <Tabs defaultValue="zoom" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="zoom">Zoom Levels</TabsTrigger>
            <TabsTrigger value="grid">Grid Contrast</TabsTrigger>
            <TabsTrigger value="timescale">Timescale Contrast</TabsTrigger>
          </TabsList>

          <TabsContent value="zoom" className="space-y-4 mt-4">
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Customize the column width for each zoom level (in pixels)
              </p>
              <div className="grid grid-cols-2 gap-4">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((level) => (
                  <div key={level} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor={`zoom-${level}`} className="text-sm">
                        Level {level}
                      </Label>
                      <span className="text-sm text-muted-foreground">
                        {config.columnWidths[level - 1]}px
                      </span>
                    </div>
                    <Input
                      id={`zoom-${level}`}
                      type="number"
                      min={40}
                      max={400}
                      step={10}
                      value={config.columnWidths[level - 1]}
                      onChange={(e) =>
                        handleColumnWidthChange(level, parseInt(e.target.value) || 40)
                      }
                      className="h-8"
                    />
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="grid" className="space-y-4 mt-4">
            <div className="space-y-4">
              <div>
                <Label htmlFor="grid-opacity" className="text-sm">
                  Grid Line Opacity
                </Label>
                <p className="text-xs text-muted-foreground mb-3">
                  Adjust the visibility of grid lines (100% = normal, 200% = double intensity)
                </p>
                <div className="flex items-center gap-4">
                  <Slider
                    id="grid-opacity"
                    min={1}
                    max={2}
                    step={0.1}
                    value={[config.gridOpacity]}
                    onValueChange={([value]) => onConfigChange({ gridOpacity: value })}
                    className="flex-1"
                  />
                  <span className="text-sm text-muted-foreground min-w-[3rem] text-right">
                    {(config.gridOpacity * 100).toFixed(0)}%
                  </span>
                </div>
              </div>

              <div className="p-4 border rounded-lg bg-muted/20">
                <p className="text-sm font-medium mb-2">Preview</p>
                <div className="grid grid-cols-4 gap-px bg-border" style={{ opacity: config.gridOpacity }}>
                  {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                    <div key={i} className="h-8 bg-background" />
                  ))}
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="timescale" className="space-y-4 mt-4">
            <div className="space-y-4">
              <div>
                <Label htmlFor="timescale-contrast" className="text-sm">
                  Timescale Background Contrast
                </Label>
                <p className="text-xs text-muted-foreground mb-3">
                  Adjust the contrast between alternating background colors (100% = normal, 200% = double
                  contrast)
                </p>
                <div className="flex items-center gap-4">
                  <Slider
                    id="timescale-contrast"
                    min={1}
                    max={2}
                    step={0.1}
                    value={[config.timescaleContrast]}
                    onValueChange={([value]) => onConfigChange({ timescaleContrast: value })}
                    className="flex-1"
                  />
                  <span className="text-sm text-muted-foreground min-w-[3rem] text-right">
                    {(config.timescaleContrast * 100).toFixed(0)}%
                  </span>
                </div>
              </div>

              <div className="p-4 border rounded-lg bg-muted/20">
                <p className="text-sm font-medium mb-2">Preview</p>
                <div className="flex">
                  {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                    <div
                      key={i}
                      className="h-12 flex-1 flex items-center justify-center text-xs"
                      style={{
                        backgroundColor:
                          i % 2 === 0
                            ? `hsl(var(--gantt-header))`
                            : `hsla(var(--muted) / ${0.5 * config.timescaleContrast})`,
                      }}
                    >
                      {i}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};
