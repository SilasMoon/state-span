/**
 * Grid-based A* router for Gantt chart links
 * Provides intelligent pathfinding that avoids obstacles
 */

interface Point {
  x: number;
  y: number;
}

interface GridCell {
  x: number;
  y: number;
  g: number; // Cost from start
  h: number; // Heuristic to end
  f: number; // Total cost
  parent: GridCell | null;
}

interface Obstacle {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface RouteRequest {
  start: Point;
  end: Point;
  obstacles: Obstacle[];
  gridSize: number; // Cell size in pixels
  chartWidth: number;
  chartHeight: number;
  cornerRadius?: number;
}

export class GridRouter {
  private gridSize: number;
  private grid: boolean[][]; // true = occupied, false = free
  private width: number;
  private height: number;
  private obstacles: Obstacle[];

  constructor(
    chartWidth: number,
    chartHeight: number,
    gridSize: number,
    obstacles: Obstacle[]
  ) {
    this.gridSize = gridSize;
    this.obstacles = obstacles;
    
    // Calculate grid dimensions
    this.width = Math.ceil(chartWidth / gridSize);
    this.height = Math.ceil(chartHeight / gridSize);
    
    // Initialize grid - all free
    this.grid = Array(this.height)
      .fill(null)
      .map(() => Array(this.width).fill(false));
    
    // Mark obstacles
    this.markObstacles();
  }

  private markObstacles() {
    // Mark obstacles with appropriate padding to prevent crossing bars
    // Use moderate padding to allow routing around bars without over-restricting
    const VERTICAL_PADDING = 3; // Cells above/below bar
    const HORIZONTAL_PADDING = 2; // Cells left/right of bar
    
    this.obstacles.forEach(obstacle => {
      const barLeft = Math.floor(obstacle.x / this.gridSize);
      const barRight = Math.ceil((obstacle.x + obstacle.width) / this.gridSize);
      const barTop = Math.floor(obstacle.y / this.gridSize);
      const barBottom = Math.ceil((obstacle.y + obstacle.height) / this.gridSize);
      
      // Mark the bar area plus padding as occupied
      const minX = Math.max(0, barLeft - HORIZONTAL_PADDING);
      const maxX = Math.min(this.width, barRight + HORIZONTAL_PADDING);
      const minY = Math.max(0, barTop - VERTICAL_PADDING);
      const maxY = Math.min(this.height, barBottom + VERTICAL_PADDING);
      
      for (let y = minY; y < maxY; y++) {
        for (let x = minX; x < maxX; x++) {
          this.grid[y][x] = true; // Mark as occupied
        }
      }
    });
  }

  private toGridCoords(point: Point): Point {
    return {
      x: Math.floor(point.x / this.gridSize),
      y: Math.floor(point.y / this.gridSize)
    };
  }

  private toPixelCoords(gridPoint: Point): Point {
    return {
      x: (gridPoint.x + 0.5) * this.gridSize,
      y: (gridPoint.y + 0.5) * this.gridSize
    };
  }

  private isValidCell(x: number, y: number): boolean {
    return x >= 0 && x < this.width && y >= 0 && y < this.height && !this.grid[y][x];
  }

  private heuristic(a: Point, b: Point): number {
    // Manhattan distance for rectilinear paths
    return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
  }

  private getNeighbors(cell: Point): Point[] {
    const neighbors: Point[] = [];
    
    // Only orthogonal moves (no diagonals) for cleaner rectilinear paths
    const directions = [
      { x: 0, y: -1 }, // up
      { x: 1, y: 0 },  // right
      { x: 0, y: 1 },  // down
      { x: -1, y: 0 }, // left
    ];
    
    directions.forEach(dir => {
      const newX = cell.x + dir.x;
      const newY = cell.y + dir.y;
      
      if (this.isValidCell(newX, newY)) {
        neighbors.push({ x: newX, y: newY });
      }
    });
    
    return neighbors;
  }

  private getDirection(from: Point, to: Point): string {
    if (to.x > from.x) return 'right';
    if (to.x < from.x) return 'left';
    if (to.y > from.y) return 'down';
    if (to.y < from.y) return 'up';
    return 'none';
  }

