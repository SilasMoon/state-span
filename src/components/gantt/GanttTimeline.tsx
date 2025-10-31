import { ZoomLevel } from "@/types/gantt";

interface GanttTimelineProps {
  zoom: ZoomLevel;
  totalHours: number;
}

export const GanttTimeline = ({ zoom, totalHours }: GanttTimelineProps) => {
  const columnWidth = zoom === 1 ? 24 : zoom === 2 ? 32 : zoom === 4 ? 40 : zoom === 8 ? 48 : zoom === 12 ? 56 : 64;
  const columns = Math.ceil(totalHours / zoom);

  const renderTimeLabels = () => {
    const labels = [];
    let lastDay = -1;
    
    for (let i = 0; i < columns; i++) {
      const hour = i * zoom;
      const day = Math.floor(hour / 24);
      const hourInDay = hour % 24;

      const showDay = day !== lastDay;
      lastDay = day;

      labels.push(
        <div
          key={i}
          className="flex flex-col items-start justify-center border-r border-gantt-grid text-xs"
          style={{ width: `${columnWidth}px`, minWidth: `${columnWidth}px` }}
        >
          {showDay && <div className="text-gantt-text font-semibold">D{day}</div>}
          {!showDay && <div className="h-[14px]" />}
          <div className="text-gantt-text-muted">{hourInDay}</div>
        </div>
      );
    }
    return labels;
  };

  return (
    <div className="sticky top-0 z-20 bg-gantt-header border-b border-border">
      <div className="flex h-12">{renderTimeLabels()}</div>
    </div>
  );
};
