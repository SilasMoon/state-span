import { useCallback } from "react";
import { GanttData, GanttFlag } from "@/types/gantt";
import { DEFAULT_COLORS } from "@/lib/ganttConstants";

interface UseGanttFlagsProps {
  updateData: (updater: (prev: GanttData) => GanttData) => void;
  generateId: () => string;
}

export const useGanttFlags = ({ updateData, generateId }: UseGanttFlagsProps) => {
  const addFlag = useCallback((position: number, label: string = "New Flag", color: string = DEFAULT_COLORS.FLAG, icon?: string, swimlane: "top" | "bottom" = "top") => {
    const id = generateId();
    const flag: GanttFlag = {
      id,
      position,
      label,
      color,
      icon,
      swimlane,
    };

    updateData((prev) => ({
      ...prev,
      flags: [...prev.flags, flag],
    }));

    return id;
  }, [updateData, generateId]);

  const updateFlag = useCallback((flagId: string, updates: Partial<GanttFlag>) => {
    updateData((prev) => ({
      ...prev,
      flags: prev.flags.map((flag) =>
        flag.id === flagId ? { ...flag, ...updates } : flag
      ),
    }));
  }, [updateData]);

  const deleteFlag = useCallback((flagId: string) => {
    updateData((prev) => ({
      ...prev,
      flags: prev.flags.filter((flag) => flag.id !== flagId),
    }));
  }, [updateData]);

  return {
    addFlag,
    updateFlag,
    deleteFlag,
  };
};
