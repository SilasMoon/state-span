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

interface LinkEditDialogProps {
  open: boolean;
  onClose: () => void;
  initialLabel: string;
  initialLag: number;
  initialColor: string;
  onSave: (label: string, lag: number, color: string) => void;
  onDelete: () => void;
}

const PRESET_COLORS = [
  "#00bcd4", "#2196f3", "#4caf50", "#ff9800", "#f44336", 
  "#9c27b0", "#e91e63", "#3f51b5", "#00bfa5", "#ffc107",
  "#795548", "#607d8b", "#ff5722", "#8bc34a", "#673ab7"
];

export const LinkEditDialog = ({
  open,
  onClose,
  initialLabel,
  initialLag,
  initialColor,
  onSave,
  onDelete,
}: LinkEditDialogProps) => {
  const [label, setLabel] = useState(initialLabel);
  const [lag, setLag] = useState(initialLag);
  const [color, setColor] = useState(initialColor);

  const handleSave = () => {
    onSave(label, lag, color);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Link</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="label">Label</Label>
            <Input
              id="label"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              onKeyDown={(e) => e.stopPropagation()}
              placeholder="Optional label..."
              className="mt-2"
            />
          </div>

          <div>
            <Label htmlFor="lag">Lag (hours)</Label>
            <Input
              id="lag"
              type="number"
              value={lag}
              onChange={(e) => setLag(Number(e.target.value))}
              onKeyDown={(e) => e.stopPropagation()}
              className="mt-2"
            />
          </div>

          <div>
            <Label>Color</Label>
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

          <div className="flex justify-between gap-2 pt-4 border-t">
            <Button variant="destructive" onClick={onDelete}>
              Delete Link
            </Button>
            <div className="flex gap-2">
              <Button variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button onClick={handleSave}>Save</Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
