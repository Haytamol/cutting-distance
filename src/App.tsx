import React, { useState, useEffect, useRef } from "react";
import DXFViewer from "./DXFViewer";
import "./App.css";
import * as THREE from "three";

interface Dimensions {
  width: string;
  height: string;
}

const SCALE_FACTOR = 0.1;

const App: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [dimensions, setDimensions] = useState<Dimensions | null>(null);
  const [debugInfo, setDebugInfo] = useState<string>("");
  const viewerRef = useRef<{
    loadDxfContent: (content: string) => Promise<THREE.Box3>;
  } | null>(null);

  // Handle file selection
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setDimensions(null);
      setDebugInfo("");
    }
  };

  useEffect(() => {
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      const dxfContent = e.target?.result;
      if (viewerRef.current && typeof dxfContent === "string") {
        try {
          setDebugInfo("Loading DXF content...");

          // Log the first few lines of the DXF content for debugging
          setDebugInfo(
            (prevInfo) =>
              `${prevInfo}\nFirst 200 characters of DXF content:\n${dxfContent.substring(
                0,
                200
              )}`
          );

          const box = await viewerRef.current.loadDxfContent(dxfContent);
          setDebugInfo(
            (prevInfo) =>
              `${prevInfo}\nEntities rendered. Bounding box: ${JSON.stringify(
                box
              )}`
          );

          // Validate bounding box
          const isValid =
            box &&
            Object.values(box.min).every((v) => v !== null && isFinite(v)) &&
            Object.values(box.max).every((v) => v !== null && isFinite(v)) &&
            (box.max.x > box.min.x ||
              box.max.y > box.min.y ||
              box.max.z > box.min.z);

          if (isValid) {
            setDimensions({
              width: ((box.max.x - box.min.x) / SCALE_FACTOR).toFixed(2),
              height: ((box.max.y - box.min.y) / SCALE_FACTOR).toFixed(2),
            });
          } else {
            setDimensions({ width: "N/A", height: "N/A" });
            setDebugInfo(
              (prevInfo) =>
                `${prevInfo}\nInvalid or empty bounding box: ${JSON.stringify(
                  box
                )}\n` +
                `This may indicate that no entities were found in the DXF file.`
            );
          }
        } catch (error: unknown) {
          console.error("Error loading DXF content:", error);
          setDebugInfo(
            (prevInfo) =>
              `${prevInfo}\nError loading DXF content: ${
                error instanceof Error ? error.message : String(error)
              }\n` +
              `Check if the DXF file contains valid entity data.\n` +
              `DXF content length: ${dxfContent.length} characters`
          );
        }
      }
    };
    reader.readAsText(file);
  }, [file]);

  return (
    <div className="App">
      <h1>DXF Viewer</h1>
      <div className="file-input-container">
        <label className="file-input-label">
          Choose File
          <input type="file" accept=".dxf" onChange={handleFileChange} />
        </label>
      </div>
      <DXFViewer ref={viewerRef} width={800} height={600} />
      {dimensions && (
        <div className="dimensions">
          <h2>File Dimensions</h2>
          <p>Width: {dimensions.width} units</p>
          <p>Height: {dimensions.height} units</p>
        </div>
      )}
      {debugInfo && (
        <div className="debug-info">
          <h3>Debug Info</h3>
          <pre>{debugInfo}</pre>
        </div>
      )}
    </div>
  );
};

export default App;