  private calculateMoveCost(current: Point, next: Point, parent: Point | null): number {
    let cost = 1; // Base cost
    
    // Penalize direction changes to prefer straight lines
    if (parent) {
      const prevDirection = this.getDirection(parent, current);
      const nextDirection = this.getDirection(current, next);
      
      if (prevDirection !== nextDirection) {
        cost += 4; // High penalty for turns
      }
    }
    
    return cost;
  }

  public findPath(start: Point, end: Point): Point[] | null {
    const gridStart = this.toGridCoords(start);
    const gridEnd = this.toGridCoords(end);
    
    // Find valid cells by moving vertically first (away from bars)
    const findValidStartCell = (cell: Point): Point => {
      // Try moving up and down to find a valid cell
      for (let offset = 0; offset < 10; offset++) {
        if (this.isValidCell(cell.x, cell.y + offset)) {
          return { x: cell.x, y: cell.y + offset };
        }
        if (this.isValidCell(cell.x, cell.y - offset)) {
          return { x: cell.x, y: cell.y - offset };
        }
      }
      // Fallback to clamping
      return {
        x: Math.max(0, Math.min(this.width - 1, cell.x)),
        y: Math.max(0, Math.min(this.height - 1, cell.y))
      };
    };
    
    const validStart = !this.isValidCell(gridStart.x, gridStart.y) 
      ? findValidStartCell(gridStart) 
      : gridStart;
    
    const validEnd = !this.isValidCell(gridEnd.x, gridEnd.y) 
      ? findValidStartCell(gridEnd) 
      : gridEnd;
    
    const openSet: GridCell[] = [];
    const closedSet = new Set<string>();
    
    const startCell: GridCell = {
      x: validStart.x,
      y: validStart.y,
      g: 0,
      h: this.heuristic(validStart, validEnd),
      f: 0,
      parent: null
    };
    startCell.f = startCell.g + startCell.h;
    
    openSet.push(startCell);
    
    let iterations = 0;
    const MAX_ITERATIONS = 10000; // Prevent infinite loops
    
    while (openSet.length > 0 && iterations < MAX_ITERATIONS) {
      iterations++;
      
      // Find cell with lowest f score
      openSet.sort((a, b) => a.f - b.f);
      const current = openSet.shift()!;
      
      const currentKey = `${current.x},${current.y}`;
      
      // Check if we reached the goal
      if (current.x === validEnd.x && current.y === validEnd.y) {
        // Reconstruct path
        const path: Point[] = [];
        let node: GridCell | null = current;
        
        while (node) {
          path.unshift(this.toPixelCoords({ x: node.x, y: node.y }));
          node = node.parent;
        }
        
        // Add actual start and end points
        path[0] = start;
        path[path.length - 1] = end;
        
        const smoothed = this.smoothPath(path);
        return this.ensureHorizontalArrowhead(smoothed);
      }
      
      closedSet.add(currentKey);
      
      // Check neighbors
      const neighbors = this.getNeighbors({ x: current.x, y: current.y });
      
      neighbors.forEach(neighbor => {
        const neighborKey = `${neighbor.x},${neighbor.y}`;
        
        if (closedSet.has(neighborKey)) return;
        
        const parentPoint = current.parent ? { x: current.parent.x, y: current.parent.y } : null;
        const moveCost = this.calculateMoveCost({ x: current.x, y: current.y }, neighbor, parentPoint);
        const tentativeG = current.g + moveCost;
        
        const existingInOpen = openSet.find(cell => cell.x === neighbor.x && cell.y === neighbor.y);
        
        if (!existingInOpen || tentativeG < existingInOpen.g) {
          const neighborCell: GridCell = {
            x: neighbor.x,
            y: neighbor.y,
            g: tentativeG,
            h: this.heuristic(neighbor, validEnd),
            f: 0,
            parent: current
          };
          neighborCell.f = neighborCell.g + neighborCell.h;
          
          if (existingInOpen) {
            // Update existing
            Object.assign(existingInOpen, neighborCell);
          } else {
            openSet.push(neighborCell);
          }
        }
      });
    }
    
    // No path found - create a safe vertical-first path as fallback
    console.warn('[GridRouter] No path found, using safe fallback path');
    const fallbackPath = this.createSafeFallbackPath(start, end);
    return this.ensureHorizontalArrowhead(fallbackPath);
  }

