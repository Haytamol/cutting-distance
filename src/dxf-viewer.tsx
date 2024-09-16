import React, { useEffect, useState } from "react";
import { useDxfViewer } from "./useDxfViewer";

interface DxfViewerComponentProps {
  dxfUrl: string;
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
    if (isLoaded) {
      renderToCanvas();
    }
  }, [isLoaded, renderToCanvas]);

  return (
    <div>
      <div
        ref={containerRef}
        style={{
          width: `${width}px`,
          height: `${height}px`,
          position: "relative",
        }}
      >
        {!isLoaded && <div>Loading...</div>}
        {error && <div className="error">{error}</div>}
      </div>
      {isLoaded && (
        <div>
          <div>Entities: {entityCount}</div>
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
      )}
    </div>
  );
};

export default DxfViewerComponent;
