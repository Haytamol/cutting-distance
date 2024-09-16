import { useCallback, useRef, useState } from "react";
import * as THREE from "three";
import { SceneInfo } from "./types";
// @ts-ignore
import { DxfViewer } from "dxf-viewer/src/DxfViewer";

const modifyDxfContent = (content: string): string => {
  const lines = content.split("\n");
  let layerSectionIndex = -1;
  let continuousLineIndex = -1;

  for (let i = 0; i < lines.length; i++) {
    if (lines[i].trim() === "2" && lines[i + 1].trim() === "LAYER") {
      layerSectionIndex = i;
    }
    if (
      layerSectionIndex !== -1 &&
      lines[i].trim() === "6" &&
      lines[i + 1].trim() === "CONTINUOUS"
    ) {
      continuousLineIndex = i + 1;
      break;
    }
  }

  if (continuousLineIndex !== -1) {
    lines.splice(continuousLineIndex + 1, 0, "62", "7");
  }

  return lines.join("\n");
};

export const useDxfViewer = (options: any) => {
  const viewerRef = useRef<DxfViewer | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [isLoaded, setIsLoaded] = useState(false);
  const [sceneInfo, setSceneInfo] = useState<SceneInfo | null>(null);
  const [entityCount, setEntityCount] = useState(0);

  const initializeViewer = useCallback(() => {
    if (containerRef.current && !viewerRef.current) {
      try {
        const container = containerRef.current;
        console.log("Container element:", container);
        console.log("Container dimensions:", container.getBoundingClientRect());

        viewerRef.current = new DxfViewer(container, {
          ...options,
        });
        console.log("DxfViewer initialized successfully");
      } catch (error) {
        console.error("Error initializing DxfViewer:", error);
        console.error("Error details:", (error as Error).stack);
      }
    }
  }, [options]);

  const loadDxf = useCallback(async (url: string, fonts: string[] = []) => {
    if (!viewerRef.current) {
      console.error("DxfViewer is not initialized");
      return;
    }

    setIsLoaded(false);
    setSceneInfo(null);
    setEntityCount(0);

    try {
      console.log("Starting to load DXF from URL:", url);

      // Fetch the DXF content
      const response = await fetch(url);
      const dxfContent = await response.text();

      // Modify the DXF content
      const modifiedDxfContent = modifyDxfContent(dxfContent);

      // Create a new Blob with the modified content
      const modifiedBlob = new Blob([modifiedDxfContent], {
        type: "application/dxf",
      });
      const modifiedUrl = URL.createObjectURL(modifiedBlob);

      await viewerRef.current.Load({
        url: modifiedUrl,
        fonts,
        workerFactory: DxfViewer.SetupWorker
          ? () => DxfViewer.SetupWorker()
          : undefined,
      });

      // Clean up the temporary URL
      URL.revokeObjectURL(modifiedUrl);

      console.log("DXF loaded successfully");

      const scene = viewerRef.current.GetScene();
      if (!scene) {
        throw new Error("Scene is null after loading DXF");
      }

      console.log("Scene retrieved successfully");
      console.log("Scene children count:", scene.children.length);

      // Debug: Log scene hierarchy
      console.log("Scene hierarchy:");
      logSceneHierarchy(scene);

      let validGeometryCount = 0;
      let invalidGeometryCount = 0;

      // Ensure all geometries are valid and set material color
      const blackMaterial = new THREE.LineBasicMaterial({ color: 0x000000 });
      scene.traverse((object: THREE.Object3D) => {
        if (object instanceof THREE.Mesh || object instanceof THREE.Line) {
          const geometry = object.geometry as THREE.BufferGeometry;
          if (geometry.attributes.position) {
            const positions = geometry.attributes.position.array;
            const hasNaN = positions.some((value: number) => isNaN(value));
            if (hasNaN) {
              console.error(
                `Invalid geometry found: ${object.name || "Unnamed object"}`
              );
              invalidGeometryCount++;
            } else {
              validGeometryCount++;
              geometry.computeBoundingBox();
              geometry.computeBoundingSphere();
            }
          }

          // Set material color to black
          if (object instanceof THREE.Mesh) {
            object.material = new THREE.MeshBasicMaterial({
              color: 0x000000,
              wireframe: true,
            });
          } else if (object instanceof THREE.Line) {
            object.material = blackMaterial;
          }
        }
      });

      console.log(
        `Valid geometries: ${validGeometryCount}, Invalid geometries: ${invalidGeometryCount}`
      );

      // Calculate bounding box only for valid geometries
      const boundingBox = new THREE.Box3();
      scene.traverse((object: THREE.Object3D) => {
        if (object instanceof THREE.Mesh || object instanceof THREE.Line) {
          const geometry = object.geometry as THREE.BufferGeometry;
          if (geometry.boundingBox) {
            boundingBox.expandByObject(object);
          }
        }
      });

      if (boundingBox.min.x !== Infinity) {
        const center = new THREE.Vector3();
        boundingBox.getCenter(center);
        const size = new THREE.Vector3();
        boundingBox.getSize(size);

        console.log("Bounding box:", boundingBox);
        console.log("Center:", center);
        console.log("Size:", size);

        const camera = viewerRef.current.GetCamera();
        const maxDim = Math.max(size.x, size.y, size.z);
        const fov = camera.fov * (Math.PI / 180);
        let cameraZ = Math.abs(maxDim / 2 / Math.tan(fov / 2));
        cameraZ *= 1.5; // Zoom out a bit

        camera.position.set(center.x, center.y, cameraZ);
        camera.lookAt(center);
        camera.updateProjectionMatrix();

        console.log("Camera position:", camera.position);
        console.log("Camera lookAt:", center);
      } else {
        console.error("Failed to calculate valid bounding box");
      }

      const newSceneInfo: SceneInfo = {
        batches: scene.children.length,
        layers: Object.keys(viewerRef.current.GetLayers()).length,
        blocks: 0,
        vertices: validGeometryCount,
        indices: scene.children.reduce(
          (acc: number, child: THREE.Object3D) =>
            acc + ((child as THREE.Mesh).geometry?.index?.count || 0),
          0
        ),
        transforms: scene.children.length,
      };
      setSceneInfo(newSceneInfo);
      setEntityCount(scene.children.length);
      setIsLoaded(true);

      // Force a re-render
      viewerRef.current.Render();
    } catch (error) {
      console.error("Error loading DXF:", error);
      setIsLoaded(false);
    }
  }, []);

  const renderToCanvas = useCallback(() => {
    if (!isLoaded || !viewerRef.current) {
      console.log("Cannot render: not ready or DXF not loaded");
      return;
    }

    try {
      viewerRef.current.Render();
    } catch (error) {
      console.error("Error rendering DXF:", error);
    }
  }, [isLoaded]);

  return {
    loadDxf,
    renderToCanvas,
    isLoaded,
    sceneInfo,
    entityCount,
    containerRef,
    initializeViewer,
  };
};

function logSceneHierarchy(object: THREE.Object3D, indent: string = "") {
  console.log(`${indent}${object.type}: ${object.name}`);
  object.children.forEach((child) => logSceneHierarchy(child, indent + "  "));
}
