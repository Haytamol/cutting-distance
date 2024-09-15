import React, {
  useCallback,
  useEffect,
  useRef,
  forwardRef,
  useImperativeHandle,
} from "react";
import * as THREE from "three";
import DxfParser from "dxf-parser";

interface DXFViewerProps {
  width: number;
  height: number;
}

interface DXFViewerRef {
  loadDxfContent: (content: string) => Promise<THREE.Box3>;
}

const SCALE_FACTOR = 0.1;
const ZOOM_SPEED = 0.001;

const DXFViewer = forwardRef<DXFViewerRef, DXFViewerProps>(
  ({ width, height }, ref) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const sceneRef = useRef<THREE.Scene | null>(null);
    const cameraRef = useRef<THREE.OrthographicCamera | null>(null);
    const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
    const isDraggingRef = useRef<boolean>(false);
    const previousMousePositionRef = useRef<{ x: number; y: number }>({
      x: 0,
      y: 0,
    });

    const fitToScene = useCallback(
      (padding = 1.2) => {
        if (!sceneRef.current || !cameraRef.current) return;

        const box = new THREE.Box3().setFromObject(sceneRef.current);
        const size = box.getSize(new THREE.Vector3());
        const center = box.getCenter(new THREE.Vector3());

        const maxDim = Math.max(size.x, size.y) * padding;
        const aspect = width / height;

        cameraRef.current.left = (-maxDim * aspect) / 2;
        cameraRef.current.right = (maxDim * aspect) / 2;
        cameraRef.current.top = maxDim / 2;
        cameraRef.current.bottom = -maxDim / 2;
        cameraRef.current.position.set(center.x, center.y, 100);
        cameraRef.current.lookAt(center.x, center.y, 0);

        cameraRef.current.near = 0.1;
        cameraRef.current.far = 1000;
        cameraRef.current.updateProjectionMatrix();

        rendererRef.current?.render(sceneRef.current, cameraRef.current);
      },
      [width, height]
    );

    useEffect(() => {
      if (!containerRef.current) return;

      const scene = new THREE.Scene();
      const camera = new THREE.OrthographicCamera(
        width / -2,
        width / 2,
        height / 2,
        height / -2,
        0.1,
        1000
      );
      const renderer = new THREE.WebGLRenderer({ antialias: true });

      renderer.setSize(width, height);
      containerRef.current.appendChild(renderer.domElement);

      camera.position.set(0, 0, 100);
      camera.lookAt(0, 0, 0);

      scene.background = new THREE.Color(0xffffff);

      sceneRef.current = scene;
      cameraRef.current = camera;
      rendererRef.current = renderer;

      const animate = () => {
        requestAnimationFrame(animate);
        renderer.render(scene, camera);
      };
      animate();

      const onMouseDown = (event: React.MouseEvent<HTMLDivElement>) => {
        isDraggingRef.current = true;
        previousMousePositionRef.current = {
          x: event.clientX,
          y: event.clientY,
        };
      };

      const onMouseMove = (event: React.MouseEvent<HTMLDivElement>) => {
        if (!isDraggingRef.current || !cameraRef.current) return;

        const deltaMove = {
          x: event.clientX - previousMousePositionRef.current.x,
          y: event.clientY - previousMousePositionRef.current.y,
        };

        const zoomLevel = cameraRef.current.top - cameraRef.current.bottom;
        const moveX = (deltaMove.x / height) * zoomLevel;
        const moveY = (deltaMove.y / height) * zoomLevel;

        cameraRef.current.position.x -= moveX;
        cameraRef.current.position.y += moveY;

        previousMousePositionRef.current = {
          x: event.clientX,
          y: event.clientY,
        };
      };

      const onMouseUp = () => {
        isDraggingRef.current = false;
      };

      const onWheel = (event: React.WheelEvent<HTMLDivElement>) => {
        event.preventDefault();
        if (!cameraRef.current) return;

        const zoomAmount = event.deltaY * ZOOM_SPEED;
        const aspect = width / height;
        const currentZoom = cameraRef.current.top - cameraRef.current.bottom;
        const newZoom = currentZoom * (1 + zoomAmount);

        cameraRef.current.top = newZoom / 2;
        cameraRef.current.bottom = -newZoom / 2;
        cameraRef.current.left = -(newZoom * aspect) / 2;
        cameraRef.current.right = (newZoom * aspect) / 2;
        cameraRef.current.updateProjectionMatrix();
      };

      const handleMouseDown = (event: MouseEvent) => {
        onMouseDown(event as unknown as React.MouseEvent<HTMLDivElement>);
      };

      const handleMouseMove = (event: MouseEvent) => {
        onMouseMove(event as unknown as React.MouseEvent<HTMLDivElement>);
      };

      const handleMouseUp = () => {
        onMouseUp();
      };

      const handleWheel = (event: WheelEvent) => {
        onWheel(event as unknown as React.WheelEvent<HTMLDivElement>);
      };

      renderer.domElement.addEventListener("mousedown", handleMouseDown);
      renderer.domElement.addEventListener("mousemove", handleMouseMove);
      renderer.domElement.addEventListener("mouseup", handleMouseUp);
      renderer.domElement.addEventListener("mouseleave", handleMouseUp);
      renderer.domElement.addEventListener("wheel", handleWheel);

      return () => {
        renderer.dispose();
        containerRef.current?.removeChild(renderer.domElement);
        renderer.domElement.removeEventListener("mousedown", handleMouseDown);
        renderer.domElement.removeEventListener("mousemove", handleMouseMove);
        renderer.domElement.removeEventListener("mouseup", handleMouseUp);
        renderer.domElement.removeEventListener("mouseleave", handleMouseUp);
        renderer.domElement.removeEventListener("wheel", handleWheel);
      };
    }, [width, height]);

    useImperativeHandle(ref, () => ({
      loadDxfContent: async (content: string): Promise<THREE.Box3> => {
        if (!sceneRef.current) {
          throw new Error("Scene reference is not available");
        }

        console.log("Starting DXF parsing...");
        const parser = new DxfParser();
        let dxf;
        try {
          dxf = parser.parseSync(content);
        } catch (error) {
          console.error("Error parsing DXF:", error);
          throw new Error(`Failed to parse DXF content: ${error}`);
        }

        if (!dxf) {
          throw new Error("DXF parsing resulted in null or undefined");
        }

        console.log(
          "DXF parsed successfully. Full DXF object:",
          JSON.stringify(dxf, null, 2)
        );

        sceneRef.current.clear();
        const group = new THREE.Group();

        let entityCount = 0;
        const boundingBox = new THREE.Box3();

        if (dxf.entities && dxf.entities.length > 0) {
          console.log(`Found ${dxf.entities.length} entities`);
          dxf.entities.forEach((entity: any, index: number) => {
            console.log(`Processing entity ${index} of type:`, entity.type);
            console.log("Entity details:", JSON.stringify(entity, null, 2));
            let object;

            switch (entity.type) {
              case "LINE":
                object = createLine(entity);
                break;
              case "LWPOLYLINE":
              case "POLYLINE":
                object = createPolyline(entity);
                break;
              case "CIRCLE":
                object = createCircle(entity);
                break;
              case "ARC":
                object = createArc(entity);
                break;
              case "SPLINE":
                object = createSpline(entity);
                break;
              default:
                console.log(`Unsupported entity type: ${entity.type}`);
            }

            if (object) {
              group.add(object);
              entityCount++;
              boundingBox.expandByObject(object);
              console.log(`Added entity ${index} to the scene`);
            } else {
              console.log(`Failed to create object for entity ${index}`);
            }
          });
        } else {
          console.warn("No entities found in the DXF file");
        }

        sceneRef.current.add(group);

        console.log("Entity count:", entityCount);
        console.log("Bounding box:", boundingBox.min, boundingBox.max);

        if (entityCount > 0) {
          fitToScene();
        } else {
          console.warn("No entities were rendered");
        }

        return boundingBox;
      },
    }));

    return <div ref={containerRef} />;
  }
);

