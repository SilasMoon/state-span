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

const PRESET_COLORS = [
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

const LABEL_TEXT_COLORS = [
  // Basics
  "#000000", "#FFFFFF", 
  // Reds
  "#b71c1c", "#d32f2f", "#f44336", "#ff5252", "#ff1744",
  // Pinks
  "#880e4f", "#c2185b", "#e91e63", "#f06292", "#ff4081",
  // Purples
  "#4a148c", "#7b1fa2", "#9c27b0", "#ba68c8", "#e040fb",
  // Deep Purples
  "#311b92", "#512da8", "#673ab7", "#9575cd", "#7c4dff",
  // Indigos
  "#1a237e", "#303f9f", "#3f51b5", "#7986cb", "#536dfe",
  // Blues
  "#0d47a1", "#1976d2", "#2196f3", "#64b5f6", "#2979ff",
  // Light Blues
  "#01579b", "#0277bd", "#03a9f4", "#4fc3f7", "#00b0ff",
  // Cyans
  "#006064", "#00838f", "#00bcd4", "#4dd0e1", "#00e5ff",
  // Teals
  "#004d40", "#00695c", "#009688", "#4db6ac", "#1de9b6",
  // Greens
  "#1b5e20", "#388e3c", "#4caf50", "#81c784", "#00e676",
  // Light Greens
  "#33691e", "#689f38", "#8bc34a", "#aed581", "#76ff03",
  // Limes
  "#827717", "#afb42b", "#cddc39", "#dce775", "#c6ff00",
  // Yellows
  "#f57f17", "#fbc02d", "#ffeb3b", "#fff176", "#ffea00",
  // Ambers
  "#ff6f00", "#ffa000", "#ffc107", "#ffd54f", "#ffc400",
  // Oranges
  "#e65100", "#f57c00", "#ff9800", "#ffb74d", "#ff9100",
  // Deep Oranges
  "#bf360c", "#e64a19", "#ff5722", "#ff8a65", "#ff3d00",
  // Browns
  "#3e2723", "#5d4037", "#795548", "#a1887f", "#8d6e63",
  // Greys
  "#212121", "#424242", "#616161", "#757575", "#9e9e9e",
  "#bdbdbd", "#e0e0e0", "#eeeeee", "#f5f5f5",
  // Blue Greys
  "#263238", "#37474f", "#455a64", "#546e7a", "#607d8b",
  "#78909c", "#90a4ae", "#b0bec5", "#cfd8dc"
];

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
    setColor(newColor);
    addRecentColor('gantt-recent-bg-colors', newColor);
    setRecentBgColors([newColor, ...recentBgColors.filter(c => c !== newColor)].slice(0, 5));
  };

  const handleLabelColorSelect = (newColor: string) => {
    setLabelColor(newColor);
    addRecentColor('gantt-recent-text-colors', newColor);
    setRecentTextColors([newColor, ...recentTextColors.filter(c => c !== newColor)].slice(0, 5));
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
                      onClick={() => setLabelColor(recentColor)}
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
                />
              ))}
            </div>
          </div>

          <div>
            <Label htmlFor="description" className="text-sm">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              onKeyDown={(e) => e.stopPropagation()}
              placeholder="Add a description..."
              rows={3}
              className="mt-1.5 text-sm"
            />
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