  private createSafeFallbackPath(start: Point, end: Point): Point[] {
    // Create a path that goes vertical first, then horizontal, then vertical
    // This ensures we never cross bars horizontally
    const path: Point[] = [start];
    
    // Move vertically away from start to a safe zone
    const midY = start.y < end.y 
      ? Math.max(start.y, end.y) + 30 // Go above
      : Math.min(start.y, end.y) - 30; // Go below
    
    path.push({ x: start.x, y: midY });
    path.push({ x: end.x, y: midY });
    path.push(end);
    
    return path;
  }

  private smoothPath(path: Point[]): Point[] {
    if (path.length <= 2) return path;
    
    // Remove redundant collinear points
    const smoothed: Point[] = [path[0]];
    
    for (let i = 1; i < path.length - 1; i++) {
      const prev = path[i - 1];
      const curr = path[i];
      const next = path[i + 1];
      
      const dir1 = this.getDirection(prev, curr);
      const dir2 = this.getDirection(curr, next);
      
      // Only keep points where direction changes
      if (dir1 !== dir2) {
        smoothed.push(curr);
      }
    }
    
    smoothed.push(path[path.length - 1]);
    return smoothed;
  }

  /**
   * Ensures the final segment approaches the target horizontally
   * (unless start and end Y are the same, which is already horizontal)
   */
  private ensureHorizontalArrowhead(path: Point[]): Point[] {
    if (path.length < 2) return path;
    
    const start = path[0];
    const end = path[path.length - 1];
    
    // If Y positions are the same, already horizontal
    if (Math.abs(start.y - end.y) < 1) return path;
    
    // Check if last segment is already horizontal
    const secondToLast = path[path.length - 2];
    const lastSegmentIsHorizontal = Math.abs(secondToLast.y - end.y) < 1;
    
    if (lastSegmentIsHorizontal) {
      // Already horizontal, no adjustment needed
      return path;
    }
    
    // Last segment is vertical, need to add a horizontal approach
    // Insert a point that creates: vertical -> horizontal -> end
    const adjustedPath = [...path];
    adjustedPath[adjustedPath.length - 1] = { x: secondToLast.x, y: end.y };
    adjustedPath.push(end);
    
    return adjustedPath;
  }

  public static createSVGPath(points: Point[], cornerRadius: number = 8): string {
    if (points.length < 2) return '';
    
    let path = `M ${points[0].x} ${points[0].y}`;
    
    for (let i = 1; i < points.length - 1; i++) {
      const prev = points[i - 1];
      const curr = points[i];
      const next = points[i + 1];
      
      // Calculate direction vectors
      const dx1 = curr.x - prev.x;
      const dy1 = curr.y - prev.y;
      const dx2 = next.x - curr.x;
      const dy2 = next.y - curr.y;
      
      // Check if it's a corner (direction change)
      if ((dx1 === 0 && dy2 === 0) || (dy1 === 0 && dx2 === 0)) {
        const dist1 = Math.sqrt(dx1 * dx1 + dy1 * dy1);
        const dist2 = Math.sqrt(dx2 * dx2 + dy2 * dy2);
        const radius = Math.min(cornerRadius, dist1 / 2, dist2 / 2);
        
        if (radius > 0) {
          // Line to start of curve
          const beforeX = curr.x - (dx1 / dist1) * radius;
          const beforeY = curr.y - (dy1 / dist1) * radius;
          path += ` L ${beforeX} ${beforeY}`;
          
          // Quadratic curve through corner
          const afterX = curr.x + (dx2 / dist2) * radius;
          const afterY = curr.y + (dy2 / dist2) * radius;
          path += ` Q ${curr.x} ${curr.y} ${afterX} ${afterY}`;
          continue;
        }
      }
      
      path += ` L ${curr.x} ${curr.y}`;
    }
    
    path += ` L ${points[points.length - 1].x} ${points[points.length - 1].y}`;
    return path;
  }
}
