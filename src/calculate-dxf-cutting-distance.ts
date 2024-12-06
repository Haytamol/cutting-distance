import DxfParser, { IEntity } from "dxf-parser";

// Type guard to check if the entity is a LINE with accessible start and end points
export const isLineEntity = (entity: IEntity): entity is IEntity => {
  return entity.type === "LINE";
};

// Helper function to retrieve start and end points for LINE entities
const getLineStartEnd = (entity: IEntity) => {
  const start = {
    x: (entity as any)["10"] as number,
    y: (entity as any)["20"] as number,
    z: (entity as any)["30"] as number,
  };
  const end = {
    x: (entity as any)["11"] as number,
    y: (entity as any)["21"] as number,
    z: (entity as any)["31"] as number,
  };
  return { start, end };
};

// Type guard to check if the entity is an ARC
export const isArcEntity = (
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
export const isCircleEntity = (
  entity: IEntity
): entity is IEntity & { radius: number } => {
  return entity.type === "CIRCLE" && "radius" in entity;
};

// Type guard to check if the entity is a POLYLINE or LWPOLYLINE
export const isPolylineEntity = (
  entity: IEntity
): entity is IEntity & { vertices: any[] } => {
  return (
    (entity.type === "LWPOLYLINE" || entity.type === "POLYLINE") &&
    "vertices" in entity
  );
};

// Type guard to check if the entity is an ELLIPSE
export const isEllipseEntity = (
  entity: IEntity
): entity is IEntity & {
  majorAxisEndPoint: any;
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

// Type guard to check if the entity is a SPLINE
export const isSplineEntity = (
  entity: IEntity
): entity is IEntity & { controlPoints: any[] } => {
  return entity.type === "SPLINE" && "controlPoints" in entity;
};

// Function to calculate SPLINE length with higher precision
const calculateSplineLength = (controlPoints: any[]): number => {
  let splineLength = 0;
  const resolution = 10; // Adjust for desired precision

  for (let i = 0; i < controlPoints.length - 1; i++) {
    const cp1 = controlPoints[i];
    const cp2 = controlPoints[i + 1];
    const dx = (cp2.x - cp1.x) / resolution;
    const dy = (cp2.y - cp1.y) / resolution;

    for (let j = 0; j < resolution; j++) {
      const x1 = cp1.x + dx * j;
      const y1 = cp1.y + dy * j;
      const x2 = cp1.x + dx * (j + 1);
      const y2 = cp1.y + dy * (j + 1);
      const segmentLength = Math.sqrt(
        Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2)
      );
      splineLength += segmentLength;
    }
  }

  return splineLength;
};

// Utility to calculate the cutting distance from a DXF file
export const calculateDxfCuttingDistance = (dxfContent: string): number => {
  const parser = new DxfParser();
  const dxf = parser.parseSync(dxfContent);

  let totalDistance = 0;

  dxf?.entities.forEach((entity) => {
    // Check if entity is a LINE and retrieve start and end points dynamically
    if (isLineEntity(entity)) {
      const { start, end } = getLineStartEnd(entity);
      console.log(
        `Processing LINE entity with start: (${start.x}, ${start.y}) and end: (${end.x}, ${end.y})`
      );
      const length = Math.sqrt(
        Math.pow(end.x - start.x, 2) + Math.pow(end.y - start.y, 2)
      );
      console.log(`Line length: ${length}`);
      totalDistance += length;
    }

    // Check for ARC entities
    if (isArcEntity(entity)) {
      const { radius, startAngle, endAngle } = entity;
      const angle = (endAngle - startAngle) * (Math.PI / 180);
      const arcLength = angle * radius;
      totalDistance += arcLength;
    }

    // Check for POLYLINE and LWPOLYLINE entities
    if (isPolylineEntity(entity)) {
      entity.vertices.forEach((vertex, index) => {
        if (index > 0) {
          const prevVertex = entity.vertices[index - 1];
          const length = Math.sqrt(
            Math.pow(vertex.x - prevVertex.x, 2) +
              Math.pow(vertex.y - prevVertex.y, 2)
          );
          totalDistance += length;
        }
      });
    }

    // Check for CIRCLE entities
    if (isCircleEntity(entity)) {
      const circleLength = 2 * Math.PI * entity.radius;
      totalDistance += circleLength;
    }

    // Check for ELLIPSE entities
    if (isEllipseEntity(entity)) {
      const { majorAxisEndPoint, ratio, startAngle, endAngle } = entity;
      const majorAxisLength = Math.sqrt(
        Math.pow(majorAxisEndPoint.x, 2) + Math.pow(majorAxisEndPoint.y, 2)
      );
      const minorAxisLength = majorAxisLength * ratio;
      const circumference =
        Math.PI *
        (3 * (majorAxisLength + minorAxisLength) -
          Math.sqrt(
            (3 * majorAxisLength + minorAxisLength) *
              (majorAxisLength + 3 * minorAxisLength)
          ));
      const angle = (endAngle - startAngle) * (Math.PI / 180);
      const ellipseArcLength = (angle / (2 * Math.PI)) * circumference;
      totalDistance += ellipseArcLength;
    }

    // Check for SPLINE entities with refined length calculation
    if (isSplineEntity(entity)) {
      const splineLength = calculateSplineLength(entity.controlPoints);
      totalDistance += splineLength;
    }
  });

  return totalDistance;
};