// Add this new function to handle SPLINE entities
function createSpline(entity: any) {
  if (!entity.controlPoints || entity.controlPoints.length < 2) {
    console.warn("Invalid SPLINE entity:", entity);
    return null;
  }
  const points = entity.controlPoints.map(
    (p: any) => new THREE.Vector3(p.x * SCALE_FACTOR, p.y * SCALE_FACTOR, 0)
  );
  const curve = new THREE.CatmullRomCurve3(points);
  const geometry = new THREE.BufferGeometry().setFromPoints(
    curve.getPoints(50)
  );
  return new THREE.Line(
    geometry,
    new THREE.LineBasicMaterial({ color: 0x000000 })
  );
}

// Update other entity creation functions to include error handling
function createLine(entity: any) {
  if (!entity.vertices || entity.vertices.length < 2) {
    console.warn("Invalid LINE entity:", entity);
    return null;
  }
  const geometry = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(
      entity.vertices[0].x * SCALE_FACTOR,
      entity.vertices[0].y * SCALE_FACTOR,
      0
    ),
    new THREE.Vector3(
      entity.vertices[1].x * SCALE_FACTOR,
      entity.vertices[1].y * SCALE_FACTOR,
      0
    ),
  ]);
  return new THREE.Line(
    geometry,
    new THREE.LineBasicMaterial({ color: 0x000000 })
  );
}
function createPolyline(entity: any): THREE.Line | null {
  if (!entity.vertices || !Array.isArray(entity.vertices)) {
    console.warn("Invalid POLYLINE entity:", entity);
    return null;
  }

  const points: THREE.Vector3[] = [];
  const vertices = entity.vertices;

  for (let i = 0; i < vertices.length; i++) {
    const v = vertices[i];
    const nextV = vertices[(i + 1) % vertices.length];

    points.push(new THREE.Vector3(v.x * SCALE_FACTOR, v.y * SCALE_FACTOR, 0));

    if (v.bulge) {
      const arcPoints = createArcGeometry(v, nextV, v.bulge, SCALE_FACTOR);
      points.push(...arcPoints.slice(1)); // Exclude the first point to avoid duplication
    }
  }

  const geometry = new THREE.BufferGeometry().setFromPoints(points);
  const material = new THREE.LineBasicMaterial({ color: 0x000000 });
  return new THREE.Line(geometry, material);
}

