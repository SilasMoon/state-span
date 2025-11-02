import { useEffect } from "react";
import { toast } from "sonner";
import { ZoomConfig } from "@/types/gantt";

interface UseGanttKeyboardParams {
  containerRef: React.RefObject<HTMLDivElement>;
  selected: { type: string; swimlaneId: string; itemId?: string } | null;
  selectedLink: string | null;
  selectedFlag: string | null;
  copiedItem: any;
  copyGhost: any;
  canUndo: boolean;
  canRedo: boolean;
  zoom: ZoomConfig;
  swimlaneColumnWidth: number;
  onCopy: () => void;
  onPaste: () => void;
  onCancelCopy: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onDeleteSwimlane: (id: string) => void;
  onDeleteTask: (swimlaneId: string, taskId: string) => void;
  onDeleteState: (swimlaneId: string, stateId: string) => void;
  onDeleteLink: (linkId: string) => void;
  onDeleteFlag: (flagId: string) => void;
  onAddFlag: (position: number) => string;
  onSelectFlag: (flagId: string) => void;
  onOpenFlagDialog: () => void;
  clearSelection: () => void;
}

export const useGanttKeyboard = ({
  containerRef,
  selected,
  selectedLink,
  selectedFlag,
  copiedItem,
  copyGhost,
  canUndo,
  canRedo,
  zoom,
  swimlaneColumnWidth,
  onCopy,
  onPaste,
  onCancelCopy,
  onUndo,
  onRedo,
  onDeleteSwimlane,
  onDeleteTask,
  onDeleteState,
  onDeleteLink,
  onDeleteFlag,
  onAddFlag,
  onSelectFlag,
  onOpenFlagDialog,
  clearSelection,
}: UseGanttKeyboardParams) => {
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const modifier = isMac ? e.metaKey : e.ctrlKey;

      // Copy: Ctrl+C / Cmd+C
      if (modifier && e.key === 'c') {
        e.preventDefault();
        onCopy();
        return;
      }

      // Paste: Ctrl+V / Cmd+V
      if (modifier && e.key === 'v') {
        e.preventDefault();
        if (copiedItem && copyGhost) {
          onPaste();
        }
        return;
      }

      // Escape: Cancel copy mode
      if (e.key === 'Escape') {
        if (copiedItem) {
          onCancelCopy();
        }
        return;
      }

      // Undo: Ctrl+Z / Cmd+Z
      if (modifier && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        if (canUndo) {
          onUndo();
          toast.success("Undo");
        }
        return;
      }

      // Redo: Ctrl+Y / Cmd+Y or Ctrl+Shift+Z / Cmd+Shift+Z
      if (modifier && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
        e.preventDefault();
        if (canRedo) {
          onRedo();
          toast.success("Redo");
        }
        return;
      }

      // Delete
      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        if (selectedFlag) {
          onDeleteFlag(selectedFlag);
          toast.success("Flag deleted");
        } else if (selectedLink) {
          onDeleteLink(selectedLink);
          clearSelection();
          toast.success("Link deleted");
        } else if (selected) {
          if (selected.type === 'swimlane') {
            onDeleteSwimlane(selected.swimlaneId);
            clearSelection();
            toast.success("Swimlane deleted");
          } else if (selected.type === 'task' && selected.itemId) {
            onDeleteTask(selected.swimlaneId, selected.itemId);
            clearSelection();
            toast.success("Task deleted");
          } else if (selected.type === 'state' && selected.itemId) {
            onDeleteState(selected.swimlaneId, selected.itemId);
            clearSelection();
            toast.success("State deleted");
          }
        }
      }

      // F key: Add flag at current scroll position
      if (e.key === 'f' || e.key === 'F') {
        if (!modifier) {
          e.preventDefault();
          const scrollContainer = document.querySelector('.overflow-auto');
          const scrollLeft = scrollContainer?.scrollLeft || 0;
          const viewportCenter = scrollLeft + (scrollContainer?.clientWidth || 0) / 2 - swimlaneColumnWidth;
          const position = Math.max(0, Math.round((viewportCenter / zoom.columnWidth) * zoom.hoursPerColumn));
          const flagId = onAddFlag(position);
          onSelectFlag(flagId);
          onOpenFlagDialog();
          toast.success("Flag added");
        }
      }
    };

    container.addEventListener('keydown', handleKeyDown);
    return () => container.removeEventListener('keydown', handleKeyDown);
  }, [
    containerRef,
    selected,
    selectedLink,
    selectedFlag,
    copiedItem,
    copyGhost,
    canUndo,
    canRedo,
    zoom,
    swimlaneColumnWidth,
    onCopy,
    onPaste,
    onCancelCopy,
    onUndo,
    onRedo,
    onDeleteSwimlane,
    onDeleteTask,
    onDeleteState,
    onDeleteLink,
    onDeleteFlag,
    onAddFlag,
    onSelectFlag,
    onOpenFlagDialog,
    clearSelection,
  ]);

  // Auto-focus container when item is selected
  useEffect(() => {
    if (selected && containerRef.current) {
      setTimeout(() => {
        containerRef.current?.focus();
      }, 10);
    }
  }, [selected, containerRef]);
};
