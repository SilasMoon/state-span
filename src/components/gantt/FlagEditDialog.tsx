import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Flag, CheckCircle, AlertCircle, Star, Target, Zap, Trophy, Rocket } from "lucide-react";
import { GanttFlag } from "@/types/gantt";

interface FlagEditDialogProps {
  open: boolean;
  flag: GanttFlag | null;
  onSave: (flagId: string, updates: Partial<GanttFlag>) => void;
  onDelete: (flagId: string) => void;
  onClose: () => void;
}

const iconOptions = [
  { value: "Flag", label: "Flag", Icon: Flag },
  { value: "CheckCircle", label: "Check Circle", Icon: CheckCircle },
  { value: "AlertCircle", label: "Alert Circle", Icon: AlertCircle },
  { value: "Star", label: "Star", Icon: Star },
  { value: "Target", label: "Target", Icon: Target },
  { value: "Zap", label: "Zap", Icon: Zap },
  { value: "Trophy", label: "Trophy", Icon: Trophy },
  { value: "Rocket", label: "Rocket", Icon: Rocket },
];

const colorPresets = [
  { value: "#2196f3", label: "Blue" },
  { value: "#4caf50", label: "Green" },
  { value: "#ff9800", label: "Orange" },
  { value: "#f44336", label: "Red" },
  { value: "#9c27b0", label: "Purple" },
  { value: "#00bcd4", label: "Cyan" },
  { value: "#ffeb3b", label: "Yellow" },
  { value: "#607d8b", label: "Grey" },
];

export const FlagEditDialog = ({
  open,
  flag,
  onSave,
  onDelete,
  onClose,
}: FlagEditDialogProps) => {
  const [label, setLabel] = useState(flag?.label || "");
  const [color, setColor] = useState(flag?.color || "#2196f3");
  const [icon, setIcon] = useState(flag?.icon || "Flag");
  const [position, setPosition] = useState(flag?.position || 0);

  const handleSave = () => {
    if (!flag || !label.trim()) return;
    onSave(flag.id, { label: label.trim(), color, icon, position });
    onClose();
  };

  const handleDelete = () => {
    if (!flag) return;
    if (confirm("Are you sure you want to delete this flag?")) {
      onDelete(flag.id);
      onClose();
    }
  };

  const formatPosition = (hours: number) => {
    const days = Math.floor(hours / 24);
    const remainingHours = hours % 24;
    return `Day ${days}, ${remainingHours}:00`;
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Flag</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="label">Label</Label>
            <Input
              id="label"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="Enter flag label"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="position">Position</Label>
            <div className="flex gap-2">
              <Input
                id="position"
                type="number"
                value={position}
                onChange={(e) => setPosition(Number(e.target.value))}
                min={0}
                step={1}
              />
              <div className="flex items-center text-sm text-muted-foreground whitespace-nowrap">
                {formatPosition(position)}
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="icon">Icon</Label>
            <Select value={icon} onValueChange={setIcon}>
              <SelectTrigger id="icon">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {iconOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    <div className="flex items-center gap-2">
                      <option.Icon className="w-4 h-4" />
                      <span>{option.label}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Color</Label>
            <div className="flex gap-2 flex-wrap">
              {colorPresets.map((preset) => (
                <button
                  key={preset.value}
                  type="button"
                  onClick={() => setColor(preset.value)}
                  className="w-10 h-10 rounded border-2 transition-all hover:scale-110"
                  style={{
                    backgroundColor: preset.value,
                    borderColor: color === preset.value ? "#fff" : "transparent",
                    boxShadow: color === preset.value ? `0 0 0 2px ${preset.value}` : "none",
                  }}
                  title={preset.label}
                />
              ))}
            </div>
            <Input
              type="color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              className="w-full h-10 cursor-pointer"
            />
          </div>
        </div>

        <DialogFooter className="flex justify-between sm:justify-between">
          <Button variant="destructive" onClick={handleDelete}>
            Delete
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={!label.trim()}>
              Save
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