function createArcGeometry(
  start: { x: number; y: number },
  end: { x: number; y: number },
  bulge: number,
  scaleFactor: number
): THREE.Vector3[] {
  const chord = new THREE.Vector2(end.x - start.x, end.y - start.y);
  const chordLength = chord.length();
  const theta = 4 * Math.atan(Math.abs(bulge));
  const radius = chordLength / (2 * Math.sin(theta / 2));

  const midpoint = new THREE.Vector2(
    (start.x + end.x) / 2,
    (start.y + end.y) / 2
  );

  const perpendicular = new THREE.Vector2(-chord.y, chord.x).normalize();
  const center = midpoint.add(
    perpendicular.multiplyScalar(
      radius * Math.cos(theta / 2) * (bulge > 0 ? 1 : -1)
    )
  );

  const startAngle = Math.atan2(start.y - center.y, start.x - center.x);
  const endAngle = startAngle + (bulge > 0 ? theta : -theta);

  const numSegments = Math.max(Math.ceil(Math.abs(theta) * radius * 20), 64);
  const points: THREE.Vector3[] = [];

  for (let i = 0; i <= numSegments; i++) {
    const t = i / numSegments;
    const angle = startAngle + (endAngle - startAngle) * t;
    points.push(
      new THREE.Vector3(
        (center.x + Math.cos(angle) * radius) * scaleFactor,
        (center.y + Math.sin(angle) * radius) * scaleFactor,
        0
      )
    );
  }

  return points;
}

function createCircle(entity: any): THREE.LineLoop | null {
  if (!entity.radius || !entity.center) {
    console.warn("Invalid CIRCLE entity:", entity);
    return null;
  }
  const geometry = new THREE.BufferGeometry();
  const points: THREE.Vector3[] = [];
  for (let i = 0; i <= 64; i++) {
    const angle = (i / 64) * Math.PI * 2;
    points.push(
      new THREE.Vector3(
        Math.cos(angle) * entity.radius * SCALE_FACTOR,
        Math.sin(angle) * entity.radius * SCALE_FACTOR,
        0
      )
    );
  }
  geometry.setFromPoints(points);
  const circle = new THREE.LineLoop(
    geometry,
    new THREE.LineBasicMaterial({ color: 0x000000 })
  );
  circle.position.set(
    entity.center.x * SCALE_FACTOR,
    entity.center.y * SCALE_FACTOR,
    0
  );
  return circle;
}

function createArc(entity: any): THREE.Line | null {
  if (
    !entity.center ||
    entity.startAngle === undefined ||
    entity.endAngle === undefined ||
    !entity.radius
  ) {
    console.warn("Invalid ARC entity:", entity);
    return null;
  }

  const geometry = new THREE.BufferGeometry();
  const points: THREE.Vector3[] = [];

  const startAngle = entity.startAngle;
  const endAngle = entity.endAngle;
  const radius = entity.radius;

  // Ensure the end angle is greater than the start angle
  const fullAngle = endAngle < startAngle ? endAngle + 2 * Math.PI : endAngle;

  // Number of segments to use for the arc
  const segments = 32;

  for (let i = 0; i <= segments; i++) {
    const angle = startAngle + (fullAngle - startAngle) * (i / segments);
    const x = entity.center.x + radius * Math.cos(angle);
    const y = entity.center.y + radius * Math.sin(angle);
    points.push(new THREE.Vector3(x * SCALE_FACTOR, y * SCALE_FACTOR, 0));
  }

  geometry.setFromPoints(points);

  return new THREE.Line(
    geometry,
    new THREE.LineBasicMaterial({ color: 0x000000 })
  );
}

export default DXFViewer;
