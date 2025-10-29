import { ZoomLevel } from "@/types/gantt";

interface GanttTimelineProps {
  zoom: ZoomLevel;
  totalHours: number;
}

export const GanttTimeline = ({ zoom, totalHours }: GanttTimelineProps) => {
  const columnWidth = zoom === 1 ? 30 : zoom === 2 ? 40 : zoom === 4 ? 50 : zoom === 8 ? 60 : zoom === 12 ? 70 : 80;
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
          className="flex flex-col items-center justify-start border-r border-gantt-grid text-xs pl-1"
          style={{ width: `${columnWidth}px`, minWidth: `${columnWidth}px` }}
        >
          {showDay && <div className="text-gantt-text font-semibold">D{day}</div>}
          {!showDay && <div className="h-[14px]" />}
          <div className="text-gantt-text-muted">{hourInDay}h</div>
        </div>
      );
    }
    return labels;
  };

  return (
    <div className="sticky top-0 z-20 bg-gantt-header border-b-2 border-border">
      <div className="flex h-12">{renderTimeLabels()}</div>
    </div>
  );
};
