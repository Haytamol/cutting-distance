import React, { useState, useCallback } from "react";
import DxfViewerComponent from "./dxf-viewer";
import SvgViewer from "./svg-viewer";
import { calculateSvgCuttingDistance } from "./calculate-svg-cutting-distance";
import "./App.css";
import * as THREE from "three";

const App: React.FC = () => {
  const [dxfUrl, setDxfUrl] = useState<string | null>(null);
  const [svgContent, setSvgContent] = useState<string | null>(null);
  const [svgDetails, setSvgDetails] = useState<{
    cuttingDistance: number | null;
    otherMetrics?: { [key: string]: any };
  } | null>(null);

  const handleDxfFileChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const selectedFile = event.target.files?.[0];
      if (selectedFile) {
        const fileUrl = URL.createObjectURL(selectedFile);
        setDxfUrl(fileUrl);
      }
    },
    []
  );

  const handleSvgFileChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const selectedFile = event.target.files?.[0];
      if (selectedFile) {
        const reader = new FileReader();
        reader.onload = (e) => {
          if (e.target?.result) {
            const svgText = e.target.result as string;
            setSvgContent(svgText);

            // Calculate SVG details
            const cuttingDistance = calculateSvgCuttingDistance(svgText);
            const otherMetrics = {
              pathCount: 5, // Example metric: Add more as needed
              shapes: 3, // Example metric
            };

            setSvgDetails({
              cuttingDistance,
              otherMetrics,
            });
          }
        };
        reader.readAsText(selectedFile);
      }
    },
    []
  );

  const options = {
    clearColor: new THREE.Color("#ffffff"),
    autoResize: true,
    sceneOptions: {
      wireframeMesh: false,
      showEdges: true,
      boundingBox: false,
      debug: true,
    },
  };

  const fonts: string[] = [];

  return (
    <div className="App">
      <h1>DXF and SVG Viewer</h1>

      {/* File Upload Buttons */}
      <div className="file-input-container">
        <label className="file-input-label">
          Upload DXF
          <input type="file" accept=".dxf" onChange={handleDxfFileChange} />
        </label>
        <label className="file-input-label">
          Upload SVG
          <input type="file" accept=".svg" onChange={handleSvgFileChange} />
        </label>
      </div>

      {/* Viewers Section */}
      <div className="viewers-container">
        {/* DXF Viewer */}
        <div className="viewer-container">
          <DxfViewerComponent
            dxfUrl={dxfUrl}
            options={options}
            fonts={fonts}
            width={800}
            height={600}
          />
        </div>

        {/* SVG Viewer */}
        <div className="viewer-container">
          <SvgViewer svgContent={svgContent} svgDetails={svgDetails} />
        </div>
      </div>
    </div>
  );
};

export default App;
