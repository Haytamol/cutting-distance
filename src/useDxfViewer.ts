import { useCallback, useRef, useState } from "react";
import * as THREE from "three";
import { SceneInfo } from "./types";
// @ts-ignore
import { DxfViewer } from "dxf-viewer/src/DxfViewer";

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

      await viewerRef.current.Load({
        url,
        fonts,
        workerFactory: DxfViewer.SetupWorker
          ? () => DxfViewer.SetupWorker()
          : undefined,
      });

      console.log("DXF loaded successfully");

      const scene = viewerRef.current.GetScene();
      if (!scene) {
        throw new Error("Scene is null after loading DXF");
      }

      console.log("Scene retrieved successfully");
      console.log("Scene children count:", scene.children.length);

      // Set dark gray line material for all entities
      const darkGrayLineMaterial = new THREE.LineBasicMaterial({
        color: 0x000000, // Dark gray color
        linewidth: 1,
      });
      scene.traverse((object: THREE.Object3D) => {
        if (object instanceof THREE.Mesh) {
          const geometry = object.geometry;
          const edges = new THREE.EdgesGeometry(geometry);
          const line = new THREE.LineSegments(edges, darkGrayLineMaterial);
          scene.add(line);
          object.visible = false; // Hide the original mesh
        }
      });

      const boundingBox = new THREE.Box3();
      scene.children.forEach((child: THREE.Object3D) => {
        if (child instanceof THREE.Mesh && child.geometry) {
          child.geometry.computeBoundingBox();
          boundingBox.expandByObject(child);
        }
      });

      if (boundingBox.isEmpty()) {
        console.warn("Bounding box is empty or invalid");
      } else {
        const camera = viewerRef.current.GetCamera();
        const center = new THREE.Vector3();
        boundingBox.getCenter(center);
        const size = new THREE.Vector3();
        boundingBox.getSize(size);

        const maxDim = Math.max(size.x, size.y, size.z);
        const fov = camera.fov * (Math.PI / 180);
        let cameraZ = Math.abs(maxDim / 2 / Math.tan(fov / 2));
        cameraZ *= 1.5; // Zoom out a bit

        if (isFinite(center.x) && isFinite(center.y) && isFinite(cameraZ)) {
          camera.position.set(center.x, center.y, cameraZ);
          camera.lookAt(center);
          camera.updateProjectionMatrix();

          console.log("Camera positioned for center view");
          console.log("Camera position:", camera.position);
          console.log("Look at point:", center);
        } else {
          console.warn("Invalid camera position or look at point");
        }
      }

      const newSceneInfo: SceneInfo = {
        batches: scene.children.length,
        layers: Object.keys(viewerRef.current.GetLayers()).length,
        blocks: 0,
        vertices: scene.children.reduce(
          (acc: number, child: THREE.Object3D) =>
            acc +
            ((child as THREE.Mesh).geometry?.attributes.position?.count || 0),
          0
        ),
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
