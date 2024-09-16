import React, { useState, useCallback, useMemo } from "react";
import DxfViewerComponent from "./dxf-viewer";
import "./App.css";
import * as THREE from "three";

const App: React.FC = () => {
  const [dxfUrl, setDxfUrl] = useState<string | null>(null);

  const handleFileChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const selectedFile = event.target.files?.[0];
      if (selectedFile) {
        const fileUrl = URL.createObjectURL(selectedFile);
        setDxfUrl(fileUrl);
      }
    },
    []
  );

  const options = useMemo(
    () => ({
      clearColor: new THREE.Color("#dddddd"), // Light gray background
      autoResize: true,
      colorCorrection: true,
      sceneOptions: {
        wireframeMesh: false,
        showEdges: true,
        boundingBox: true,
        debug: true,
      },
    }),
    []
  );

  const fonts = useMemo(() => [], []);

  return (
    <div className="App">
      <h1>DXF Viewer</h1>
      <div className="file-input-container">
        <label className="file-input-label">
          Choose File
          <input type="file" accept=".dxf" onChange={handleFileChange} />
        </label>
      </div>
      <div
        style={{ width: "100%", height: "600px", border: "1px solid white" }}
      >
        {dxfUrl && (
          <DxfViewerComponent
            dxfUrl={dxfUrl}
            options={options}
            fonts={fonts}
            width={800}
            height={600}
          />
        )}
      </div>
    </div>
  );
};

export default App;
