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
import { Textarea } from "@/components/ui/textarea";
import { COLOR_PALETTE, getColorName } from "@/lib/ganttConstants";

interface EditDialogProps {
  open: boolean;
  onClose: () => void;
  initialColor: string;
  initialLabel: string;
  initialLabelColor: string;
  initialDescription: string;
  start: number;
  duration: number;
  onSave: (color: string, label: string, labelColor: string, description: string) => void;
}

const formatHoursToDayTime = (hours: number): string => {
  const day = Math.floor(hours / 24) + 1;
  const hourOfDay = Math.floor(hours % 24);
  const minutes = Math.round((hours % 1) * 60);
  return `Day ${day}, ${String(hourOfDay).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
};

// Extract hex values from COLOR_PALETTE
const PRESET_COLORS = COLOR_PALETTE.map(c => c.hex);

// Use the same palette for label text colors
const LABEL_TEXT_COLORS = PRESET_COLORS;

// Helper functions to manage recent colors in localStorage
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
    const updated = [color, ...filtered].slice(0, 5); // Keep last 5
    localStorage.setItem(key, JSON.stringify(updated));
  } catch {
    // Ignore localStorage errors
  }
};

export const EditDialog = ({
  open,
  onClose,
  initialColor,
  initialLabel,
  initialLabelColor,
  initialDescription,
  start,
  duration,
  onSave,
}: EditDialogProps) => {
  const [color, setColor] = useState(initialColor);
  const [label, setLabel] = useState(initialLabel);
  const [labelColor, setLabelColor] = useState(initialLabelColor);
  const [description, setDescription] = useState(initialDescription);
  const [recentBgColors, setRecentBgColors] = useState<string[]>([]);
  const [recentTextColors, setRecentTextColors] = useState<string[]>([]);
  
  useEffect(() => {
    setRecentBgColors(getRecentColors('gantt-recent-bg-colors'));
    setRecentTextColors(getRecentColors('gantt-recent-text-colors'));
  }, [open]);
  
  const endHour = start + duration;
  const startFormatted = formatHoursToDayTime(start);
  const endFormatted = formatHoursToDayTime(endHour);

  const handleColorSelect = (newColor: string) => {
    addRecentColor('gantt-recent-bg-colors', newColor);
    onSave(newColor, label, labelColor, description);
    onClose();
  };

  const handleLabelColorSelect = (newColor: string) => {
    addRecentColor('gantt-recent-text-colors', newColor);
    onSave(color, label, newColor, description);
    onClose();
  };

  const handleSave = () => {
    onSave(color, label, labelColor, description);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Edit Item</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 overflow-y-auto pr-2">
          <div className="space-y-1.5 p-2.5 bg-muted rounded-lg">
            <div className="flex justify-between text-xs">
              <span className="font-medium">Start:</span>
              <span>{startFormatted}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="font-medium">End:</span>
              <span>{endFormatted}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="font-medium">Duration:</span>
              <span>{duration} hours</span>
            </div>
          </div>

          <div>
            <Label htmlFor="label" className="text-sm">Label</Label>
            <Input
              id="label"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              onKeyDown={(e) => e.stopPropagation()}
              placeholder="Enter label..."
              maxLength={50}
              className="mt-1.5 h-9"
            />
          </div>

          <div>
            <Label htmlFor="description" className="text-sm">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              onKeyDown={(e) => e.stopPropagation()}
              maxLength={2000}
              placeholder="Add a description..."
              rows={3}
              className="mt-1.5 text-sm"
            />
          </div>

          <div>
            <Label className="text-sm">Background Color</Label>
            {recentBgColors.length > 0 && (
              <div className="mb-2">
                <div className="text-xs text-muted-foreground mb-1.5 mt-1.5">Recent</div>
                <div className="flex gap-1.5">
                  {recentBgColors.map((recentColor) => (
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

          <div>
            <Label className="text-sm">Label Text Color</Label>
            {recentTextColors.length > 0 && (
              <div className="mb-2">
                <div className="text-xs text-muted-foreground mb-1.5 mt-1.5">Recent</div>
                <div className="flex gap-1.5">
                  {recentTextColors.map((recentColor) => (
                    <button
                      key={recentColor}
                      className={`w-10 h-10 rounded border-2 transition-all hover:scale-105 ${
                        labelColor === recentColor ? "border-primary ring-2 ring-primary" : "border-border"
                      }`}
                      style={{ backgroundColor: recentColor }}
                      onClick={() => handleLabelColorSelect(recentColor)}
                      title="Recently used"
                    />
                  ))}
                </div>
              </div>
            )}
            <div className="text-xs text-muted-foreground mb-1.5">All Colors</div>
            <div className="grid grid-cols-12 gap-1 mt-1.5 max-h-[120px] overflow-y-auto pr-1 border rounded p-1">
              {LABEL_TEXT_COLORS.map((textColor) => (
                <button
                  key={textColor}
                  className={`w-full h-7 rounded border transition-all hover:scale-105 ${
                    labelColor === textColor ? "border-primary ring-1 ring-primary" : "border-border"
                  }`}
                  style={{ backgroundColor: textColor }}
                  onClick={() => handleLabelColorSelect(textColor)}
                  title={getColorName(textColor) || textColor}
                />
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={onClose} size="sm">
              Cancel
            </Button>
            <Button onClick={handleSave} size="sm">Save</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
