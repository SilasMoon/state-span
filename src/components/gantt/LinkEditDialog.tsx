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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LinkType } from "@/types/gantt";

interface LinkEditDialogProps {
  open: boolean;
  onClose: () => void;
  initialType: LinkType;
  initialLabel: string;
  initialLag: number;
  initialColor: string;
  onSave: (type: LinkType, label: string, lag: number, color: string) => void;
  onDelete: () => void;
}

const PRESET_COLORS = [
  "#00bcd4", "#2196f3", "#4caf50", "#ff9800", "#f44336", 
  "#9c27b0", "#e91e63", "#3f51b5", "#00bfa5", "#ffc107",
  "#795548", "#607d8b", "#ff5722", "#8bc34a", "#673ab7"
];

const LINK_TYPE_LABELS: Record<LinkType, string> = {
  FS: "Finish-to-Start",
  SS: "Start-to-Start",
  FF: "Finish-to-Finish",
  SF: "Start-to-Finish"
};

export const LinkEditDialog = ({
  open,
  onClose,
  initialType,
  initialLabel,
  initialLag,
  initialColor,
  onSave,
  onDelete,
}: LinkEditDialogProps) => {
  const [type, setType] = useState<LinkType>(initialType);
  const [label, setLabel] = useState(initialLabel);
  const [lag, setLag] = useState(initialLag);
  const [color, setColor] = useState(initialColor);

  const handleSave = () => {
    onSave(type, label, lag, color);
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
            <Label htmlFor="link-type">Link Type</Label>
            <Select value={type} onValueChange={(value) => setType(value as LinkType)}>
              <SelectTrigger id="link-type" className="mt-2">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(LINK_TYPE_LABELS).map(([key, value]) => (
                  <SelectItem key={key} value={key}>
                    {value}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="label">Label</Label>
            <Input
              id="label"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
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
