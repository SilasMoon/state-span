import { useState } from "react";
import { GanttToolbar } from "./GanttToolbar";
import { GanttTimeline } from "./GanttTimeline";
import { GanttRow } from "./GanttRow";
import { EditDialog } from "./EditDialog";
import { GanttLinks } from "./GanttLinks";
import { useGanttData } from "@/hooks/useGanttData";
import { ZoomLevel } from "@/types/gantt";
import { toast } from "sonner";

export const GanttChart = () => {
  const {
    data,
    zoom,
    setZoom,
    addSwimlane,
    deleteSwimlane,
    toggleExpanded,
    addActivity,
    addState,
    updateActivity,
    updateState,
    deleteActivity,
    deleteState,
    addLink,
    updateSwimlane,
    clearAll,
    exportData,
    importData,
  } = useGanttData();

  const [editDialog, setEditDialog] = useState<{
    open: boolean;
    swimlaneId: string;
    itemId: string;
    type: "activity" | "state";
    color: string;
    description: string;
  } | null>(null);

  const [linkingFrom, setLinkingFrom] = useState<{
    swimlaneId: string;
    itemId: string;
  } | null>(null);

  // Calculate total hours dynamically based on content
  const calculateTotalHours = () => {
    let maxHour = 240; // Default 10 days
    Object.values(data.swimlanes).forEach((swimlane) => {
      swimlane.activities?.forEach((activity) => {
        const endHour = activity.start + activity.duration;
        if (endHour > maxHour) maxHour = endHour;
      });
      swimlane.states?.forEach((state) => {
        const endHour = state.start + state.duration;
        if (endHour > maxHour) maxHour = endHour;
      });
    });
    // Add 20% buffer and round up to next day
    return Math.ceil((maxHour * 1.2) / 24) * 24;
  };
  
  const totalHours = calculateTotalHours();

  const handleZoomIn = () => {
    const levels: ZoomLevel[] = [24, 12, 8, 4, 2, 1];
    const currentIndex = levels.indexOf(zoom);
    if (currentIndex < levels.length - 1) {
      setZoom(levels[currentIndex + 1]);
    }
  };

  const handleZoomOut = () => {
    const levels: ZoomLevel[] = [1, 2, 4, 8, 12, 24];
    const currentIndex = levels.indexOf(zoom);
    if (currentIndex < levels.length - 1) {
      setZoom(levels[currentIndex + 1]);
    }
  };

  const handleAddActivityLane = () => {
    addSwimlane("activity");
    toast.success("Activity swimlane added");
  };

  const handleAddStateLane = () => {
    addSwimlane("state");
    toast.success("State swimlane added");
  };

  const handleAddChild = (parentId: string, type: "activity" | "state") => {
    addSwimlane(type, parentId);
    toast.success(`${type} child swimlane added`);
  };

  const handleActivityDoubleClick = (swimlaneId: string, activityId: string) => {
    const swimlane = data.swimlanes[swimlaneId];
    const activity = swimlane.activities?.find((a) => a.id === activityId);
    if (activity) {
      setEditDialog({
        open: true,
        swimlaneId,
        itemId: activityId,
        type: "activity",
        color: activity.color,
        description: activity.description || "",
      });
    }
  };

  const handleStateDoubleClick = (swimlaneId: string, stateId: string) => {
    const swimlane = data.swimlanes[swimlaneId];
    const state = swimlane.states?.find((s) => s.id === stateId);
    if (state) {
      setEditDialog({
        open: true,
        swimlaneId,
        itemId: stateId,
        type: "state",
        color: state.color,
        description: state.description || "",
      });
    }
  };

  const handleEditSave = (color: string, description: string) => {
    if (!editDialog) return;

    if (editDialog.type === "activity") {
      updateActivity(editDialog.swimlaneId, editDialog.itemId, { color, description });
    } else {
      updateState(editDialog.swimlaneId, editDialog.itemId, { color, description });
    }

    toast.success("Item updated");
  };

  const handleStartLinking = (swimlaneId: string, itemId: string) => {
    if (linkingFrom) {
      // Complete the link
      addLink(linkingFrom.swimlaneId, linkingFrom.itemId, swimlaneId, itemId);
      setLinkingFrom(null);
      toast.success("Link created");
    } else {
      // Start linking
      setLinkingFrom({ swimlaneId, itemId });
      toast.info("Click another item to link");
    }
  };

  const handleAddActivity = (swimlaneId: string, start: number) => {
    addActivity(swimlaneId, start, zoom * 2);
    toast.success("Activity added");
  };

  const handleAddState = (swimlaneId: string, start: number) => {
    addState(swimlaneId, start, zoom * 2);
    toast.success("State added");
  };

  const handleExport = () => {
    const jsonData = exportData();
    const blob = new Blob([jsonData], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `gantt-chart-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Chart exported");
  };

  const handleImport = (jsonData: string) => {
    try {
      importData(jsonData);
      toast.success("Chart imported");
    } catch (error) {
      toast.error("Failed to import chart");
    }
  };

  const handleClear = () => {
    if (confirm("Are you sure you want to clear everything?")) {
      clearAll();
      toast.success("Chart cleared");
    }
  };

  const handleActivityResize = (swimlaneId: string, activityId: string, newStart: number, newDuration: number) => {
    updateActivity(swimlaneId, activityId, { start: newStart, duration: newDuration });
  };

  const handleStateResize = (swimlaneId: string, stateId: string, newStart: number, newDuration: number) => {
    updateState(swimlaneId, stateId, { start: newStart, duration: newDuration });
  };

  const renderSwimlanes = (ids: string[], level: number = 0): JSX.Element[] => {
    const elements: JSX.Element[] = [];

    ids.forEach((id) => {
      const swimlane = data.swimlanes[id];
      if (!swimlane) return;

      elements.push(
        <GanttRow
          key={id}
          swimlane={swimlane}
          level={level}
          zoom={zoom}
          totalHours={totalHours}
          onToggleExpand={toggleExpanded}
          onDelete={deleteSwimlane}
          onAddChild={handleAddChild}
          onAddActivity={handleAddActivity}
          onAddState={handleAddState}
          onActivityDoubleClick={handleActivityDoubleClick}
          onStateDoubleClick={handleStateDoubleClick}
          onStartLinking={handleStartLinking}
          onActivityDelete={deleteActivity}
          onStateDelete={deleteState}
          onSwimlaneNameChange={(id, name) => updateSwimlane(id, { name })}
          onActivityResize={handleActivityResize}
          onStateResize={handleStateResize}
        />
      );

      if (swimlane.expanded && swimlane.children.length > 0) {
        elements.push(...renderSwimlanes(swimlane.children, level + 1));
      }
    });

    return elements;
  };

  return (
    <div className="flex flex-col h-screen bg-background">
      <GanttToolbar
        zoom={zoom}
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        onAddActivityLane={handleAddActivityLane}
        onAddStateLane={handleAddStateLane}
        onExport={handleExport}
        onImport={handleImport}
        onClear={handleClear}
      />

      <div className="flex-1 overflow-auto relative">
        <div className="inline-block min-w-full">
          <div className="flex">
            <div className="sticky left-0 z-20 bg-gantt-header border-r-2 border-border">
              <div
                className="h-12 flex items-center px-4 font-semibold text-foreground border-b-2 border-border"
                style={{ width: "280px", minWidth: "280px" }}
              >
                Swimlanes
              </div>
            </div>
            <div className="flex-1">
              <GanttTimeline zoom={zoom} totalHours={totalHours} />
            </div>
          </div>

          {data.rootIds.length === 0 ? (
            <div className="flex items-center justify-center h-64 text-muted-foreground">
              Click "Add Swimlane" to get started
            </div>
          ) : (
            <div>{renderSwimlanes(data.rootIds)}</div>
          )}
        </div>

        {/* Render links */}
        <GanttLinks
          data={data}
          zoom={zoom}
          columnWidth={zoom === 1 ? 30 : zoom === 2 ? 40 : zoom === 4 ? 50 : zoom === 8 ? 60 : zoom === 12 ? 70 : 80}
        />
      </div>

      {editDialog && (
        <EditDialog
          open={editDialog.open}
          onClose={() => setEditDialog(null)}
          initialColor={editDialog.color}
          initialDescription={editDialog.description}
          onSave={handleEditSave}
        />
      )}
    </div>
  );
};
