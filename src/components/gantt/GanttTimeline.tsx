import { ZoomConfig } from "@/types/gantt";

interface GanttTimelineProps {
  zoom: ZoomConfig;
  totalHours: number;
}

export const GanttTimeline = ({ zoom, totalHours }: GanttTimelineProps) => {
  const columnWidth = zoom.columnWidth;
  const columns = Math.ceil(totalHours / zoom.hoursPerColumn);

  const renderTimeLabels = () => {
    const labels = [];
    let lastDay = -1;
    
    for (let i = 0; i < columns; i++) {
      const hour = i * zoom.hoursPerColumn;
      const day = Math.floor(hour / 24);
      const hourInDay = hour % 24;

      const showDay = day !== lastDay;
      lastDay = day;

      // Format hour display - use decimal for 0.5 zoom level only when not a whole number
      const hourDisplay = zoom.hoursPerColumn === 0.5 
        ? (hourInDay % 1 === 0 ? hourInDay.toString() : hourInDay.toFixed(1))
        : hourInDay.toString();

      labels.push(
        <div
          key={i}
          className="flex flex-col items-start justify-center border-r border-gantt-grid text-xs"
          style={{ width: `${columnWidth}px`, minWidth: `${columnWidth}px` }}
        >
          {showDay && <div className="text-gantt-text font-semibold">D{day}</div>}
          {!showDay && <div className="h-[14px]" />}
          <div className="text-gantt-text-muted">{hourDisplay}</div>
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
