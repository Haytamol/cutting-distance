import DxfParser, { IEntity } from "dxf-parser";

// Define a Point type for clarity
type Point = { x: number; y: number; z?: number };

// Type guard to check if the entity is a LINE
const isLineEntity = (
  entity: IEntity
): entity is IEntity & { start: Point; end: Point } => {
  return entity.type === "LINE" && "start" in entity && "end" in entity;
};

// Type guard to check if the entity is an ARC
const isArcEntity = (
  entity: IEntity
): entity is IEntity & {
  radius: number;
  startAngle: number;
  endAngle: number;
} => {
  return (
    entity.type === "ARC" &&
    "radius" in entity &&
    "startAngle" in entity &&
    "endAngle" in entity
  );
};

// Type guard to check if the entity is a CIRCLE
const isCircleEntity = (
  entity: IEntity
): entity is IEntity & { radius: number; center: Point } => {
  return entity.type === "CIRCLE" && "radius" in entity && "center" in entity;
};

// Type guard to check if the entity is a POLYLINE or LWPOLYLINE
const isPolylineEntity = (
  entity: IEntity
): entity is IEntity & { vertices: Point[] } => {
  return (
    (entity.type === "LWPOLYLINE" || entity.type === "POLYLINE") &&
    "vertices" in entity
  );
};

// Type guard to check if the entity is a SPLINE
const isSplineEntity = (
  entity: IEntity
): entity is IEntity & { controlPoints: Point[] } => {
  return entity.type === "SPLINE" && "controlPoints" in entity;
};

// Type guard to check if the entity is an ELLIPSE
const isEllipseEntity = (
  entity: IEntity
): entity is IEntity & {
  majorAxisEndPoint: Point;
  ratio: number;
  startAngle: number;
  endAngle: number;
} => {
  return (
    entity.type === "ELLIPSE" &&
    "majorAxisEndPoint" in entity &&
    "ratio" in entity &&
    "startAngle" in entity &&
    "endAngle" in entity
  );
};

// Main function to calculate pierce count
export const calculateDxfPierceCount = (dxfContent: string): number => {
  const parser = new DxfParser();
  const dxf = parser.parseSync(dxfContent);

  // Map to track connections between points
  const connections = new Map<string, Point[]>();

  // Utility function to add connections between two points
  const addConnection = (pointA: Point, pointB: Point) => {
    const keyA = JSON.stringify(pointA);
    const keyB = JSON.stringify(pointB);

    if (!connections.has(keyA)) connections.set(keyA, []);
    if (!connections.has(keyB)) connections.set(keyB, []);

    connections.get(keyA)!.push(pointB);
    connections.get(keyB)!.push(pointA);
  };

  // Step 1: Populate the connection map with relevant entities
  dxf?.entities.forEach((entity) => {
    if (isLineEntity(entity)) {
      addConnection(entity.start, entity.end);
    } else if (isArcEntity(entity)) {
      const start = {
        x: entity.radius * Math.cos(entity.startAngle),
        y: entity.radius * Math.sin(entity.startAngle),
      };
      const end = {
        x: entity.radius * Math.cos(entity.endAngle),
        y: entity.radius * Math.sin(entity.endAngle),
      };
      addConnection(start, end);
    } else if (isPolylineEntity(entity)) {
      entity.vertices?.forEach((vertex, index) => {
        if (index > 0) addConnection(entity.vertices[index - 1], vertex);
      });
    } else if (isSplineEntity(entity)) {
      entity.controlPoints.forEach((controlPoint, index) => {
        if (index > 0)
          addConnection(entity.controlPoints[index - 1], controlPoint);
      });
    } else if (isCircleEntity(entity)) {
      addConnection(entity.center, entity.center); // Circle center as a single pierce
    } else if (isEllipseEntity(entity)) {
      const { majorAxisEndPoint, ratio, startAngle, endAngle } = entity;
      const majorAxisLength = Math.sqrt(
        Math.pow(majorAxisEndPoint.x, 2) + Math.pow(majorAxisEndPoint.y, 2)
      );
      const minorAxisLength = majorAxisLength * ratio;
      const start = {
        x: majorAxisLength * Math.cos(startAngle),
        y: minorAxisLength * Math.sin(startAngle),
      };
      const end = {
        x: majorAxisLength * Math.cos(endAngle),
        y: minorAxisLength * Math.sin(endAngle),
      };
      addConnection(start, end);
    }
  });

  // Step 2: Detect and count closed loops
  const visited = new Set<string>();
  let pierceCount = 0;

  const dfs = (startKey: string, currentKey: string): boolean => {
    visited.add(currentKey);
    const neighbors = connections.get(currentKey);
    let isClosed = false;

    for (const neighbor of neighbors || []) {
      const neighborKey = JSON.stringify(neighbor);
      if (!visited.has(neighborKey)) {
        isClosed = dfs(startKey, neighborKey) || isClosed;
      } else if (neighborKey === startKey) {
        isClosed = true;
      }
    }
    return isClosed;
  };

  connections.forEach((_, pointKey) => {
    if (!visited.has(pointKey)) {
      if (dfs(pointKey, pointKey)) pierceCount++;
    }
  });

  return pierceCount;
};
