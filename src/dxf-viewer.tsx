import React, { useEffect, useState } from "react";
import { useDxfViewer } from "./useDxfViewer";
import { calculateDxfCuttingDistance } from "./calculate-dxf-cutting-distance";
import { calculateDxfPierceCount } from "./calculate-pierce-count";

interface DxfViewerComponentProps {
  dxfUrl: string | null;
  fonts?: string[];
  options?: any;
  width: number;
  height: number;
}

const DxfViewerComponent: React.FC<DxfViewerComponentProps> = ({
  dxfUrl,
  fonts = [],
  options = {},
  width,
  height,
}) => {
  const {
    loadDxf,
    renderToCanvas,
    isLoaded,
    sceneInfo,
    entityCount,
    containerRef,
    initializeViewer,
  } = useDxfViewer(options);

  const [cuttingDistance, setCuttingDistance] = useState(0);
  const [pierceCount, setPierceCount] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    initializeViewer();
  }, [initializeViewer]);

  useEffect(() => {
    if (dxfUrl) {
      loadDxf(dxfUrl, fonts).catch((err) => {
        console.error("Failed to load DXF:", err);
        setError(`Error loading DXF: ${err}`);
      });
    }
  }, [dxfUrl, fonts, loadDxf]);

  useEffect(() => {
    if (isLoaded && dxfUrl) {
      renderToCanvas();

      fetch(dxfUrl)
        .then((response) => response.blob())
        .then((blob) => {
          const reader = new FileReader();
          reader.onload = (e) => {
            const content = e.target?.result as string;

            // Calculate and set cutting distance and pierce count
            setCuttingDistance(calculateDxfCuttingDistance(content));
            setPierceCount(calculateDxfPierceCount(content));
          };
          reader.readAsText(blob);
        })
        .catch((err) => {
          console.error("Failed to fetch DXF as Blob:", err);
          setError(`Error fetching DXF: ${err}`);
        });
    }
  }, [isLoaded, renderToCanvas, dxfUrl]);

  return (
    <div className="dxf-component">
      {/* DXF Display Section */}
      <div
        ref={containerRef}
        className="dxf-viewer-display"
        style={{
          width: `${width}px`,
          height: `${height}px`,
          position: "relative",
          border: "1px solid #ccc",
          borderRadius: "8px",
          marginBottom: "16px",
          overflow: "hidden",
        }}
      >
        {!isLoaded && <div>Loading...</div>}
        {error && <div className="error">{error}</div>}
      </div>

      {/* DXF Details Section */}
      <div className="dxf-details">
        <h3>DXF Details</h3>
        <div>Entities: {entityCount}</div>
        <div>Cutting Distance: {cuttingDistance.toFixed(2)} mm</div>
        <div>Pierce Count: {pierceCount}</div>
        {sceneInfo && (
          <>
            <div>Batches: {sceneInfo.batches}</div>
            <div>Layers: {sceneInfo.layers}</div>
            <div>Vertices: {sceneInfo.vertices}</div>
            <div>Indices: {sceneInfo.indices}</div>
            <div>Transforms: {sceneInfo.transforms}</div>
          </>
        )}
      </div>
    </div>
  );
};

export default DxfViewerComponent;
