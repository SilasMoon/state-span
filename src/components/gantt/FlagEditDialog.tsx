import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Flag, CheckCircle, AlertCircle, Star, Target, Zap, Trophy, Rocket, Play, CircleDot, Moon, Sun, Beaker } from "lucide-react";
import { GanttFlag } from "@/types/gantt";
import { COLOR_PALETTE } from "@/lib/ganttConstants";

interface FlagEditDialogProps {
  open: boolean;
  flag: GanttFlag | null;
  onSave: (flagId: string, updates: Partial<GanttFlag>) => void;
  onDelete: (flagId: string) => void;
  onClose: () => void;
}

const iconOptions = [
  { value: "Flag", label: "Flag", Icon: Flag },
  { value: "Play", label: "Start", Icon: Play },
  { value: "CircleDot", label: "End", Icon: CircleDot },
  { value: "Moon", label: "Sleep", Icon: Moon },
  { value: "Sun", label: "Wake Up", Icon: Sun },
  { value: "Beaker", label: "Science", Icon: Beaker },
  { value: "CheckCircle", label: "Check Circle", Icon: CheckCircle },
  { value: "AlertCircle", label: "Alert Circle", Icon: AlertCircle },
  { value: "Star", label: "Star", Icon: Star },
  { value: "Target", label: "Target", Icon: Target },
  { value: "Zap", label: "Zap", Icon: Zap },
  { value: "Trophy", label: "Trophy", Icon: Trophy },
  { value: "Rocket", label: "Rocket", Icon: Rocket },
];

// Use centralized color palette for flags
const colorPresets = COLOR_PALETTE.map(c => ({ value: c.hex, label: c.name }));

export const FlagEditDialog = ({
  open,
  flag,
  onSave,
  onDelete,
  onClose,
}: FlagEditDialogProps) => {
  const [label, setLabel] = useState(flag?.label || "");
  const [description, setDescription] = useState(flag?.description || "");
  const [color, setColor] = useState(flag?.color || "#4363d8"); // Blue from palette
  const [icon, setIcon] = useState(flag?.icon || "Flag");
  const [swimlane, setSwimlane] = useState<"top" | "bottom">(flag?.swimlane || "top");

  const handleSave = () => {
    if (!flag || !label.trim()) return;
    onSave(flag.id, { label: label.trim(), description: description.trim(), color, icon, swimlane });
    onClose();
  };

  const [showDeleteAlert, setShowDeleteAlert] = useState(false);

  const handleDeleteConfirm = () => {
    if (!flag) return;
    onDelete(flag.id);
    onClose();
    setShowDeleteAlert(false);
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
              onKeyDown={(e) => e.stopPropagation()}
              maxLength={200}
              placeholder="Enter flag label"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              onKeyDown={(e) => e.stopPropagation()}
              maxLength={2000}
              placeholder="Add a description..."
              rows={3}
              className="text-sm"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="swimlane">Swimlane</Label>
            <Select value={swimlane} onValueChange={(value) => setSwimlane(value as "top" | "bottom")}>
              <SelectTrigger id="swimlane">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="top">Top</SelectItem>
                <SelectItem value="bottom">Bottom</SelectItem>
              </SelectContent>
            </Select>
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
          <Button variant="destructive" onClick={() => setShowDeleteAlert(true)}>
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

      <AlertDialog open={showDeleteAlert} onOpenChange={setShowDeleteAlert}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Flag</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this flag? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
};
