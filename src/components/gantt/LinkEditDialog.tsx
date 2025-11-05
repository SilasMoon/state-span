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
import { COLOR_PALETTE, getColorName } from "@/lib/ganttConstants";

interface LinkEditDialogProps {
  open: boolean;
  onClose: () => void;
  initialLabel: string;
  initialColor: string;
  onSave: (label: string, color: string) => void;
  onDelete: () => void;
}

// Extract hex values from COLOR_PALETTE
const PRESET_COLORS = COLOR_PALETTE.map(c => c.hex);

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
    addRecentColor('gantt-recent-bg-colors', newColor);
    onSave(label, newColor);
    onClose();
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
              maxLength={200}
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
                      onClick={() => handleColorSelect(recentColor)}
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
                  title={getColorName(presetColor) || presetColor}
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
