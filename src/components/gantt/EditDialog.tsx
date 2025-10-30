import { useState } from "react";
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
  "#00bcd4", "#2196f3", "#4caf50", "#ff9800", "#f44336", 
  "#9c27b0", "#e91e63", "#3f51b5", "#00bfa5", "#ffc107",
  "#795548", "#607d8b", "#ff5722", "#8bc34a", "#673ab7"
];

const LABEL_TEXT_COLORS = [
  "#000000", "#FFFFFF", "#ff0000", "#00ff00", "#0000ff",
  "#ffff00", "#ff00ff", "#00ffff", "#808080", "#800000"
];

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
  
  const endHour = start + duration;
  const startFormatted = formatHoursToDayTime(start);
  const endFormatted = formatHoursToDayTime(endHour);

  const handleSave = () => {
    onSave(color, label, labelColor, description);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Item</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2 p-3 bg-muted rounded-lg">
            <div className="flex justify-between text-sm">
              <span className="font-medium">Start:</span>
              <span>{startFormatted}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="font-medium">End:</span>
              <span>{endFormatted}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="font-medium">Duration:</span>
              <span>{duration} hours</span>
            </div>
          </div>

          <div>
            <Label htmlFor="label">Label</Label>
            <Input
              id="label"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="Enter label..."
              maxLength={50}
              className="mt-2"
            />
          </div>

          <div>
            <Label>Background Color</Label>
            <div className="grid grid-cols-5 gap-2 mt-2">
              {PRESET_COLORS.map((presetColor) => (
                <button
                  key={presetColor}
                  className={`w-full h-10 rounded border-2 transition-all hover:scale-110 ${
                    color === presetColor ? "border-primary ring-2 ring-primary" : "border-border"
                  }`}
                  style={{ backgroundColor: presetColor }}
                  onClick={() => setColor(presetColor)}
                />
              ))}
            </div>
          </div>

          <div>
            <Label>Label Text Color</Label>
            <div className="grid grid-cols-5 gap-2 mt-2">
              {LABEL_TEXT_COLORS.map((textColor) => (
                <button
                  key={textColor}
                  className={`w-full h-10 rounded border-2 transition-all hover:scale-110 ${
                    labelColor === textColor ? "border-primary ring-2 ring-primary" : "border-border"
                  }`}
                  style={{ backgroundColor: textColor }}
                  onClick={() => setLabelColor(textColor)}
                />
              ))}
            </div>
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add a description..."
              rows={4}
              className="mt-2"
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleSave}>Save</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
