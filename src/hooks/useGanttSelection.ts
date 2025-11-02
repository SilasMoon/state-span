import { useState } from "react";

export type SelectedItem = {
  type: "swimlane" | "task" | "state";
  swimlaneId: string;
  itemId?: string;
} | null;

export const useGanttSelection = () => {
  const [selected, setSelected] = useState<SelectedItem>(null);
  const [selectedLink, setSelectedLink] = useState<string | null>(null);
  const [selectedFlag, setSelectedFlag] = useState<string | null>(null);

  const clearSelection = () => {
    setSelected(null);
    setSelectedLink(null);
  };

  const selectItem = (type: "swimlane" | "task" | "state", swimlaneId: string, itemId?: string) => {
    setSelected({ type, swimlaneId, itemId });
    setSelectedLink(null);
    setSelectedFlag(null);
  };

  const selectLink = (linkId: string | null) => {
    setSelectedLink(linkId);
    if (linkId) setSelected(null);
  };

  const selectFlag = (flagId: string | null) => {
    setSelectedFlag(flagId);
    if (flagId) {
      setSelected(null);
      setSelectedLink(null);
    }
  };

  return {
    selected,
    selectedLink,
    selectedFlag,
    setSelected,
    setSelectedLink,
    setSelectedFlag,
    clearSelection,
    selectItem,
    selectLink,
    selectFlag,
  };
};
