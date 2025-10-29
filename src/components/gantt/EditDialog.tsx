import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface EditDialogProps {
  open: boolean;
  onClose: () => void;
  initialColor: string;
  initialDescription: string;
  onSave: (color: string, description: string) => void;
}

const PRESET_COLORS = [
  "#00bcd4", "#2196f3", "#4caf50", "#ff9800", "#f44336", 
  "#9c27b0", "#e91e63", "#3f51b5", "#00bfa5", "#ffc107",
  "#795548", "#607d8b", "#ff5722", "#8bc34a", "#673ab7"
];

export const EditDialog = ({
  open,
  onClose,
  initialColor,
  initialDescription,
  onSave,
}: EditDialogProps) => {
  const [color, setColor] = useState(initialColor);
  const [description, setDescription] = useState(initialDescription);

  const handleSave = () => {
    onSave(color, description);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Item</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
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
