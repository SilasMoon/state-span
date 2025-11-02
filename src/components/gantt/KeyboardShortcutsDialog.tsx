import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Keyboard } from "lucide-react";

interface KeyboardShortcutsDialogProps {
  open: boolean;
  onClose: () => void;
}

export const KeyboardShortcutsDialog = ({ open, onClose }: KeyboardShortcutsDialogProps) => {
  const shortcuts = [
    { keys: ["Ctrl", "C"], mac: ["⌘", "C"], description: "Copy selected item(s)" },
    { keys: ["Ctrl", "V"], mac: ["⌘", "V"], description: "Paste copied item(s)" },
    { keys: ["Escape"], mac: ["Esc"], description: "Cancel copy mode" },
    { keys: ["Ctrl", "Z"], mac: ["⌘", "Z"], description: "Undo last action" },
    { keys: ["Ctrl", "Y"], mac: ["⌘", "Y"], description: "Redo action" },
    { keys: ["Ctrl", "⇧", "Z"], mac: ["⌘", "⇧", "Z"], description: "Redo action (alternative)" },
    { keys: ["Delete"], mac: ["⌫"], description: "Delete selected item(s)" },
    { keys: ["F"], mac: ["F"], description: "Add flag at current position" },
  ];

  const isMac = typeof navigator !== "undefined" && navigator.platform.toUpperCase().indexOf("MAC") >= 0;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Keyboard className="w-5 h-5" />
            Keyboard Shortcuts
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            {shortcuts.map((shortcut, index) => {
              const displayKeys = isMac ? shortcut.mac : shortcut.keys;
              return (
                <div key={index} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                  <span className="text-sm text-muted-foreground">{shortcut.description}</span>
                  <div className="flex items-center gap-1">
                    {displayKeys.map((key, keyIndex) => (
                      <kbd
                        key={keyIndex}
                        className="px-2 py-1 text-xs font-semibold text-foreground bg-muted border border-border rounded"
                      >
                        {key}
                      </kbd>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
          
          <div className="pt-4 border-t border-border space-y-2">
            <h3 className="text-sm font-semibold">Other Actions</h3>
            <div className="space-y-1 text-sm text-muted-foreground">
              <p>• Click and drag items to move them</p>
              <p>• Drag the edges of items to resize</p>
              <p>• Right-click items to edit properties</p>
              <p>• Drag to create links between items</p>
              <p>• Click the swimlane divider to resize columns</p>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
