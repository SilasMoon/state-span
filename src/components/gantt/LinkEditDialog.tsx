import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

interface LinkEditDialogProps {
  open: boolean;
  onClose: () => void;
  initialLabel: string;
  initialColor: string;
  onSave: (label: string, color: string) => void;
  onDelete: () => void;
}

const PRESET_COLORS = [
  // Basics
  "#FFFFFF",
  // Blues
  "#0d47a1", "#1565c0", "#1976d2", "#1e88e5", "#2196f3",
  "#42a5f5", "#64b5f6", "#90caf9", "#00bcd4", "#00acc1",
  "#0097a7", "#00838f", "#006064",
  // Greens
  "#1b5e20", "#2e7d32", "#388e3c", "#43a047", "#4caf50",
  "#66bb6a", "#81c784", "#00695c", "#00796b", "#00897b",
  "#00bfa5", "#1de9b6", "#69f0ae",
  // Reds & Pinks
  "#b71c1c", "#c62828", "#d32f2f", "#e53935", "#f44336",
  "#ef5350", "#e57373", "#e91e63", "#ec407a", "#f06292",
  "#c2185b", "#ad1457", "#880e4f",
  // Oranges & Yellows
  "#e65100", "#ef6c00", "#f57c00", "#fb8c00", "#ff9800",
  "#ffa726", "#ffb74d", "#ffc107", "#ffca28", "#ffd54f",
  "#f57f17", "#f9a825", "#fbc02d",
  // Purples
  "#4a148c", "#6a1b9a", "#7b1fa2", "#8e24aa", "#9c27b0",
  "#ab47bc", "#ba68c8", "#512da8", "#5e35b1", "#673ab7",
  "#7e57c2", "#9575cd",
  // Browns & Greys
  "#3e2723", "#4e342e", "#5d4037", "#6d4c41", "#795548",
  "#8d6e63", "#a1887f", "#37474f", "#455a64", "#546e7a",
  "#607d8b", "#78909c", "#90a4ae",
  // Additional accent colors
  "#d50000", "#ff1744", "#ff5252", "#ff6e40", "#ff5722",
  "#827717", "#9e9d24", "#afb42b", "#c0ca33", "#cddc39",
  "#558b2f", "#689f38", "#7cb342", "#8bc34a", "#9ccc65"
];

// Helper functions to manage recent colors
const getRecentColors = (key: string): string[] => {
  try {
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
};

const addRecentColor = (key: string, color: string) => {
  try {
    const recent = getRecentColors(key);
    const filtered = recent.filter(c => c !== color);
    const updated = [color, ...filtered].slice(0, 5);
    localStorage.setItem(key, JSON.stringify(updated));
  } catch {
    // Ignore localStorage errors
  }
};

export const LinkEditDialog = ({
  open,
  onClose,
  initialLabel,
  initialColor,
  onSave,
  onDelete,
}: LinkEditDialogProps) => {
  const [label, setLabel] = useState(initialLabel);
  const [color, setColor] = useState(initialColor);
  const [recentColors, setRecentColors] = useState<string[]>([]);

  useEffect(() => {
    setRecentColors(getRecentColors('gantt-recent-bg-colors'));
  }, [open]);

  const handleColorSelect = (newColor: string) => {
    setColor(newColor);
    addRecentColor('gantt-recent-bg-colors', newColor);
    setRecentColors([newColor, ...recentColors.filter(c => c !== newColor)].slice(0, 5));
  };

  const handleSave = () => {
    onSave(label, color);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Edit Link</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 overflow-y-auto pr-2">
          <div>
            <Label htmlFor="label" className="text-sm">Label</Label>
            <Input
              id="label"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              onKeyDown={(e) => e.stopPropagation()}
              placeholder="Optional label..."
              className="mt-1.5 h-9"
            />
          </div>

          <div>
            <Label className="text-sm">Color</Label>
            {recentColors.length > 0 && (
              <div className="mb-2">
                <div className="text-xs text-muted-foreground mb-1.5 mt-1.5">Recent</div>
                <div className="flex gap-1.5">
                  {recentColors.map((recentColor) => (
                    <button
                      key={recentColor}
                      className={`w-10 h-10 rounded border-2 transition-all hover:scale-105 ${
                        color === recentColor ? "border-primary ring-2 ring-primary" : "border-border"
                      }`}
                      style={{ backgroundColor: recentColor }}
                      onClick={() => setColor(recentColor)}
                      title="Recently used"
                    />
                  ))}
                </div>
              </div>
            )}
            <div className="text-xs text-muted-foreground mb-1.5">All Colors</div>
            <div className="grid grid-cols-12 gap-1 mt-1.5 max-h-[120px] overflow-y-auto pr-1 border rounded p-1">
              {PRESET_COLORS.map((presetColor) => (
                <button
                  key={presetColor}
                  className={`w-full h-7 rounded border transition-all hover:scale-105 ${
                    color === presetColor ? "border-primary ring-1 ring-primary" : "border-border"
                  }`}
                  style={{ backgroundColor: presetColor }}
                  onClick={() => handleColorSelect(presetColor)}
                />
              ))}
            </div>
          </div>

          <div className="flex justify-between gap-2 pt-2 border-t">
            <Button variant="destructive" onClick={onDelete} size="sm">
              Delete Link
            </Button>
            <div className="flex gap-2">
              <Button variant="outline" onClick={onClose} size="sm">
                Cancel
              </Button>
              <Button onClick={handleSave} size="sm">Save</Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
